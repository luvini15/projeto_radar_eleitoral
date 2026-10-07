import os
from app.services.auto_sync import collection_slot, config
from app.models import SyncSchedule
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlmodel import Session

from app.database import get_session
from app.models import Campaign
from app.services.instagram_sync import (
    sync_campaign,
    sync_instagram_profile,
)

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
    username: str = Path(pattern=r"^[A-Za-z0-9._]{1,30}$"),
    limit: int = Query(default=25, ge=1, le=200, description="Máximo de posts por perfil"),
    session: Session = Depends(get_session),
):
    with collection_slot():
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

    with collection_slot():
        return sync_campaign(
            session=session,
            campaign_id=campaign_id,
            limit=limit,
        )


@router.get('/sync/status', summary='Status da coleta automática')
def sync_status(session: Session = Depends(get_session)):
    ids, hours, limit = config()
    return {
        'enabled': bool(ids) and bool(os.getenv('APIFY_TOKEN')),
        'interval_hours': hours,
        'posts_per_profile': limit,
        'campaigns': [
            {'campaign_id': campaign_id, 'schedule': session.get(SyncSchedule, campaign_id)}
            for campaign_id in ids
        ],
    }
