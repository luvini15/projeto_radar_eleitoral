from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    Campaign,
    CampaignProfile,
    InstagramProfile,
)


router = APIRouter(
    prefix="/api/campaigns",
    tags=["campaigns"],
)


class CampaignCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if "<" in value or ">" in value:
            raise ValueError("HTML nao permitido")
        return value


class ProfileCreate(BaseModel):
    username: str = Field(pattern=r"^@?[A-Za-z0-9._]{1,30}$")
    full_name: str | None = Field(default=None, max_length=120)
    role: str = Field(pattern=r"^(?i:CLIENT|REFERENCE|COMPETITOR|LOCAL_PAGE|MEDIA)$")

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if "<" in value or ">" in value:
            raise ValueError("HTML nao permitido")
        return value


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
            profiles.append({
                "id": profile.id,
                "username": profile.username,
                "full_name": profile.full_name,
                "role": link.role,
                "active": link.active,
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
        "REFERENCE",
        "COMPETITOR",
        "LOCAL_PAGE",
        "MEDIA",
    }

    if role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Role inválida.",
        )

    username = data.username.strip().lstrip("@")

    profile = session.exec(
        select(InstagramProfile).where(
            InstagramProfile.username
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
