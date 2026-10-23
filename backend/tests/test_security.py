import base64
import json
import os
import unittest
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from unittest.mock import patch

import httpx
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session
from starlette.requests import Request

os.environ.setdefault("DATABASE_URL", "sqlite://")
from app.security import authenticate, rate_limit, _hits
from app.main import _cors_origins, app
from app.database import engine
from app.models import AppUser, AuthSession


def token(user_id: str, aal: str) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({
        "sub": user_id, "aal": aal, "session_id": str(uuid4()),
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
    }).encode()).decode().rstrip("=")
    return f"header.{payload}.signature"


def request(method="GET", token_value=None, path="/api/campaigns"):
    headers = [] if token_value is None else [(b"authorization", f"Bearer {token_value}".encode())]
    return Request({"type": "http", "method": method, "path": path, "query_string": b"", "headers": headers, "scheme": "https", "server": ("test", 443)})


class SecurityTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        SQLModel.metadata.create_all(engine, tables=[AuthSession.__table__, AppUser.__table__])

    def test_api_requires_auth_but_health_is_public(self):
        client = TestClient(app)
        self.assertEqual(client.get("/health").status_code, 200)
        self.assertEqual(client.get("/api/me").status_code, 401)

    async def test_missing_token_fails_closed(self):
        with self.assertRaises(HTTPException) as error:
            await authenticate(request())
        self.assertEqual(error.exception.status_code, 401)

    async def test_optional_mfa_auto_provision_and_write_role(self):
        verified_factors = []

        class FakeClient:
            async def __aenter__(self): return self
            async def __aexit__(self, *args): return None
            async def get(self, url, **kwargs):
                return httpx.Response(200, json={
                    "id": "user-1",
                    "email": "user@example.com",
                    "factors": verified_factors,
                })

        env = {
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_ANON_KEY": "public-test-key",
            "ADMIN_USER_IDS": "",
            "ADMIN_EMAILS": "",
        }
        with patch.dict(os.environ, env), patch("app.security.httpx.AsyncClient", return_value=FakeClient()):
            self.assertEqual(await authenticate(request(token_value=token("user-1", "aal1"))), ("user-1", "analyst"))
            self.assertEqual(await authenticate(request(method="POST", path="/api/campaigns/1/assistant", token_value=token("user-1", "aal1"))), ("user-1", "analyst"))
            verified_factors.append({"id": "factor-1", "status": "verified"})
            with self.assertRaises(HTTPException) as error:
                await authenticate(request(token_value=token("user-1", "aal1")))
            self.assertEqual(error.exception.status_code, 403)
            self.assertEqual(await authenticate(request(token_value=token("user-1", "aal2"))), ("user-1", "analyst"))
            self.assertEqual(
                await authenticate(request(method="POST", token_value=token("user-1", "aal2"))),
                ("user-1", "analyst"),
            )
            with self.assertRaises(HTTPException) as error:
                await authenticate(request(method="POST", path="/api/admin/users", token_value=token("user-1", "aal2")))
            self.assertEqual(error.exception.status_code, 403)
            with patch.dict(os.environ, {"ADMIN_USER_IDS": "user-1"}):
                self.assertEqual(await authenticate(request(method="POST", path="/api/admin/users", token_value=token("user-1", "aal2"))), ("user-1", "admin"))

        with Session(engine) as session:
            provisioned = session.get(AppUser, "user-1")
            self.assertIsNotNone(provisioned)
            self.assertEqual(provisioned.email, "user@example.com")

    def test_thumbnail_rate_limit(self):
        _hits.clear()
        image_request = request(path="/api/campaigns/1/posts/1/thumbnail")
        for _ in range(60):
            rate_limit(image_request, "test-user")
        with self.assertRaises(HTTPException) as error:
            rate_limit(image_request, "test-user")
        self.assertEqual(error.exception.status_code, 429)
        _hits.clear()

    def test_cors_origins_are_sanitized_and_empty_config_uses_local_defaults(self):
        with patch("app.main.os.getenv", return_value=" 'https://app.example/' , \"https://admin.example/\"\x00\r"):
            self.assertEqual(_cors_origins(), ["https://app.example", "https://admin.example"])
        with patch("app.main.os.getenv", return_value=""):
            self.assertEqual(_cors_origins(), ["http://localhost:5173", "http://127.0.0.1:5173"])

    def test_server_enforces_session_idle_timeout(self):
        from app.security import enforce_session
        session_id = str(uuid4())
        now = datetime.now(timezone.utc)
        with Session(engine) as session:
            session.add(AuthSession(id=session_id, user_id="user-1", first_seen_at=now - timedelta(hours=1), last_seen_at=now - timedelta(minutes=31)))
            session.commit()
        with self.assertRaises(HTTPException) as error:
            enforce_session({"session_id": session_id, "exp": int((now + timedelta(hours=1)).timestamp())}, "user-1")
        self.assertEqual(error.exception.status_code, 401)
        with Session(engine) as session:
            self.assertTrue(session.get(AuthSession, session_id).expired)


if __name__ == "__main__":
    unittest.main()
