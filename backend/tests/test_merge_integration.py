"""Regression coverage for monitoring + Data Sight sharing the same API/database."""
import json
import os
import unittest
from contextlib import ExitStack
from datetime import datetime, timezone
from unittest.mock import patch

os.environ.setdefault("DATABASE_URL", "sqlite://")
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select
from app import main, scheduler
from app.database import get_session
from app.models import (Campaign, CampaignProfile, CollectionRun, InstagramPost,
                        InstagramProfile, PostCommentSample, PostSnapshot, ProfileSnapshot,
                        SyncSchedule)
from app.services.auto_sync import collection_lock, tick
from app.services.monitoring_sync import collect_campaign

RAW = {"id": "1", "shortCode": "merged", "ownerUsername": "profile", "ownerFullName": "Profile Name", "ownerId": "owner-1",
       "url": "https://www.instagram.com/p/merged/", "caption": "Hospital e saúde",
       "type": "Image", "timestamp": "2026-09-10T12:00:00Z", "likesCount": 10,
       "commentsCount": 2, "latestComments": [{"text": "Comentário coletado"}]}


class MergeIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)
        SQLModel.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add_all([Campaign(id=1, name="Test", slug="test"), InstagramProfile(id=1, username="profile")])
            session.commit()
            session.add(CampaignProfile(campaign_id=1, profile_id=1, role="CLIENT"))
            session.commit()
        self.stack.enter_context(patch.dict(os.environ, {"APP_ENV": "production", "COLLECTION_ENABLED": "true", "APIFY_TOKEN": "test-only", "AUTO_SYNC_CAMPAIGN_IDS": "1", "AUTO_SYNC_INTERVAL_HOURS": "6", "OPENROUTER_API_KEY": ""}))
        self.stack.enter_context(patch("app.services.monitoring_sync.collect_profile", return_value={"followersCount": 100}))
        self.stack.enter_context(patch("app.services.monitoring_sync.collect_posts", return_value=[RAW]))
        self.stack.enter_context(patch.object(main, "engine", self.engine))
        self.stack.enter_context(patch.object(main, "create_db_and_tables"))
        self.start = self.stack.enter_context(patch.object(main, "start_scheduler"))
        def session_override():
            with Session(self.engine) as session:
                yield session
        main.app.dependency_overrides[get_session] = session_override
        self.addCleanup(main.app.dependency_overrides.clear)
        self.client = self.stack.enter_context(TestClient(main.app))

    def test_lifespan_seeds_regions_and_starts_scheduler(self):
        self.assertEqual(len(self.client.get("/api/regions").json()["regions"]), 35)
        self.start.assert_called_once()

    def test_manual_sync_preserves_history_followers_comments_and_detail(self):
        for endpoint in ("sync", "collections"):
            response = self.client.post(f"/api/campaigns/1/{endpoint}")
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["status"], "SUCCESS")
            self.assertEqual(response.json()["profiles_synced"], 1)
        with Session(self.engine) as session:
            self.assertEqual(session.get(InstagramProfile, 1).full_name, "Profile Name")
            self.assertEqual(session.get(InstagramProfile, 1).instagram_id, "owner-1")
            self.assertEqual(len(session.exec(select(InstagramPost)).all()), 1)
            self.assertEqual(len(session.exec(select(PostSnapshot)).all()), 2)
            self.assertEqual(len(session.exec(select(ProfileSnapshot)).all()), 2)
            self.assertEqual(len(session.exec(select(CollectionRun)).all()), 2)
            self.assertEqual(json.loads(session.get(PostCommentSample, 1).texts_json), ["Comentário coletado"])
        detail = self.client.get("/api/campaigns/1/posts/1")
        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertIn("Comentário coletado", detail.text)
        self.assertEqual(self.client.post("/api/campaigns/1/posts/1/analysis").status_code, 503)

    def test_both_manual_routes_share_lock_and_missing_token_response(self):
        collection_lock.acquire()
        try:
            for endpoint in ("sync", "collections"):
                self.assertEqual(self.client.post(f"/api/campaigns/1/{endpoint}").status_code, 409)
        finally:
            collection_lock.release()
        with patch.dict(os.environ, {"APIFY_TOKEN": ""}):
            for endpoint in ("sync", "collections"):
                self.assertEqual(self.client.post(f"/api/campaigns/1/{endpoint}").status_code, 503)

    def test_auto_sync_records_monitoring_and_comment_samples(self):
        tick(self.engine, now=datetime.now(timezone.utc))
        with Session(self.engine) as session:
            run = session.exec(select(CollectionRun)).one()
            self.assertEqual((run.trigger, run.status), ("AUTO_SYNC", "SUCCESS"))
            self.assertIsNotNone(session.get(PostCommentSample, 1))
            self.assertEqual(session.get(SyncSchedule, 1).status, "success")
        history = self.client.get("/api/campaigns/1/collections").json()
        self.assertEqual(history["schedule"]["mode"], "interval")
        self.assertFalse(history["schedule"]["worker_alive"])
        self.assertIsNone(history["next_collection"])

    def test_auto_sync_does_not_report_partial_or_failed_runs_as_success(self):
        for result, expected in [("PARTIAL", "partial"), ("FAILED", "error")]:
            with self.subTest(result=result):
                with Session(self.engine) as session:
                    row = session.get(SyncSchedule, 1)
                    if row:
                        session.delete(row)
                        session.commit()
                tick(self.engine, collect=lambda **kw: {"status": result})
                with Session(self.engine) as session:
                    self.assertEqual(session.get(SyncSchedule, 1).status, expected)

    def test_profile_failure_rolls_back_comments_and_snapshots_together(self):
        with patch("app.services.monitoring_sync.collect_posts", return_value=[RAW, None]):
            with Session(self.engine) as session:
                result = collect_campaign(session, 1)
                self.assertEqual(result["status"], "FAILED")
                self.assertEqual(session.exec(select(PostCommentSample)).all(), [])
                self.assertEqual(session.exec(select(PostSnapshot)).all(), [])
                self.assertEqual(session.exec(select(InstagramPost)).all(), [])

    def test_daily_scheduler_uses_the_shared_scheduler(self):
        with patch.object(scheduler, "engine", self.engine), patch.object(scheduler, "tick") as tick_mock:
            scheduler.run_due_collections()
            tick_mock.assert_called_once_with(self.engine)

    def test_territorial_analytics_reports_and_redesign_routes_coexist(self):
        self.client.post("/api/campaigns/1/sync")
        period = "start_date=2026-09-01&end_date=2026-09-30"
        for path in ["/api/sync/status", "/api/campaigns/1/overview", "/api/campaigns/1/followers-history", "/api/profiles/1/followers-history", "/api/campaigns/1/collections", *[f"/api/campaigns/1/{name}?{period}" for name in ("analytics", "trends", "intelligence")]]:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200, response.text)
        response = self.client.post("/api/campaigns/1/reports", json={"start_date": "2026-09-01", "end_date": "2026-09-30", "report_type": "Diagnóstico Territorial"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get(response.json()["html_url"]).status_code, 200)


if __name__ == "__main__":
    unittest.main()
