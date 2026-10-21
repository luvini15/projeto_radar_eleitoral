from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.database import get_session
from app.models import Campaign, ListeningAlert, ListeningSource, WeeklyEvidenceReport, utc_now
from app.services.listening_repository import (
    ALLOWED_SOURCE_TYPES, alert_payload, generate_weekly_report, listening_payload,
    rebuild_alerts, region_payload, report_payload, source_payload,
    sync_active_sources, sync_source, validate_public_source_url,
)

router = APIRouter(prefix="/api", tags=["territorial-listening"])


class SourceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    source_type: Literal["WORDPRESS", "OUV_CSV"]
    url: str = Field(min_length=12, max_length=2000)
    scope_ra: str | None = Field(default=None, max_length=100)
    official: bool = False


class AlertStatus(BaseModel):
    status: Literal["NEW", "ACKNOWLEDGED", "RESOLVED"]


def require_campaign(session: Session, campaign_id: int) -> Campaign:
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada.")
    return campaign


@router.get("/listening/sources")
def list_sources(session: Session = Depends(get_session)):
    return [source_payload(source) for source in session.exec(select(ListeningSource).order_by(ListeningSource.id)).all()]


@router.post("/listening/sources")
def add_source(payload: SourceCreate, session: Session = Depends(get_session)):
    try:
        url = validate_public_source_url(payload.url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if session.exec(select(ListeningSource).where(ListeningSource.url == url)).first():
        raise HTTPException(status_code=409, detail="Esta URL já está cadastrada.")
    source = ListeningSource(name=payload.name.strip(), source_type=payload.source_type, url=url,
        scope_ra=payload.scope_ra.strip() if payload.scope_ra else None, official=payload.official)
    session.add(source); session.commit(); session.refresh(source)
    return source_payload(source)


@router.post("/listening/sources/{source_id}/toggle")
def toggle_source(source_id: int, session: Session = Depends(get_session)):
    source = session.get(ListeningSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Fonte não encontrada.")
    source.active = not source.active
    source.updated_at = utc_now()
    session.add(source); session.commit(); session.refresh(source)
    return source_payload(source)


@router.post("/listening/sources/{source_id}/sync")
def synchronize_source(source_id: int, limit: Annotated[int, Query(ge=5, le=500)] = 100,
    session: Session = Depends(get_session)):
    source = session.get(ListeningSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Fonte não encontrada.")
    result = sync_source(session, source, limit)
    if result["status"] == "error":
        raise HTTPException(status_code=502, detail=result["error"] or "A fonte não respondeu.")
    return result


@router.post("/listening/sync")
def synchronize_all(limit: Annotated[int, Query(ge=5, le=500)] = 100,
    session: Session = Depends(get_session)):
    results = sync_active_sources(session, limit)
    return {"sources": results, "successful": sum(row["status"] == "ok" for row in results)}


@router.get("/campaigns/{campaign_id}/listening")
def territorial_listening(campaign_id: int, max_items: Annotated[int, Query(ge=5, le=1000)] = 500,
    session: Session = Depends(get_session)):
    require_campaign(session, campaign_id)
    return listening_payload(session, max_items)


@router.get("/campaigns/{campaign_id}/listening/alerts")
def recurrence_alerts(campaign_id: int, window_days: Annotated[int, Query(ge=2, le=90)] = 14,
    session: Session = Depends(get_session)):
    require_campaign(session, campaign_id)
    alerts = rebuild_alerts(session, campaign_id, window_days)
    return {"window_days": window_days, "alerts": [alert_payload(alert) for alert in alerts]}


@router.post("/campaigns/{campaign_id}/listening/alerts/{alert_id}/status")
def update_alert_status(campaign_id: int, alert_id: int, payload: AlertStatus,
    session: Session = Depends(get_session)):
    require_campaign(session, campaign_id)
    alert = session.get(ListeningAlert, alert_id)
    if not alert or alert.campaign_id != campaign_id:
        raise HTTPException(status_code=404, detail="Alerta não encontrado.")
    alert.status = payload.status
    session.add(alert); session.commit(); session.refresh(alert)
    return alert_payload(alert)


@router.get("/campaigns/{campaign_id}/regions/{ra}")
def region_detail(campaign_id: int, ra: str, days: Annotated[int, Query(ge=7, le=365)] = 30,
    session: Session = Depends(get_session)):
    require_campaign(session, campaign_id)
    return region_payload(session, ra, days)


@router.post("/campaigns/{campaign_id}/weekly-report/generate")
def create_weekly_report(campaign_id: int, end_date: date | None = None,
    session: Session = Depends(get_session)):
    require_campaign(session, campaign_id)
    return report_payload(generate_weekly_report(session, campaign_id, end_date))


@router.get("/campaigns/{campaign_id}/weekly-report/latest")
def latest_weekly_report(campaign_id: int, session: Session = Depends(get_session)):
    require_campaign(session, campaign_id)
    report = session.exec(select(WeeklyEvidenceReport).where(
        WeeklyEvidenceReport.campaign_id == campaign_id,
    ).order_by(WeeklyEvidenceReport.generated_at.desc())).first()
    if not report:
        raise HTTPException(status_code=404, detail="Nenhum relatório semanal foi gerado.")
    return report_payload(report)
