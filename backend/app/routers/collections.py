from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import Campaign, CollectionRun, InstagramProfile, ProfileCollectionRun, ProfileSnapshot
from app.services.monitoring_sync import collect_campaign
from app.services.auto_sync import collection_slot, config
from app.models import SyncSchedule

router = APIRouter(prefix="/api", tags=["collections"])


def next_collection(now: datetime | None = None) -> datetime:
    from app.services.auto_sync import next_daily
    return next_daily(now)


@router.post("/campaigns/{campaign_id}/collections")
def run_collection(campaign_id: int, limit: int = Query(default=25, ge=1, le=100), session: Session = Depends(get_session)):
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(404, "Campanha não encontrada.")
    if not campaign.active:
        raise HTTPException(400, "Campanha inativa.")
    if not os.getenv("APIFY_TOKEN"):
        raise HTTPException(503, "Configure APIFY_TOKEN no backend/.env para executar a coleta.")
    with collection_slot(session, campaign_id):
        return collect_campaign(session, campaign_id, limit, "MANUAL")


@router.get("/campaigns/{campaign_id}/collections")
def collection_history(campaign_id: int, limit: int = Query(default=20, ge=1, le=100), session: Session = Depends(get_session)):
    rows = list(session.exec(select(CollectionRun).where(CollectionRun.campaign_id == campaign_id).order_by(CollectionRun.started_at.desc()).limit(limit)).all())
    from app.services.auto_sync import scheduler_status
    schedule = scheduler_status(session, campaign_id)
    return {"campaign_id": campaign_id, "next_collection": schedule["next_run_at"], "schedule": schedule, "collections": rows}



@router.get("/collections/{run_id}")
def collection_detail(run_id: int, session: Session = Depends(get_session)):
    run = session.get(CollectionRun, run_id)
    if not run:
        raise HTTPException(404, "Coleta não encontrada.")
    details = list(session.exec(select(ProfileCollectionRun).where(ProfileCollectionRun.collection_run_id == run_id).order_by(ProfileCollectionRun.id)).all())
    profiles = {p.id: p for p in session.exec(select(InstagramProfile).where(InstagramProfile.id.in_([d.profile_id for d in details]))).all()} if details else {}
    return {"collection": run, "profiles": [{**detail.model_dump(), "username": profiles.get(detail.profile_id).username if profiles.get(detail.profile_id) else None} for detail in details]}


@router.get("/profiles/{profile_id}/followers-history")
def profile_followers_history(profile_id: int, start_date: str | None = None, end_date: str | None = None, session: Session = Depends(get_session)):
    query = select(ProfileSnapshot).where(ProfileSnapshot.profile_id == profile_id)
    if start_date:
        query = query.where(ProfileSnapshot.collected_at >= datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc))
    if end_date:
        query = query.where(ProfileSnapshot.collected_at <= datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc))
    snapshots = list(session.exec(query.order_by(ProfileSnapshot.collected_at)).all())
    first = next((x.followers_count for x in snapshots if x.followers_count is not None), None)
    current = next((x.followers_count for x in reversed(snapshots) if x.followers_count is not None), None)
    absolute = current - first if current is not None and first is not None else None
    percent = round(absolute / first * 100, 2) if absolute is not None and first else None
    return {"profile_id": profile_id, "current_followers": current, "growth_absolute": absolute, "growth_percent": percent, "data_status": "INSUFFICIENT" if len(snapshots) < 2 else "SUFFICIENT", "history": snapshots}
