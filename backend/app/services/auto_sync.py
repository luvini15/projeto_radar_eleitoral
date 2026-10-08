"""One scheduler implementation for daily collections and legacy interval overrides."""
import logging
import os
from datetime import datetime, timedelta, timezone
from threading import Event, Thread
from zoneinfo import ZoneInfo
from fastapi import HTTPException
from sqlmodel import Session, select
from app.database import engine
from app.models import Campaign, CampaignProfile, SchedulerHeartbeat, SyncSchedule
from app.services.collection_lock import collection_slot, collection_lock, database_slot
from app.services.monitoring_sync import collect_campaign

logger = logging.getLogger(__name__)


def enabled():
    return os.getenv("COLLECTION_ENABLED", "true").lower() in {"1", "true", "yes"}


def config():
    ids = sorted({int(v.strip()) for v in os.getenv("AUTO_SYNC_CAMPAIGN_IDS", "").split(",") if v.strip()})
    return ids, max(1, int(os.getenv("AUTO_SYNC_INTERVAL_HOURS", "6"))), min(200, max(1, int(os.getenv("AUTO_SYNC_POST_LIMIT", "25"))))


def as_utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def next_daily(now=None):
    local = as_utc(now or datetime.now(timezone.utc)).astimezone(ZoneInfo(os.getenv("COLLECTION_TIMEZONE", "America/Sao_Paulo")))
    hour, minute = map(int, os.getenv("COLLECTION_DAILY_TIME", "03:00").split(":"))
    candidate = local.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if candidate <= local: candidate += timedelta(days=1)
    return candidate.astimezone(timezone.utc)


def scheduled_collection(**kwargs):
    kwargs.setdefault("trigger", "AUTO_SYNC")
    return collect_campaign(**kwargs)


def tick(db_engine=engine, collect=scheduled_collection, now=None):
    if collect is scheduled_collection and os.getenv("APP_ENV", "development") != "production": return
    if not enabled() or not os.getenv("APIFY_TOKEN"): return
    now = as_utc(now or datetime.now(timezone.utc))
    ids, hours, interval_limit = config()
    daily_limit = min(200, max(1, int(os.getenv("COLLECTION_POST_LIMIT", "25"))))
    with Session(db_engine) as session:
        campaigns = session.exec(select(Campaign).where(Campaign.active == True)).all()
        candidates = [c.id for c in campaigns if session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id == c.id, CampaignProfile.active == True)).first()]
    for campaign_id in candidates:
        with Session(db_engine) as session:
            try:
                with collection_slot(session, campaign_id):
                    schedule = session.get(SyncSchedule, campaign_id)
                    interval = campaign_id in ids
                    if schedule is None:
                        schedule = SyncSchedule(campaign_id=campaign_id, next_run_at=now if interval else next_daily(now))
                        session.add(schedule); session.commit()
                    if as_utc(schedule.next_run_at) > now: continue
                    if not interval and now-as_utc(schedule.next_run_at) > timedelta(minutes=5):
                        # A late restart must not launch a paid catch-up outside the daily window.
                        schedule.next_run_at = next_daily(now)
                        schedule.status = "waiting"
                        schedule.error = "Horário anterior perdido; aguardando a próxima janela diária."
                        session.add(schedule); session.commit()
                        continue
                    # Persist the next run before the paid call. A restart cannot repeat this attempt.
                    schedule.next_run_at = now + timedelta(hours=hours) if interval else next_daily(now)
                    schedule.last_started_at = now; schedule.last_finished_at = None
                    schedule.status = "running"; schedule.error = None
                    session.add(schedule); session.commit()
                    try:
                        result = collect(session=session, campaign_id=campaign_id, limit=interval_limit if interval else daily_limit, trigger="AUTO_SYNC" if interval else "SCHEDULED")
                        status = result.get("status", "SUCCESS") if isinstance(result, dict) else "SUCCESS"
                        schedule.status = {"SUCCESS": "success", "PARTIAL": "partial", "FAILED": "error"}.get(status, "error")
                        if schedule.status != "success": schedule.error = "Coleta incompleta. Consulte o histórico dos perfis."
                    except Exception as exc:
                        session.rollback(); schedule = session.get(SyncSchedule, campaign_id)
                        schedule.status = "error"
                        schedule.error = "A coleta falhou. A próxima tentativa respeitará o agendamento."
                        logger.warning("Scheduled collection failed for campaign %s (%s)", campaign_id, type(exc).__name__)
                    schedule.last_finished_at = datetime.now(timezone.utc)
                    session.add(schedule); session.commit()
            except HTTPException as exc:
                if exc.status_code != 409: raise


def scheduler_status(session, campaign_id):
    now = datetime.now(timezone.utc)
    heartbeat = session.get(SchedulerHeartbeat, 1)
    alive = bool(heartbeat and (now-as_utc(heartbeat.last_seen_at)).total_seconds() < 150)
    campaign = session.get(Campaign, campaign_id)
    has_profiles = session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id == campaign_id, CampaignProfile.active == True)).first() is not None
    active = bool(enabled() and os.getenv("APIFY_TOKEN") and alive and campaign and campaign.active and has_profiles)
    ids, hours, limit = config()
    row = session.get(SyncSchedule, campaign_id)
    interval = campaign_id in ids
    return {"enabled": active, "configured": enabled(), "worker_alive": alive, "mode": "interval" if interval else "daily", "time": os.getenv("COLLECTION_DAILY_TIME", "03:00"), "timezone": os.getenv("COLLECTION_TIMEZONE", "America/Sao_Paulo"), "interval_hours": hours if interval else None, "posts_per_profile": limit if interval else int(os.getenv("COLLECTION_POST_LIMIT", "25")), "next_run_at": row.next_run_at if active and row else next_daily(now) if active and not interval else None, "last_started_at": row.last_started_at if row else None, "last_finished_at": row.last_finished_at if row else None, "status": row.status if row else "waiting", "error": row.error if row else None}


def run_scheduler(stop, db_engine=engine):
    if os.getenv("APP_ENV", "development") != "production" or not enabled(): return
    while not stop.is_set():
        try:
            with database_slot(db_engine, "scheduler", "leader"):
                heartbeat_stop = Event()
                def pulse():
                    while not heartbeat_stop.is_set():
                        try:
                            with Session(db_engine) as session:
                                heartbeat = session.get(SchedulerHeartbeat, 1) or SchedulerHeartbeat()
                                heartbeat.last_seen_at = datetime.now(timezone.utc)
                                session.add(heartbeat); session.commit()
                        except Exception as exc:
                            logger.warning("Scheduler heartbeat failed (%s)", type(exc).__name__)
                        heartbeat_stop.wait(30)
                heartbeat_thread = Thread(target=pulse, name="scheduler-heartbeat", daemon=True)
                heartbeat_thread.start()
                try:
                    while not stop.is_set():
                        tick(db_engine)
                        stop.wait(30)
                finally:
                    heartbeat_stop.set()
                    heartbeat_thread.join(timeout=5)
        except HTTPException as exc:
            if exc.status_code != 409: raise
            stop.wait(30)
        except Exception as exc:
            logger.warning("Scheduler error (%s)", type(exc).__name__)
            stop.wait(30)


def start_scheduler():
    stop = Event()
    if os.getenv("APP_ENV", "development") != "production": return stop
    if os.getenv("COLLECTION_SCHEDULER_MODE", "embedded") != "embedded" or not enabled(): return stop
    Thread(target=run_scheduler, args=(stop,), name="collection-scheduler", daemon=True).start()
    return stop
