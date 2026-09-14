from contextlib import asynccontextmanager
from app.services.auto_sync import start_scheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db_and_tables
from app.routers.sync import router as sync_router
from app.routers.campaigns import router as campaigns_router
from app.routers.analytics import router as analytics_router


@asynccontextmanager
async def lifespan(app):
    create_db_and_tables()
    stop = start_scheduler()
    try:
        yield
    finally:
        stop.set()


app = FastAPI(
    lifespan=lifespan,
    title="Data Sight API",
    version="0.1.0",
    description=(
        "API do Radar Eleitoral. Os endpoints de sincronização coletam perfis e posts "
        "do Instagram pela Apify e persistem os resultados no banco. "
        "Configure APIFY_TOKEN no backend/.env antes de executar uma coleta. "
        "Executar a sincronização consome créditos da conta Apify."
    ),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(sync_router)
app.include_router(campaigns_router)
app.include_router(analytics_router)


@app.get("/")
def root():
    return {
        "service": "Data Sight API",
        "status": "online",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
    }
