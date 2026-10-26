"""Inclusive calendar dates in UTC; an exclusive upper bound avoids precision loss."""
from datetime import date, datetime, time, timedelta, timezone
from fastapi import HTTPException


def calendar_bounds(start, end):
    try:
        first, last = date.fromisoformat(start), date.fromisoformat(end)
        if first > last:
            raise ValueError()
        return (datetime.combine(first, time.min, timezone.utc),
                datetime.combine(last + timedelta(days=1), time.min, timezone.utc))
    except (ValueError, TypeError, OverflowError):
        raise HTTPException(422, "Informe um intervalo válido: data final igual ou posterior à inicial.") from None


def analysis_bounds(session, days=30):
    if session.info.get("period_start"):
        return calendar_bounds(session.info["period_start"], session.info["period_end"])
    days = session.info.get("analysis_days", days)
    today = datetime.now(timezone.utc).date()
    return calendar_bounds((today - timedelta(days=days-1)).isoformat(), today.isoformat())


def period_payload(session, days=30):
    start, end = analysis_bounds(session, days)
    return {"from": start.date().isoformat(), "to": (end-timedelta(days=1)).date().isoformat(),
            "days": (end-start).days, "timezone": "UTC"}
