import os
import unittest

os.environ.setdefault("DATABASE_URL", "sqlite://")

from fastapi import HTTPException
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select
from starlette.requests import Request

from app.models import Campaign, InstagramPost, InstagramProfile
from app.routers.campaigns import ProfileCreate, add_profile_to_campaign, list_campaigns
from app.security import enforce_resource_ownership
from app.services.monitoring_sync import upsert_post
from app.services.territorial_audit import audit_rows


def request(path: str, user_id: str = "user-a") -> Request:
    item = Request({"type": "http", "method": "GET", "path": path, "query_string": b"", "headers": []})
    item.state.user_id = user_id
    return item


class AccountIsolationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        SQLModel.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add_all([
                Campaign(id=1, owner_user_id="user-a", name="A", slug="same"),
                Campaign(id=2, owner_user_id="user-b", name="B", slug="same"),
                InstagramProfile(id=1, owner_user_id="user-a", username="same.profile"),
                InstagramProfile(id=2, owner_user_id="user-b", username="same.profile"),
            ])
            session.commit()

    def tearDown(self):
        self.engine.dispose()

    def test_campaign_listing_and_direct_access_are_tenant_scoped(self):
        with Session(self.engine) as session:
            rows = list_campaigns(request("/api/campaigns", "user-a"), session)
            self.assertEqual([item.id for item in rows], [1])

        enforce_resource_ownership(request("/api/campaigns/1"), "user-a", self.engine)
        with self.assertRaises(HTTPException) as denied:
            enforce_resource_ownership(request("/api/campaigns/2"), "user-a", self.engine)
        self.assertEqual(denied.exception.status_code, 404)

    def test_profiles_and_posts_are_physically_independent(self):
        item = {"shortcode": "shared-code", "url": "https://instagram.com/p/shared-code"}
        with Session(self.engine) as session:
            first, first_created = upsert_post(session, session.get(InstagramProfile, 1), item)
            second, second_created = upsert_post(session, session.get(InstagramProfile, 2), item)
            session.commit()
            self.assertTrue(first_created and second_created)
            self.assertNotEqual(first.id, second.id)
            self.assertEqual(len(session.exec(select(InstagramPost)).all()), 2)
            self.assertEqual(len(audit_rows(session, owner_user_id="user-a")), 1)
            self.assertEqual(len(audit_rows(session, owner_user_id="user-b")), 1)

        with self.assertRaises(HTTPException) as denied:
            enforce_resource_ownership(request("/api/profiles/2/followers-history"), "user-a", self.engine)
        self.assertEqual(denied.exception.status_code, 404)

    def test_adding_existing_profile_reuses_it_and_duplicate_link_is_conflict(self):
        with Session(self.engine) as session:
            data = ProfileCreate(username="@same.profile", role="COMPETITOR")

            result = add_profile_to_campaign(1, data, request("/api/campaigns/1/profiles"), session)

            self.assertEqual(result["profile_id"], 1)
            self.assertEqual(len(session.exec(select(InstagramProfile)).all()), 2)

            with self.assertRaises(HTTPException) as duplicate:
                add_profile_to_campaign(1, data, request("/api/campaigns/1/profiles"), session)

            self.assertEqual(duplicate.exception.status_code, 409)
            self.assertEqual(duplicate.exception.detail, "Perfil já vinculado a esta campanha.")


if __name__ == "__main__":
    unittest.main()
