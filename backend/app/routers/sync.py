from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.models import Campaign
from app.services.instagram_sync import (
    sync_instagram_profile,
)
from app.services.monitoring_sync import collect_campaign

router = APIRouter(
    prefix="/api",
    tags=["sync"],
)


@router.post("/sync/instagram/{username}")
def sync_instagram(
    username: str,
    limit: int = 25,
    session: Session = Depends(get_session),
):
    return sync_instagram_profile(
        session=session,
        username=username,
        limit=limit,
    )


@router.post("/campaigns/{campaign_id}/sync")
def sync_campaign_route(
    campaign_id: int,
    limit: int = 25,
    session: Session = Depends(get_session),
):
    campaign = session.get(
        Campaign,
        campaign_id,
    )

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campanha não encontrada",
        )

    if not campaign.active:
        raise HTTPException(
            status_code=400,
            detail="Campanha inativa",
        )

    return collect_campaign(
        session=session,
        campaign_id=campaign_id,
        limit=limit,
        trigger="MANUAL",
    )
