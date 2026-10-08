from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy import func
from app.services.profile_import import normalize_username

from app.database import get_session
from app.models import (
    Campaign,
    CampaignProfile,
    InstagramProfile,
    ProfileMonitoring, ProfileRegion, AdministrativeRegion,
)


router = APIRouter(
    prefix="/api/campaigns",
    tags=["campaigns"],
)


class CampaignCreate(BaseModel):
    name: str
    slug: str


class ProfileCreate(BaseModel):
    username: str
    full_name: str | None = None
    role: str


@router.post("")
def create_campaign(
    data: CampaignCreate,
    session: Session = Depends(get_session),
):
    existing = session.exec(
        select(Campaign).where(
            Campaign.slug == data.slug
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Já existe uma campanha com esse slug.",
        )

    campaign = Campaign(
        name=data.name,
        slug=data.slug,
    )

    session.add(campaign)
    session.commit()
    session.refresh(campaign)

    return campaign


@router.get("")
def list_campaigns(
    session: Session = Depends(get_session),
):
    return session.exec(
        select(Campaign)
        .order_by(Campaign.id)
    ).all()


@router.get("/{campaign_id}")
def get_campaign(
    campaign_id: int,
    session: Session = Depends(get_session),
):
    campaign = session.get(
        Campaign,
        campaign_id,
    )

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campanha não encontrada.",
        )

    links = session.exec(
        select(CampaignProfile).where(
            CampaignProfile.campaign_id
            == campaign_id
        )
    ).all()

    profiles = []

    for link in links:
        profile = session.get(
            InstagramProfile,
            link.profile_id,
        )

        if profile:
            metadata = session.get(ProfileMonitoring, profile.id)
            region = session.exec(select(ProfileRegion).where(ProfileRegion.profile_id == profile.id)).first()
            profiles.append({
                "id": profile.id,
                "username": profile.username,
                "full_name": profile.full_name,
                "role": link.role,
                "active": link.active,
                "profile_region_id": region.region_id if region else None,
                "profile_region": session.get(AdministrativeRegion, region.region_id).name if region else None,
                "monitoring": metadata.model_dump() if metadata else None,
            })

    return {
        "id": campaign.id,
        "name": campaign.name,
        "slug": campaign.slug,
        "active": campaign.active,
        "profiles": profiles,
    }


@router.post("/{campaign_id}/profiles")
def add_profile_to_campaign(
    campaign_id: int,
    data: ProfileCreate,
    session: Session = Depends(get_session),
):
    campaign = session.get(
        Campaign,
        campaign_id,
    )

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campanha não encontrada.",
        )

    role = data.role.upper()

    allowed_roles = {
        "CLIENT",
        "COMPETITOR",
        "LOCAL_PAGE",
        "MEDIA",
        "DF_GENERAL",
    }

    if role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Role inválida.",
        )

    try:
        username = normalize_username(data.username)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    profile = session.exec(
        select(InstagramProfile).where(
            func.lower(InstagramProfile.username)
            == username
        )
    ).first()

    if not profile:
        profile = InstagramProfile(
            username=username,
            full_name=data.full_name,
        )

        session.add(profile)
        session.commit()
        session.refresh(profile)

    if role == "DF_GENERAL" and session.exec(select(ProfileRegion).where(ProfileRegion.profile_id == profile.id)).first():
        raise HTTPException(409, "Este perfil já tem RA fixa. Revise a associação antes de classificá-lo como geral do DF.")

    existing_link = session.exec(
        select(CampaignProfile).where(
            CampaignProfile.campaign_id
            == campaign_id,
            CampaignProfile.profile_id
            == profile.id,
        )
    ).first()

    if existing_link:
        raise HTTPException(
            status_code=409,
            detail="Perfil já vinculado a esta campanha.",
        )

    link = CampaignProfile(
        campaign_id=campaign_id,
        profile_id=profile.id,
        role=role,
    )

    session.add(link)
    session.commit()
    session.refresh(link)

    return {
        "campaign_id": campaign_id,
        "profile_id": profile.id,
        "username": profile.username,
        "role": role,
    }