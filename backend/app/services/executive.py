"""Executive summaries use the same latest snapshots and definitions as existing analytics."""
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from sqlmodel import Session, select
from app.models import Campaign, CampaignSlate, CollectionRun, InstagramProfile, SlateMember
from app.routers.analytics import (campaign_posts, followers_history, _links,
                                  _sum_available, _avg, _local_dt)
from app.services.campaign_scope import slate_payloads


@contextmanager
def slate_scope(session, slate_id):
    previous = dict(session.info)
    session.info.pop("scope_profile_id", None)
    session.info["slate_id"] = slate_id
    try:
        yield
    finally:
        session.info.clear()
        session.info.update(previous)


def summarize_posts(posts):
    metrics = ["likes", "comments", "plays", "views", "observed_interactions"]
    result = {"posts": len(posts), "coverage": {}}
    for metric in metrics:
        values = [p["metrics"][metric] for p in posts if p["metrics"][metric] is not None]
        result[metric] = sum(values) if values else None
        result["avg_" + metric] = _avg(values)
        result["coverage"][metric] = len(values)
    return result


def executive_summary(session: Session, campaign_id: int, limit: int = 25, days: int = 30):
    days = session.info.get("analysis_days", days)
    from app.services.analysis_period import analysis_bounds, period_payload
    from app.services.follower_history import aggregate_history, growth_metrics
    start, end = analysis_bounds(session, days)
    limit = session.info.get("sample_limit", limit)
    previous_info = dict(session.info)
    try:
        session.info.update(period_start=start.date().isoformat(), period_end=(end-timedelta(days=1)).date().isoformat())
        payload = campaign_posts(campaign_id, limit, session=session)
    finally:
        session.info.clear()
        session.info.update(previous_info)
    posts = [p for p in payload["posts"] if p["content"]["published_at"] is not None
             and start <= _local_dt(p["content"]["published_at"]) < end]
    links = _links(session, campaign_id)
    members = {m.profile_id: m for m in session.exec(select(SlateMember).where(
        SlateMember.campaign_id == campaign_id)).all()}
    slates = {s["id"]: s for s in slate_payloads(session, campaign_id)}
    history = followers_history(campaign_id, days, session)
    follower_values = {p["profile_id"]: p["current_followers"] for p in history["profiles"]}
    follower_profiles = {p["profile_id"]: p for p in history["profiles"]}
    aggregated = aggregate_history(history["profiles"])
    audience = growth_metrics(aggregated)
    followers = []
    profiles = []
    collected = [p["metrics"]["collected_at"] for p in posts if p["metrics"]["collected_at"]]
    for link in links:
        profile = session.get(InstagramProfile, link.profile_id)
        observations = follower_profiles.get(link.profile_id, {}).get("history", [])
        value = follower_values.get(link.profile_id)
        followers.append(value)
        if observations:
            collected.append(observations[-1]["collected_at"])
        member = members.get(link.profile_id)
        profiles.append({"id": link.profile_id, "username": profile.username, "role": link.role,
            "position": member.position if member else None,
            "slate_id": member.slate_id if member else None, "followers": value,
            "follower_history": follower_profiles.get(link.profile_id, {}).get("history", []),
            **{key: follower_profiles.get(link.profile_id, {}).get(key) for key in ("growth_absolute", "growth_percent", "days_with_data")},
            **summarize_posts([p for p in posts if p["profile"]["id"] == link.profile_id])})
    themes, formats, daily, weekdays, hours = (defaultdict(list) for _ in range(5))
    for post in posts:
        local = _local_dt(post["content"]["published_at"])
        themes[post["content"]["theme"]].append(post)
        formats[post["content"]["format"]].append(post)
        published = post["content"]["published_at"]
        published_utc = published.replace(tzinfo=timezone.utc) if published.tzinfo is None else published.astimezone(timezone.utc)
        daily[published_utc.date().isoformat()].append(post)
        weekdays[local.weekday()].append(post)
        hours[(local.hour // 3) * 3].append(post)
        member = members.get(post["profile"]["id"])
        post["origin"] = {"campaign_id": campaign_id, "campaign": payload["campaign"]["name"],
            "slate_id": member.slate_id if member else None,
            "slate": slates.get(member.slate_id, {}).get("name") if member else None,
            "position": member.position if member else None}
    def group(rows, key):
        return [{key: name, **summarize_posts(values)} for name, values in rows.items()]
    theme_rows, format_rows = group(themes, "theme"), group(formats, "format")
    def best(rows, metric):
        valid = [row for row in rows if row.get(metric) is not None]
        return max(valid, key=lambda row: row[metric]) if valid else None
    leaders = {}
    for metric in ["observed_interactions", "comments", "plays"]:
        valid = [post for post in posts if post["metrics"][metric] is not None]
        leaders[metric] = max(valid, key=lambda post: post["metrics"][metric]) if valid else None
    days_rows = group(daily, "date")
    latest_run = session.exec(select(CollectionRun).where(CollectionRun.campaign_id == campaign_id)
                              .order_by(CollectionRun.started_at.desc())).first()
    from app.services.media_investment import media_context
    media = media_context(list(slates.values()), profiles, posts, period_payload(session, days), summarize_posts, aggregate_history, growth_metrics)
    return {"media_investment": media, "campaign": payload["campaign"], "slate": slates.get(session.info.get("slate_id")),
        "period": period_payload(session, days),
        "follower_history": aggregated,
        "sample": {"posts_per_profile": limit, "dated_posts_only": True},
        "summary": {**summarize_posts(posts), "followers": _sum_available(followers),
            "followers_profiles_with_data": sum(value is not None for value in followers),
            "profiles": len(links), **{key: audience[key] for key in ("growth_absolute", "growth_percent", "days_with_data")},
            "posts_per_day": round(len(posts) / (end-start).days, 3)},
        "last_collected_at": max((_local_dt(value) for value in collected), default=None),
        "collection": {"status": latest_run.status, "finished_at": latest_run.finished_at} if latest_run else None,
        "profiles": profiles, "themes": theme_rows, "formats": format_rows,
        "daily": sorted(days_rows, key=lambda row: row["date"]),
        "hours": group(hours, "hour"),
        "weekdays": group(weekdays, "weekday"),
        "insights": {"top_posts": leaders, "theme": best(theme_rows, "avg_observed_interactions"),
            "most_published_theme": best(theme_rows, "posts"),
            "format": best(format_rows, "avg_observed_interactions"),
            "weekday": best(group(weekdays, "weekday"), "avg_observed_interactions"),
            "hour": best(group(hours, "hour"), "avg_observed_interactions"),
            "profile": best(profiles, "avg_observed_interactions"),
            "peak": best(days_rows, "observed_interactions")},
        "data_status": "SUFFICIENT" if len(posts) >= 5 else "INSUFFICIENT" if posts else "NO_DATA",
        "methodology": ["Seguidores somam os perfis associados; não representam pessoas únicas.",
            "Médias usam somente posts com a métrica disponível, sem somar médias de perfis.",
            "Interações observadas mantêm a definição da coleta e podem ser parciais.",
            "Pico agrupa o último snapshot por data de publicação (UTC), não por dia de recebimento.",
            "Perfis não são agrupados por inferência: apenas vínculos configurados são considerados."]}


def slate_comparison(session, campaign_id, limit=25, days=30):
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        from fastapi import HTTPException
        raise HTTPException(404, "Campanha não encontrada.")
    result = []
    for slate in slate_payloads(session, campaign_id):
        with slate_scope(session, slate["id"]):
            report = executive_summary(session, campaign_id, limit, days)
            result.append({"slate": slate, "summary": report["summary"], "profiles": report["profiles"],
                "media_investment": report["media_investment"], "themes": report["themes"], "formats": report["formats"], "insights": report["insights"],
                "daily": report["daily"], "hours": report["hours"], "follower_history": report["follower_history"], "period": report["period"], "data_status": report["data_status"]})
    return {"campaign_id": campaign_id, "days": days, "posts_per_profile": limit, "slates": result}
