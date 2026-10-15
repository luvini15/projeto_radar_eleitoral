"""Authentication, authorization and request controls for the private API."""
import base64
import json
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from collections import defaultdict, deque
from threading import Lock
from urllib.parse import urlparse
from uuid import UUID

import httpx
from fastapi import HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.database import engine
from app.models import AppUser, AuthSession

logger = logging.getLogger("radar.security")
_hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_lock = Lock()


def _configured_origin() -> str:
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise RuntimeError("SUPABASE_URL deve ser uma URL HTTPS valida")
    return url


def _ids(name: str) -> set[str]:
    return {value.strip() for value in os.getenv(name, "").split(",") if value.strip()}


def _emails(name: str) -> set[str]:
    return {value.strip().lower() for value in os.getenv(name, "").split(",") if value.strip()}


def authorize_user(user_id: str, email: str | None) -> str:
    """Provision authenticated users and return their application role."""
    normalized_email = email.strip().lower() if isinstance(email, str) and email.strip() else None
    bootstrap_admin = user_id in _ids("ADMIN_USER_IDS") or (
        normalized_email is not None and normalized_email in _emails("ADMIN_EMAILS")
    )
    try:
        with Session(engine) as session:
            user = session.get(AppUser, user_id)
            if user is None:
                user = AppUser(
                    id=user_id,
                    email=normalized_email,
                    role="admin" if bootstrap_admin else "analyst",
                )
                session.add(user)
                try:
                    session.commit()
                except IntegrityError:
                    # Two simultaneous first requests may race to provision.
                    session.rollback()
                    user = session.get(AppUser, user_id)
            if user is None:
                raise RuntimeError("user provisioning failed")
            changed = False
            if normalized_email and user.email != normalized_email:
                user.email = normalized_email
                changed = True
            if bootstrap_admin and user.role != "admin":
                user.role = "admin"
                changed = True
            if changed:
                session.add(user)
                session.commit()
            if not user.active:
                logger.warning("access_denied_inactive user_id=%s", user_id)
                raise HTTPException(403, "Conta desativada")
            if user.role not in {"admin", "analyst"}:
                logger.error("invalid_app_role user_id=%s", user_id)
                raise HTTPException(403, "Permissao invalida")
            return user.role
    except HTTPException:
        raise
    except Exception:
        logger.exception("user_provisioning_unavailable user_id=%s", user_id)
        raise HTTPException(503, "Cadastro interno indisponivel") from None


def _claims(token: str) -> dict:
    try:
        payload = token.split(".")[1]
        claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if not isinstance(claims, dict):
            raise ValueError("invalid claims")
        return claims
    except (IndexError, ValueError, UnicodeDecodeError, TypeError):
        raise HTTPException(401, "Sessao invalida") from None


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def enforce_session(claims: dict, user_id: str) -> None:
    now = datetime.now(timezone.utc)
    try:
        session_id = str(UUID(claims["session_id"]))
        expires_at = int(claims["exp"])
    except (KeyError, ValueError, TypeError, AttributeError):
        raise HTTPException(401, "Sessao invalida") from None
    if expires_at <= now.timestamp():
        raise HTTPException(401, "Sessao expirada")
    idle = timedelta(minutes=max(1, int(os.getenv("SESSION_IDLE_MINUTES", "30"))))
    maximum = timedelta(hours=max(1, int(os.getenv("SESSION_MAX_HOURS", "12"))))
    try:
        with Session(engine) as session:
            row = session.get(AuthSession, session_id)
            if row is None:
                row = AuthSession(id=session_id, user_id=user_id, first_seen_at=now, last_seen_at=now)
                session.add(row)
                try:
                    session.commit()
                except IntegrityError:
                    session.rollback()
                    row = session.get(AuthSession, session_id)
            if row is None or row.user_id != user_id:
                raise HTTPException(401, "Sessao invalida")
            if row.expired or now - _utc(row.last_seen_at) > idle or now - _utc(row.first_seen_at) > maximum:
                row.expired = True
                session.add(row)
                session.commit()
                logger.warning("session_expired user_id=%s", user_id)
                raise HTTPException(401, "Sessao expirada")
            row.last_seen_at = now
            session.add(row)
            session.commit()
    except HTTPException:
        raise
    except Exception:
        logger.exception("session_store_unavailable")
        raise HTTPException(503, "Controle de sessao indisponivel") from None


async def authenticate(request: Request) -> tuple[str, str]:
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer ") or len(authorization) > 8199:
        raise HTTPException(401, "Autenticacao obrigatoria")
    token = authorization[7:]
    try:
        url = _configured_origin()
        key = os.environ["SUPABASE_ANON_KEY"]
        headers = {"apikey": key, "Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient(timeout=5, follow_redirects=False) as client:
            response = await client.get(f"{url}/auth/v1/user", headers=headers)
            if response.status_code != 200:
                logger.warning("invalid_token")
                raise HTTPException(401, "Sessao invalida")
            try:
                identity = response.json()
                user_id = identity["id"]
                email = identity.get("email")
                claims = _claims(token)
            except (ValueError, KeyError, TypeError):
                raise HTTPException(401, "Sessao invalida") from None
            if not isinstance(user_id, str) or claims.get("sub") != user_id:
                raise HTTPException(401, "Sessao invalida")

            # The authenticated user response already contains the account's
            # MFA factors. auth-js uses this same field in listFactors() and
            # getAuthenticatorAssuranceLevel().
            factors = identity.get("factors") or []
            if not isinstance(factors, list):
                logger.error("invalid_mfa_factors user_id=%s", user_id)
                raise HTTPException(503, "Verificacao de MFA indisponivel")
            has_verified_factor = any(
                isinstance(factor, dict) and factor.get("status") == "verified"
                for factor in factors
            )
            if claims.get("aal") != "aal2" and has_verified_factor:
                logger.warning("mfa_required user_id=%s", user_id)
                raise HTTPException(403, "MFA obrigatorio")
    except HTTPException:
        raise
    except (httpx.HTTPError, KeyError, RuntimeError, ValueError):
        logger.error("auth_provider_unavailable")
        raise HTTPException(503, "Servico de autenticacao indisponivel") from None
    role = authorize_user(user_id, email)
    analyst_safe_post = request.method == "POST" and request.url.path.endswith("/assistant")
    if request.method not in {"GET", "HEAD"} and not analyst_safe_post and role != "admin":
        logger.warning("write_denied user_id=%s path=%s", user_id, request.url.path)
        raise HTTPException(403, "Permissao insuficiente")
    enforce_session(claims, user_id)
    return user_id, role


def rate_limit(request: Request, user_id: str) -> None:
    path = request.url.path
    if path.endswith("/thumbnail"):
        bucket, ceiling = "thumbnail", 60
    elif request.method not in {"GET", "HEAD"}:
        bucket, ceiling = "write", 20
    else:
        bucket, ceiling = "read", 120
    now = time.monotonic()
    key = (user_id, bucket)
    with _lock:
        hits = _hits[key]
        while hits and hits[0] <= now - 60:
            hits.popleft()
        if len(hits) >= ceiling:
            logger.warning("rate_limited user_id=%s bucket=%s", user_id, bucket)
            raise HTTPException(429, "Limite de requisicoes excedido", headers={"Retry-After": "60"})
        hits.append(now)


def pre_auth_rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    key = (ip, "pre_auth")
    with _lock:
        hits = _hits[key]
        while hits and hits[0] <= now - 60:
            hits.popleft()
        if len(hits) >= 180:
            logger.warning("ip_rate_limited ip=%s", ip)
            raise HTTPException(429, "Limite de requisicoes excedido", headers={"Retry-After": "60"})
        hits.append(now)
