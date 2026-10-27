"""Request context propagation with disposable SQLite; real ownership checks stay enabled."""
import asyncio
import unittest
from unittest.mock import patch
from urllib.parse import urlencode
from fastapi import HTTPException, Request
from sqlmodel import Session, SQLModel, create_engine
from app.database import get_session
from app.models import Campaign, CampaignProfile, CampaignSlate, InstagramProfile, SlateMember
from app.security import authenticate, enforce_resource_ownership
from app.services.analysis_period import period_payload
from app.services.campaign_scope import campaign_links


def request(query=None, method="GET", path="/api/campaigns/1/executive"):
    return Request({"type": "http", "method": method, "path": path,
                    "query_string": urlencode(query or {}).encode(), "headers": [],
                    "scheme": "http", "server": ("test", 80)})


class RequestScopeTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        self.addCleanup(self.engine.dispose)
        SQLModel.metadata.create_all(self.engine)
        self.engine_patch = patch("app.database.engine", self.engine)
        self.engine_patch.start()
        self.addCleanup(self.engine_patch.stop)

    def context(self, req):
        dependency = get_session(req)
        self.addCleanup(dependency.close)
        return next(dependency)

    def test_scope_and_custom_period_reach_existing_consumers(self):
        with Session(self.engine) as db:
            db.add(Campaign(id=1, name="Campaign", slug="campaign", owner_user_id="user-a"))
            db.add_all([InstagramProfile(id=i, username=f"profile_{i}", owner_user_id="user-a") for i in [1, 2]])
            db.commit()
            db.add_all([CampaignProfile(campaign_id=1, profile_id=i, role="CLIENT") for i in [1, 2]])
            db.add(CampaignSlate(id=1, campaign_id=1, name="Slate"))
            db.commit()
            db.add(SlateMember(campaign_id=1, slate_id=1, profile_id=1, position="CANDIDATE"))
            db.commit()
        req = request(dict(slate_id=1, scope_profile_id=1, analysis_days=15, sample_limit=50,
                           period_start="2026-10-09", period_end="2026-10-23"))
        enforce_resource_ownership(req, "user-a", self.engine)
        db = self.context(req)
        self.assertEqual([link.profile_id for link in campaign_links(db, 1)], [1])
        self.assertEqual(db.info["sample_limit"], 50)
        self.assertEqual(period_payload(db)["days"], 15)
        self.assertEqual(period_payload(db)["from"], "2026-10-09")
        self.assertEqual(period_payload(db)["to"], "2026-10-23")

    def test_invalid_context_is_rejected(self):
        for query in [dict(slate_id="bad"), dict(scope_profile_id=0), dict(analysis_days=366),
                      dict(sample_limit=201), dict(period_start="2026-10-01"),
                      dict(period_start="2026-02-30", period_end="2026-03-01"),
                      dict(period_start="2026-10-23", period_end="2026-10-09")]:
            with self.subTest(query=query), self.assertRaises(HTTPException) as error:
                self.context(request(query))
            self.assertEqual(error.exception.status_code, 422)

    def test_configuration_collectors_and_writes_do_not_inherit_scope(self):
        query = dict(slate_id=1, scope_profile_id=2, period_start="bad", sample_limit=50)
        for method, path, params in [("GET", "/api/campaigns/1", {**query, "full_campaign": "1"}),
                                     ("POST", "/api/campaigns/1/digital-reports", query),
                                     ("PUT", "/api/campaigns/1/profiles/2", query),
                                     ("GET", "/api/campaigns/1/slates", query),
                                     ("POST", "/api/campaigns/1/sync", query)]:
            with self.subTest(method=method, path=path):
                self.assertEqual(self.context(request(params, method, path)).info, {})

    def test_default_context_and_next_request_remain_unfiltered(self):
        self.assertEqual(self.context(request(dict(slate_id=1))).info, {"slate_id": 1})
        self.assertEqual(self.context(request()).info, {})
        self.assertEqual(period_payload(self.context(request(dict(analysis_days=15))))["days"], 15)

    def test_query_cannot_override_campaign_ownership(self):
        with Session(self.engine) as db:
            db.add(Campaign(id=1, name="Private", slug="private", owner_user_id="user-b"))
            db.commit()
        for query in [dict(slate_id=1), dict(full_campaign=1), dict(user_id="user-b")]:
            with self.subTest(query=query), self.assertRaises(HTTPException) as error:
                enforce_resource_ownership(request(query), "user-a", self.engine)
            self.assertEqual(error.exception.status_code, 404)

    def test_query_never_substitutes_for_authentication(self):
        with self.assertRaises(HTTPException) as error:
            asyncio.run(authenticate(request(dict(slate_id=1, full_campaign=1))))
        self.assertEqual(error.exception.status_code, 401)
