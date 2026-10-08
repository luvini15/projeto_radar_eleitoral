"""Read-only audit of persisted decisions. Never infers or changes territorial labels."""
from collections import Counter, defaultdict
from datetime import datetime, timezone
from sqlmodel import Session, select
from app.models import (AdministrativeRegion, CampaignProfile, InstagramPost, InstagramProfile,
                        PostRegion, PostSnapshot, PostTheme, Theme)
from app.services.taxonomy import normalize_text

CONFIDENCE_ORDER = {"HIGH": 3, "MEDIUM": 2, "LOW": 1, None: 0}
NO_EVIDENCE = "Sem evidência territorial suficiente"


def low_reason(source, evidence, caption):
    if source == "NONE": return NO_EVIDENCE
    if source == "PROFILE": return "Associação territorial do perfil; não há evidência territorial individual suficiente no conteúdo."
    text = normalize_text(evidence or "")
    full = normalize_text(caption or "")
    if "santa maria" in text and "local:" in text:
        return "Nome potencialmente homônimo. O prefixo Local: não integra os contextos geográficos aceitos pela regra atual; a RA permaneceu nula."
    if "jardim botanico" in text:
        return "Nome potencialmente homônimo sem prefixo geográfico aceito pela regra. A hashtag compacta #JardimBotânico não é um alias cadastrado; a RA permaneceu nula." if "#jardimbotanico" in full else "Nome potencialmente homônimo sem contexto geográfico reconhecido pela regra; a RA permaneceu nula."
    if "vasco da" in text or "cruzeiro" in text and any(word in full for word in ("futebol", "venceu", "campeonato", "torcida")):
        return "Possível referência esportiva homônima à RA; atribuição territorial não confirmada."
    if "lago paranoa" in text: return "O Lago Paranoá não identifica, sozinho, a RA Paranoá."
    if "planaltina" in text and any(word in full for word in ("planaltina-go", "planaltina go", "planaltina/go")):
        return "Possível referência a Planaltina de Goiás, fora do DF."
    return "Menção fraca ou ambígua pela regra conservadora. Motivo específico não foi persistido; revisar a legenda e a evidência, sem alterar automaticamente a decisão."


def audit_rows(session: Session, *, region_id=None, confidence=None, profile_id=None, theme=None,
               start_date=None, end_date=None, has_region=None, multiple_regions=None, campaign_id=None):
    query = select(InstagramPost)
    if profile_id is not None: query = query.where(InstagramPost.profile_id == profile_id)
    if campaign_id is not None:
        profile_ids = session.exec(select(CampaignProfile.profile_id).where(CampaignProfile.campaign_id == campaign_id)).all()
        query = query.where(InstagramPost.profile_id.in_(profile_ids))
    if start_date is not None: query = query.where(InstagramPost.published_at >= start_date)
    if end_date is not None: query = query.where(InstagramPost.published_at < end_date)
    posts = session.exec(query).all()
    ids = [p.id for p in posts]
    if not ids: return []
    profiles = {p.id:p for p in session.exec(select(InstagramProfile).where(InstagramProfile.id.in_({p.profile_id for p in posts}))).all()}
    regions = {r.id:r.name for r in session.exec(select(AdministrativeRegion)).all()}
    themes = {t.id:t.name for t in session.exec(select(Theme)).all()}
    assignments = {a.post_id:themes.get(a.theme_id) for a in session.exec(select(PostTheme).where(PostTheme.post_id.in_(ids))).all()}
    territories = defaultdict(list)
    for row in session.exec(select(PostRegion).where(PostRegion.post_id.in_(ids)).order_by(PostRegion.id)).all():
        territories[row.post_id].append(row)
    # Latest observation wins; missing metrics stay null and zero remains zero.
    snapshots = {s.post_id:s for s in session.exec(select(PostSnapshot).where(PostSnapshot.post_id.in_(ids)).order_by(PostSnapshot.collected_at,PostSnapshot.id)).all()}
    result = []
    for post in posts:
        post_theme = assignments.get(post.id)
        if theme and (post_theme or "").casefold() != theme.casefold(): continue
        stored = territories[post.id]
        region_count = len({t.region_id for t in stored if t.region_id is not None})
        if has_region is not None and bool(region_count) != has_region: continue
        if multiple_regions is not None and (region_count > 1) != multiple_regions: continue
        all_territories = [{"region_id":t.region_id,"region_name":regions.get(t.region_id),"detection_source":t.source,
                            "confidence":t.confidence if t.source != "NONE" else None,"stored_confidence":t.confidence,
                            "evidence":t.evidence} for t in stored]
        if not all_territories:
            all_territories = [{"region_id":None,"region_name":None,"detection_source":"NONE","confidence":None,"stored_confidence":None,"evidence":None}]
        snap = snapshots.get(post.id)
        for territory in all_territories:
            if region_id is not None and territory["region_id"] != region_id: continue
            if confidence and territory["confidence"] != confidence: continue
            source_text = post.location_name if territory["detection_source"] == "LOCATION" else post.caption
            evidence = territory["evidence"]
            result.append({"post_id":post.id,"shortcode":post.shortcode,"profile_id":post.profile_id,
                           "username":profiles[post.profile_id].username,"caption":post.caption,"location_name":post.location_name,
                           "published_at":post.published_at,"url":post.url,**territory,"theme":post_theme,
                           "interactions":snap.interactions_count if snap else None,"likes":snap.likes_count if snap else None,
                           "comments":snap.comments_count if snap else None,"views":snap.views_count if snap else None,
                           "plays":snap.plays_count if snap else None,"snapshot_at":snap.collected_at if snap else None,
                           "region_count":region_count,"territories":all_territories,
                           "status_message":NO_EVIDENCE if not region_count else None,
                           "low_confidence_reason":low_reason(territory["detection_source"],evidence,post.caption) if territory["confidence"] == "LOW" else None,
                           "reason_origin":"AUDIT_EXPLANATION" if territory["confidence"] == "LOW" else None,
                           "evidence_is_literal":bool(evidence and evidence in (source_text or "")) if territory["detection_source"] not in {"NONE","PROFILE"} else None})
    def order(row):
        published = row["published_at"]
        stamp = published.replace(tzinfo=timezone.utc).timestamp() if published and published.tzinfo is None else published.timestamp() if published else float("-inf")
        return (CONFIDENCE_ORDER[row["confidence"]], stamp, row["post_id"], row["region_id"] or 0)
    return sorted(result,key=order,reverse=True)


def audit_summary(rows):
    posts = {r["post_id"]:r for r in rows}
    confidence = {key:len({r["post_id"] for r in rows if r["confidence"] == key}) for key in ("HIGH","MEDIUM","LOW")}
    regions = Counter((r["region_id"],r["region_name"]) for r in rows if r["region_id"] is not None)
    sources = Counter(r["detection_source"] for r in rows)
    return {"total_posts":len(posts),"posts_with_region":sum(r["region_count"] > 0 for r in posts.values()),
            "posts_without_region":sum(r["region_count"] == 0 for r in posts.values()),"posts_by_confidence":confidence,
            "assignments_by_confidence":{key:sum(r["confidence"] == key for r in rows) for key in confidence},
            "posts_multiple_regions":sum(r["region_count"] > 1 for r in posts.values()),
            "regions":[{"region_id":rid,"region_name":name,"posts":count} for (rid,name),count in sorted(regions.items(),key=lambda item:item[0][1])],
            "detection_sources":dict(sorted(sources.items())),
            "posts_by_detection_source":{source:len({r["post_id"] for r in rows if r["detection_source"] == source}) for source in sorted(sources)},"total_rows":len(rows),
            "high_evidence_not_literal":len([r for r in rows if r["confidence"] == "HIGH" and r["evidence_is_literal"] is False]),
            "methodology":"Uma linha por associação/candidato. Contagens de posts são distintas; NONE não conta como LOW. Filtros por RA/confiança selecionam linhas; territories sempre mostra todas as decisões persistidas do post. Métricas usam o último snapshot, sem somar coletas."}
