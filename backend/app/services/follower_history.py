"""Daily comparable observations. Real collection wins over manual on the same UTC date."""
from datetime import timezone
from sqlmodel import select
from app.models import ProfileSnapshot

MANUAL_SOURCE = "MANUAL_HISTORICAL"


def daily_observations(session, profile_ids, start, end):
    if not profile_ids:
        return {}
    snapshots = session.exec(select(ProfileSnapshot).where(
        ProfileSnapshot.profile_id.in_(profile_ids), ProfileSnapshot.collected_at >= start,
        ProfileSnapshot.collected_at < end).order_by(ProfileSnapshot.collected_at, ProfileSnapshot.id)).all()
    daily = {}
    for snapshot in snapshots:
        instant = snapshot.collected_at
        instant = instant.replace(tzinfo=timezone.utc) if instant.tzinfo is None else instant.astimezone(timezone.utc)
        key = (snapshot.profile_id, instant.date().isoformat())
        previous = daily.get(key)
        # An unavailable real count does not erase an observed manual count.
        priority = (snapshot.followers_count is not None, snapshot.source != MANUAL_SOURCE, instant, snapshot.id)
        if previous is None or priority > previous[0]:
            daily[key] = (priority, {"date": key[1], "followers": snapshot.followers_count,
                "collected_at": instant, "source": snapshot.source,
                "source_label": "Histórico manual" if snapshot.source == MANUAL_SOURCE else "Coleta real"})
    grouped = {}
    for (pid, day), (_, point) in sorted(daily.items()):
        grouped.setdefault(pid, []).append(point)
    return grouped


def aggregate_history(profiles):
    if not profiles:
        return []
    by_profile = [{p["date"]: p for p in profile["history"] if p["followers"] is not None} for profile in profiles]
    common = set.intersection(*(set(points) for points in by_profile))
    return [{"date": day, "followers": sum(points[day]["followers"] for points in by_profile),
        "sources": sorted({points[day]["source"] for points in by_profile}),
        "source_label": "Histórico manual" if all(points[day]["source"] == MANUAL_SOURCE for points in by_profile)
            else "Coleta real" if all(points[day]["source"] != MANUAL_SOURCE for points in by_profile) else "Origens mistas identificadas"}
        for day in sorted(common)]


def growth_metrics(history):
    points = [p for p in history if p["followers"] is not None]
    growth = points[-1]["followers"] - points[0]["followers"] if len(points) >= 2 else None
    return {"followers": points[-1]["followers"] if points else None,
        "growth_absolute": growth,
        "growth_percent": round(growth / points[0]["followers"] * 100, 2) if growth is not None and points[0]["followers"] else None,
        "days_with_data": len(points)}
