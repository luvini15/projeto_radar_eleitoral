"""Scheduler de processo separado. Execute com: python -m app.scheduler"""
from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlmodel import Session, select

from app.database import create_db_and_tables, engine
from app.models import Campaign
from app.routers.territorial import seed_reference_data
from app.services.monitoring_sync import collect_campaign
from app.services.auto_sync import config


def run_due_collections() -> None:
    limit = int(os.getenv("COLLECTION_POST_LIMIT", "25"))
    with Session(engine) as session:
        campaigns = list(session.exec(select(Campaign).where(Campaign.active == True)).all())  # noqa: E712
        interval_campaigns, _, _ = config()
        for campaign in campaigns:
            if campaign.id in interval_campaigns:
                continue
            try:
                collect_campaign(session, campaign.id, limit, "SCHEDULED")
            except Exception as exc:
                print(f"collection campaign={campaign.id} failed: {type(exc).__name__}", flush=True)


def main() -> None:
    create_db_and_tables()
    with Session(engine) as session:
        seed_reference_data(session)
    daily_time = os.getenv("COLLECTION_DAILY_TIME", "03:00")
    scheduler_timezone = ZoneInfo(os.getenv("COLLECTION_TIMEZONE", "America/Sao_Paulo"))
    while True:
        now = datetime.now(timezone.utc).astimezone(scheduler_timezone)
        if now.strftime("%H:%M") == daily_time:
            run_due_collections()
            time.sleep(61)
        time.sleep(20)


if __name__ == "__main__":
    main()
