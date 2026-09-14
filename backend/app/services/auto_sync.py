"""Single-process scheduler; run this local backend with one Uvicorn worker."""
import logging
import os
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from threading import Event, Lock, Thread

from fastapi import HTTPException
from sqlmodel import Session, select
from app.database import engine
from app.models import Campaign, CampaignProfile, SyncSchedule
from app.services.instagram_sync import sync_campaign

logger = logging.getLogger(__name__)
collection_lock = Lock()

@contextmanager
def collection_slot():
    if not collection_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail='Uma coleta já está em andamento. Aguarde sua conclusão.')
    try:
        yield
    finally:
        collection_lock.release()


def config():
    ids = sorted({int(value.strip()) for value in os.getenv('AUTO_SYNC_CAMPAIGN_IDS', '').split(',') if value.strip()})
    hours = max(1, int(os.getenv('AUTO_SYNC_INTERVAL_HOURS', '6')))
    limit = min(200, max(1, int(os.getenv('AUTO_SYNC_POST_LIMIT', '25'))))
    return ids, hours, limit


def as_utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def tick(db_engine=engine, collect=sync_campaign, now=None):
    ids, hours, limit = config()
    if not ids or not os.getenv('APIFY_TOKEN'):
        return
    now = now or datetime.now(timezone.utc)
    for campaign_id in ids:
        with Session(db_engine) as session:
            campaign = session.get(Campaign, campaign_id)
            active_profile = session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id == campaign_id, CampaignProfile.active == True)).first()
            if not campaign or not campaign.active or not active_profile:
                continue
            schedule = session.get(SyncSchedule, campaign_id)
            if schedule and as_utc(schedule.next_run_at) > now:
                continue
            if not collection_lock.acquire(blocking=False):
                return
            try:
                # Persist before calling the paid service: restarting never repeats an attempted run immediately.
                if schedule is None:
                    schedule = SyncSchedule(campaign_id=campaign_id, next_run_at=now)
                schedule.next_run_at = now + timedelta(hours=hours)
                schedule.last_started_at = now
                schedule.last_finished_at = None
                schedule.status = 'running'
                schedule.error = None
                session.add(schedule)
                session.commit()
                try:
                    collect(session=session, campaign_id=campaign_id, limit=limit)
                    schedule.status = 'success'
                except Exception as exc:
                    session.rollback()
                    schedule = session.get(SyncSchedule, campaign_id)
                    schedule.status = 'error'
                    # Do not serialize provider exceptions: they may contain secrets or request payloads.
                    schedule.error = 'A coleta falhou. Verifique o token, os créditos e o perfil. A próxima tentativa respeitará o intervalo.'
                    logger.warning('Scheduled collection failed for campaign %s (%s)', campaign_id, type(exc).__name__)
                schedule.last_finished_at = datetime.now(timezone.utc)
                session.add(schedule)
                session.commit()
            finally:
                collection_lock.release()


def start_scheduler():
    stop = Event()
    def loop():
        while not stop.wait(60):
            try:
                tick()
            except Exception as exc:
                logger.warning('Scheduler error (%s)', type(exc).__name__)
    thread = Thread(target=loop, name='apify-scheduler', daemon=True)
    thread.start()
    return stop
