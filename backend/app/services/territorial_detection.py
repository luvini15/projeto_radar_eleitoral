"""Conservative, explainable textual classification using the existing RA and theme catalogs."""
from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from sqlmodel import Session, select
from app.models import (AdministrativeRegion, CampaignProfile, InstagramPost, InstagramProfile,
                        PostRegion, PostTheme, ProfileMonitoring, ProfileRegion, Theme)
from app.services.taxonomy import classify_theme, normalize_text, theme_names

CONFIG = json.loads((Path(__file__).parents[1] / "config/territorial_aliases.json").read_text(encoding="utf-8"))
ORIGINS = {"CONTENT": {"EXPLICIT_RA", "LOCALITY"}, "LOCATION": {"LOCATION"}, "PROFILE": {"PROFILE"}}


def folded(text):
    chars, positions = [], []
    for i, char in enumerate(text):
        for c in unicodedata.normalize("NFKD", char):
            if not unicodedata.combining(c):
                chars.append(c.lower()); positions.append(i)
    return "".join(chars), positions


def detect_regions(caption, location_name, regions):
    """Return actual evidence spans, preferring caption over geotag for the same RA."""
    catalog = {r.name: r.id for r in regions}
    names = [(name, name, "EXPLICIT_RA", "HIGH") for name in catalog]
    names += [(alias, name, "EXPLICIT_RA", "HIGH") for name, aliases in CONFIG["aliases"].items() if name in catalog for alias in aliases]
    names += [(alias, name, "LOCALITY", "MEDIUM") for alias, name in CONFIG["localities"].items() if name in catalog]
    found, ambiguous = {}, []
    for original, is_location in ((caption or "", False), (location_name or "", True)):
        text, positions = folded(original)
        occupied = []
        for alias, region, source, confidence in sorted(names, key=lambda x: len(x[0]), reverse=True):
            pattern = r"(?<![\w@])" + re.escape(folded(alias)[0]).replace(r"\ ", r"\s+") + r"(?!\w)"
            # Exact geographic tags/mentions; never infer a RA from arbitrary usernames.
            tagged = r"(?<![\w@])[#@]" + r"_?".join(re.escape(part) for part in folded(alias)[0].split()) + r"(?!\w)"
            for match in re.finditer(tagged + "|" + pattern, text):
                a, b = match.span()
                if any(a < y and b > x for x, y in occupied):
                    continue
                occupied.append((a, b))
                before, after = text[max(0, a-35):a], text[b:b+35]
                weak = (region == "Planaltina" and bool(re.match(r"\s*(?:[-/,]\s*)?(?:goias|go)(?!\w)", after)))
                weak |= (region == "Paranoá" and bool(re.search(r"lago\s*$", before)))
                weak |= (region == "Gama" and bool(re.search(r"vasco\s+da\s*$", before)))
                # A named square/church/school is not evidence of the homonymous RA.
                weak |= bool(re.search(r"(?:praca|igreja|paroquia|escola|colegio|estadio|hospital|avenida|rua)\s+$", before))
                if region in {"Gama", "Cruzeiro", "Santa Maria", "Jardim Botânico"} and not is_location:
                    geographic = bool(re.search(r"(?:em|no|na|do|da|moradores de|regiao de|cidade de|bairro de|ra)\s*$", before) or re.match(r"\s*[-/,]\s*df\b", after))
                    weak |= not geographic
                    weak |= region == "Cruzeiro" and bool(re.search(r"(?:futebol|venceu|derrota|campeonato|torcida)", before+after))
                start = positions[a]; end = positions[b-1]+1
                # Include nearby context, always copied verbatim from the input.
                context_start = max(original.rfind(".", 0, start)+1, original.rfind("\n", 0, start)+1, start-45)
                evidence = original[context_start:end].strip()
                item = {"region_id": None if weak else catalog[region], "source": "LOCATION" if is_location else source,
                        "confidence": "LOW" if weak else confidence, "evidence": evidence}
                if weak:
                    ambiguous.append(item)
                elif catalog[region] not in found:
                    found[catalog[region]] = item
    return list(found.values()) or ambiguous[:1]


def is_general(session, profile_id):
    metadata = session.get(ProfileMonitoring, profile_id)
    return bool(metadata and metadata.scope == "DF_GENERAL") or session.exec(select(CampaignProfile).where(CampaignProfile.profile_id == profile_id, CampaignProfile.role == "DF_GENERAL")).first() is not None


def profile_fallback(session, post):
    if is_general(session, post.profile_id):
        return []
    link = session.exec(select(ProfileRegion).where(ProfileRegion.profile_id == post.profile_id)).first()
    if not link:
        return []
    region = session.get(AdministrativeRegion, link.region_id)
    return [{"region_id": link.region_id, "source": "PROFILE", "confidence": "LOW", "evidence": f"Associação explícita do perfil à RA {region.name}"}]


def classify_post(session: Session, post: InstagramPost):
    regions = session.exec(select(AdministrativeRegion).where(AdministrativeRegion.active == True)).all()
    items = detect_regions(post.caption, post.location_name, regions)
    if not items:
        items = profile_fallback(session, post)
    if not items:
        items = [{"region_id": None, "source": "NONE", "confidence": "LOW", "evidence": None}]
    existing = {r.region_id: r for r in session.exec(select(PostRegion).where(PostRegion.post_id == post.id)).all()}
    keep = set()
    for item in items:
        rid = item["region_id"]
        row = existing.get(rid) or PostRegion(post_id=post.id, **item)
        for key, value in item.items():
            setattr(row, key, value)
        session.add(row); keep.add(rid)
    for rid, row in existing.items():
        if rid not in keep:
            session.delete(row)
    name, confidence = classify_theme(post.caption)
    theme = session.exec(select(Theme).where(Theme.name == name)).first()
    if theme is None:
        theme = Theme(name=name); session.add(theme); session.flush()
    assignment = session.exec(select(PostTheme).where(PostTheme.post_id == post.id)).first()
    if assignment is None:
        assignment = PostTheme(post_id=post.id, theme_id=theme.id, source="RULES", confidence=confidence)
        session.add(assignment)
    elif not assignment.reviewed and assignment.source == "RULES":
        assignment.theme_id = theme.id; assignment.confidence = confidence; session.add(assignment)
    session.flush()
    return items


def territories_for_posts(session, posts):
    ids = [p.id for p in posts]
    names = {r.id: r.name for r in session.exec(select(AdministrativeRegion)).all()}
    grouped = defaultdict(list)
    if ids:
        for row in session.exec(select(PostRegion).where(PostRegion.post_id.in_(ids))).all():
            grouped[row.post_id].append({"region_id": row.region_id, "region": names.get(row.region_id), "source": row.source, "confidence": row.confidence, "evidence": row.evidence})
    fallback_posts = [p for p in posts if p.id not in grouped or all(item["source"] in {"PROFILE", "NONE"} for item in grouped[p.id])]
    profile_ids = {p.profile_id for p in fallback_posts}
    if profile_ids:
        general = set(session.exec(select(ProfileMonitoring.profile_id).where(ProfileMonitoring.profile_id.in_(profile_ids), ProfileMonitoring.scope == "DF_GENERAL")).all())
        general.update(session.exec(select(CampaignProfile.profile_id).where(CampaignProfile.profile_id.in_(profile_ids), CampaignProfile.role == "DF_GENERAL")).all())
        assignments = {link.profile_id: link.region_id for link in session.exec(select(ProfileRegion).where(ProfileRegion.profile_id.in_(profile_ids))).all()}
        for post in fallback_posts:
            rid = assignments.get(post.profile_id)
            if post.profile_id not in general and rid is not None:
                grouped[post.id] = [{"region_id": rid, "region": names.get(rid), "source": "PROFILE", "confidence": "LOW", "evidence": f"Associação explícita do perfil à RA {names.get(rid)}"}]
            elif post.id in grouped:
                grouped[post.id] = [item for item in grouped[post.id] if item["source"] == "NONE"]
    return dict(grouped)


def matching_territories(items, region_id=None, origin=None):
    sources = ORIGINS.get(origin)
    return [item for item in items if item["region_id"] is not None and (region_id is None or item["region_id"] == region_id) and (sources is None or item["source"] in sources)]


def classify_existing(session, campaign_id=None):
    query = select(InstagramPost).order_by(InstagramPost.id)
    if campaign_id is not None:
        ids = session.exec(select(CampaignProfile.profile_id).where(CampaignProfile.campaign_id == campaign_id)).all()
        query = query.where(InstagramPost.profile_id.in_(ids))
    posts = list(session.exec(query).all())
    result = {"posts_processed": len(posts), "posts_with_region": 0, "posts_without_region": 0, "regions": Counter(), "confidence": Counter({"HIGH": 0, "MEDIUM": 0, "LOW": 0}), "themes": Counter(), "sources": Counter(), "examples": []}
    regions = {r.id: r.name for r in session.exec(select(AdministrativeRegion)).all()}
    for post in posts:
        items = classify_post(session, post)
        assigned = [x for x in items if x["region_id"] is not None]
        result["posts_with_region" if assigned else "posts_without_region"] += 1
        assignment = session.exec(select(PostTheme).where(PostTheme.post_id == post.id)).one()
        theme = session.get(Theme, assignment.theme_id).name
        result["themes"][theme] += 1
        for item in items:
            result["sources"][item["source"]] += 1
            if item["source"] != "NONE": result["confidence"][item["confidence"]] += 1
            if item["region_id"] is not None: result["regions"][regions[item["region_id"]]] += 1
        if assigned and len(result["examples"]) < 12:
            result["examples"].append({"post_id": post.id, "profile": session.get(InstagramProfile, post.profile_id).username, "caption": post.caption, "url": post.url, "theme": theme, "territories": [{**x, "region": regions[x["region_id"]]} for x in assigned]})
    session.commit()
    return result
