import os
from app.services.auto_sync import collection_slot, config
from app.models import SyncSchedule, CampaignProfile, InstagramProfile
from contextlib import ExitStack
from sqlalchemy import func
from sqlmodel import select
from app.services.auto_sync import scheduler_status
from fastapi import APIRouter, Depends, HTTPException, Query
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


@router.post(
    "/sync/instagram/{username}",
    summary="Coletar perfil e posts do Instagram pela Apify",
    description="Executa os Actors instagram-profile-scraper e instagram-post-scraper e salva os dados. Consome créditos Apify. Informe o username sem @.",
    responses={503: {"description": "Token Apify não configurado"}},
)
def sync_instagram(
    username: str,
    limit: int = Query(default=25, ge=1, le=200, description="Máximo de posts por perfil"),
    session: Session = Depends(get_session),
):
    profile = session.exec(select(InstagramProfile).where(func.lower(InstagramProfile.username) == username.strip().lstrip("@").lower())).first()
    campaign_ids = sorted(set(session.exec(select(CampaignProfile.campaign_id).where(CampaignProfile.profile_id == profile.id)).all())) if profile else []
    with ExitStack() as stack:
        for campaign_id in campaign_ids or ["profile:" + username.lower()]:
            stack.enter_context(collection_slot(session, campaign_id))
        return sync_instagram_profile(
            session=session,
            username=username,
            limit=limit,
        )


@router.post("/campaigns/{campaign_id}/sync", summary="Sincronizar os perfis de uma campanha pela Apify")
def sync_campaign_route(
    campaign_id: int,
    limit: int = Query(default=25, ge=1, le=200, description="Máximo de posts por perfil"),
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

    if not os.getenv("APIFY_TOKEN"):
        raise HTTPException(503, "Configure APIFY_TOKEN no backend/.env para executar a coleta.")
    with collection_slot(session, campaign_id):
        return collect_campaign(
            session=session,
            campaign_id=campaign_id,
            limit=limit,
            trigger="MANUAL",
        )


@router.get('/sync/status', summary='Status da coleta automática')
def sync_status(session: Session = Depends(get_session)):
    ids, hours, limit = config()
    campaigns = session.exec(select(Campaign).where(Campaign.active == True)).all()
    items = [{"campaign_id": campaign.id, "schedule": scheduler_status(session, campaign.id)} for campaign in campaigns]
    return {"enabled": any(item["schedule"]["enabled"] for item in items), "interval_hours": hours, "posts_per_profile": limit, "campaigns": items}
