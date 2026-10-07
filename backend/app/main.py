import logging
import os
from contextlib import asynccontextmanager
from app.services.auto_sync import start_scheduler
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.security import authenticate, pre_auth_rate_limit, rate_limit
from app.database import engine
from app.routers.sync import router as sync_router
from app.routers.campaigns import router as campaigns_router
from app.routers.analytics import router as analytics_router
from app.routers.ai import router as ai_router


@asynccontextmanager
async def lifespan(app):
    stop = start_scheduler()
    try:
        yield
    finally:
        stop.set()


app = FastAPI(
    lifespan=lifespan,
    docs_url=None if os.getenv("ENVIRONMENT") == "production" else "/docs",
    redoc_url=None if os.getenv("ENVIRONMENT") == "production" else "/redoc",
    openapi_url=None if os.getenv("ENVIRONMENT") == "production" else "/openapi.json",
    title="Data Sight API",
    version="0.1.0",
    description=(
        "API do Radar Eleitoral. Os endpoints de sincronização coletam perfis e posts "
        "do Instagram pela Apify e persistem os resultados no banco. "
        "Configure APIFY_TOKEN no backend/.env antes de executar uma coleta. "
        "Executar a sincronização consome créditos da conta Apify."
    ),
)

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/") or request.url.path == "/api":
        try:
            content_length = request.headers.get("content-length")
            if content_length and (not content_length.isdigit() or int(content_length) > 64 * 1024):
                raise HTTPException(413, "Corpo da requisicao muito grande")
            pre_auth_rate_limit(request)
            user_id, role = await authenticate(request)
            request.state.user_id = user_id
            request.state.role = role
            rate_limit(request, user_id)
        except HTTPException as exc:
            return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=exc.headers)
    response = await call_next(request)
    if request.url.path.startswith("/api") and request.method not in {"GET", "HEAD"}:
        logging.getLogger("radar.security").info(
            "write_request user_id=%s method=%s path=%s status=%s",
            request.state.user_id, request.method, request.url.path, response.status_code,
        )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store" if request.url.path.startswith("/api") else "no-cache"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


app.include_router(sync_router)
app.include_router(campaigns_router)
app.include_router(analytics_router)
app.include_router(ai_router)


@app.get("/")
def root():
    return {
        "service": "Data Sight API",
        "status": "online",
    }


@app.get("/health")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse({"status": "unavailable"}, status_code=503)
    return {
        "status": "ok",
    }


@app.get("/api/me")
def current_user(request: Request):
    return {"id": request.state.user_id, "role": request.state.role}
