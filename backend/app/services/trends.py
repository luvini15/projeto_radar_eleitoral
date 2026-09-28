from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.models import CampaignProfile, InstagramPost, InstagramProfile, PostSnapshot, PostTheme, ProfileRegion, Theme
from app.services.taxonomy import classify_theme
from app.services.territorial_detection import territories_for_posts, matching_territories


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _growth(current: int, previous: int) -> float | None:
    if previous == 0:
        return None
    return round((current - previous) / previous, 4)


def build_trends(session: Session, campaign_id: int, start: datetime, end: datetime, region_id: int | None = None, theme_filter: str | None = None, profile_ids: list[int] | None = None, format_filter: str | None = None, territorial_origin: str | None = None, include_all_evidence: bool = False) -> dict:
    start, end = _aware(start), _aware(end)
    duration = end - start
    previous_start, previous_end = start - duration, start

    links = list(session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id == campaign_id, CampaignProfile.active == True)).all())  # noqa: E712
    selected_profile_ids = set(profile_ids or [])
    profile_ids = {link.profile_id for link in links}
    if selected_profile_ids:
        profile_ids &= selected_profile_ids

    posts = list(session.exec(select(InstagramPost).where(InstagramPost.profile_id.in_(profile_ids), InstagramPost.published_at >= previous_start, InstagramPost.published_at <= end)).all()) if profile_ids else []
    post_ids = [post.id for post in posts if post.id is not None]
    snapshots = list(session.exec(select(PostSnapshot).where(PostSnapshot.post_id.in_(post_ids)).order_by(PostSnapshot.collected_at.asc())).all()) if post_ids else []
    latest_snapshot = {snapshot.post_id: snapshot for snapshot in snapshots}
    profiles = {profile.id: profile for profile in session.exec(select(InstagramProfile).where(InstagramProfile.id.in_(profile_ids))).all()} if profile_ids else {}
    themes = {theme.id: theme.name for theme in session.exec(select(Theme)).all() if theme.id is not None}
    assigned = {item.post_id: themes.get(item.theme_id) for item in session.exec(select(PostTheme).where(PostTheme.post_id.in_(post_ids))).all()} if post_ids else {}

    territories = territories_for_posts(session, posts)
    territorial_buckets = defaultdict(lambda: {"current": [], "previous": []})
    buckets: dict[str, dict] = defaultdict(lambda: {"current": [], "previous": []})
    for post in posts:
        matches = matching_territories(territories.get(post.id, []), region_id, territorial_origin)
        if (region_id is not None or territorial_origin) and not matches:
            continue
        theme = assigned.get(post.id) or classify_theme(post.caption)[0]
        if theme_filter and theme.casefold() != theme_filter.casefold():
            continue
        content_format = "Carrossel" if post.content_type == "Sidecar" else "Reels" if post.content_type == "Video" or post.product_type == "clips" else "Imagem" if post.content_type == "Image" else post.content_type or "Outro"
        if format_filter and content_format.casefold() != format_filter.casefold():
            continue
        period = "current" if post.published_at and _aware(post.published_at) >= start else "previous"
        snapshot = latest_snapshot.get(post.id)
        buckets[theme][period].append((post, snapshot))
        for territory in matches:
            territorial_buckets[(territory["region_id"], territory["region"], theme)][period].append((post, snapshot))

    current_total = sum(len(v["current"]) for v in buckets.values()) or 1
    max_interactions = max((sum((s.interactions_count or 0) for _, s in v["current"] if s) for v in buckets.values()), default=0) or 1
    max_days = max((len({p.published_at.date() for p, _ in v["current"] if p.published_at}) for v in buckets.values()), default=0) or 1
    rows = []
    for theme, periods in buckets.items():
        current, previous = periods["current"], periods["previous"]
        volume, previous_volume = len(current), len(previous)
        observed = [s.interactions_count for _, s in current if s and s.interactions_count is not None]
        interactions = sum(observed) if observed else None
        average = round(interactions / len(observed), 2) if observed else None
        growth = _growth(volume, previous_volume)
        recurrence_days = len({p.published_at.date() for p, _ in current if p.published_at})
        growth_component = 0.5 if growth is None else (max(-1.0, min(1.0, growth)) + 1) / 2
        score = round(100 * (0.30 * volume / current_total + 0.25 * growth_component + 0.25 * (interactions or 0) / max_interactions + 0.20 * recurrence_days / max_days), 1)
        evidence = []
        ranked = sorted(current, key=lambda item: (item[1].interactions_count if item[1] and item[1].interactions_count is not None else -1), reverse=True)
        if not include_all_evidence: ranked = ranked[:3]
        for post, snapshot in ranked:
            profile = profiles.get(post.profile_id)
            evidence.append({"post_id": post.id, "date": post.published_at, "profile": profile.username if profile else None, "summary": (post.caption or "Sem legenda")[:220], "url": post.url, "interactions": snapshot.interactions_count if snapshot else None, "likes": snapshot.likes_count if snapshot else None, "comments": snapshot.comments_count if snapshot else None, "format": "Carrossel" if post.content_type == "Sidecar" else "Reels" if post.content_type == "Video" or post.product_type == "clips" else "Imagem" if post.content_type == "Image" else post.content_type or "Outro", "territories": territories.get(post.id, [])})
        rows.append({"theme": theme, "volume": volume, "previous_volume": previous_volume, "growth": growth, "direction": "sem_base" if growth is None else "alta" if growth > .05 else "queda" if growth < -.05 else "estável", "interactions": interactions, "interactions_posts": len(observed), "average_interactions": average, "recurrence_days": recurrence_days, "relevance": score, "emerging": previous_volume == 0 and volume >= 2, "evidence": evidence})
    territorial_rows = []
    for (rid, region_name, theme_name), periods in territorial_buckets.items():
        current, previous = periods["current"], periods["previous"]
        current_ids = {p.id for p, _ in current}
        theme_row = next((r for r in rows if r["theme"] == theme_name), None)
        observed = [snap.interactions_count for _, snap in current if snap and snap.interactions_count is not None]
        territorial_rows.append({"region_id": rid, "region": region_name, "theme": theme_name, "volume": len(current), "previous_volume": len(previous), "growth": _growth(len(current), len(previous)), "interactions": sum(observed) if observed else None, "interactions_posts": len(observed), "profiles": sorted({profiles[p.profile_id].username for p, _ in current}), "formats": sorted({"Carrossel" if p.content_type == "Sidecar" else "Reels" if p.content_type == "Video" or p.product_type == "clips" else "Imagem" if p.content_type == "Image" else p.content_type or "Outro" for p, _ in current}), "sources": sorted({t["source"] for p, _ in current for t in territories.get(p.id, []) if t["region_id"] == rid}), "evidence": [e for e in (theme_row["evidence"] if theme_row else []) if e["post_id"] in current_ids]})
    territorial_rows.sort(key=lambda r: (-r["volume"], r["region"], r["theme"]))
    rows.sort(key=lambda row: (row["relevance"], row["volume"]), reverse=True)
    return {"period": {"start": start, "end": end}, "comparison_period": {"start": previous_start, "end": previous_end}, "filters": {"region_id": region_id, "theme": theme_filter, "profile_ids": sorted(profile_ids), "format": format_filter, "territorial_origin": territorial_origin}, "data_status": "NO_DATA" if not any(r["volume"] for r in rows) else "INSUFFICIENT" if sum(r["volume"] for r in rows) < 5 else "SUFFICIENT", "methodology": {"growth": "(volume atual - volume anterior) / volume anterior; sem percentual quando o anterior é zero", "small_base_threshold": 5, "score": "30% participação no volume + 25% crescimento limitado + 25% participação nas interações + 20% recorrência em dias"}, "trends": rows, "territorial_trends": territorial_rows}
