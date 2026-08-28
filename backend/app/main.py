from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db_and_tables
from app.routers.sync import router as sync_router
from app.routers.campaigns import router as campaigns_router
from app.routers.analytics import router as analytics_router


app = FastAPI(
    title="Data Sight API",
    version="0.1.0",
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


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


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
