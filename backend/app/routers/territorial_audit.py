from datetime import date, datetime, time, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session
from app.database import get_session
from app.models import Campaign
from app.services.territorial_audit import audit_rows, audit_summary

router = APIRouter(prefix="/api/territorial/audit", tags=["territorial audit"])


def filtered_rows(request: Request, region_id: int | None = None, confidence: Literal["HIGH","MEDIUM","LOW"] | None = None,
                  profile_id: int | None = None, theme: str | None = None, start_date: date | None = None,
                  end_date: date | None = None, has_region: bool | None = None, multiple_regions: bool | None = None,
                  campaign_id: int | None = None, session: Session = Depends(get_session)):
    if start_date and end_date and start_date > end_date: raise HTTPException(400,"Data inicial posterior à data final.")
    if end_date == date.max: raise HTTPException(400,"Data final fora do intervalo suportado.")
    if campaign_id is not None and not session.get(Campaign,campaign_id): raise HTTPException(404,"Campanha não encontrada.")
    start = datetime.combine(start_date,time.min,tzinfo=timezone.utc) if start_date else None
    end = datetime.combine(end_date+timedelta(days=1),time.min,tzinfo=timezone.utc) if end_date else None
    return audit_rows(session,region_id=region_id,confidence=confidence,profile_id=profile_id,theme=theme,
                      start_date=start,end_date=end,has_region=has_region,multiple_regions=multiple_regions,
                      campaign_id=campaign_id,owner_user_id=getattr(request.state, "user_id", None))


@router.get("")
def audit(offset: int = Query(0,ge=0), limit: int = Query(50,ge=1,le=500), rows: list = Depends(filtered_rows)):
    return {"total":len(rows),"offset":offset,"limit":limit,"summary":audit_summary(rows),"items":rows[offset:offset+limit]}


@router.get("/summary")
def summary(rows: list = Depends(filtered_rows)):
    return audit_summary(rows)
