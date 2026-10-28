from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session, select
from sqlalchemy import delete, func
from sqlalchemy.exc import IntegrityError
from typing import Literal
from app.services import campaign_admin as admin
from app.services.profile_import import normalize_username

from app.database import get_session
from app.models import (
    Campaign, CampaignSlate, SlateMember,
    CampaignProfile,
    InstagramProfile,
    ProfileMonitoring, ProfileRegion, AdministrativeRegion,
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
        if len(value) < 2 or "<" in value or ">" in value:
            raise ValueError("Informe um nome válido com pelo menos dois caracteres.")
        return value


class ProfileCreate(BaseModel):
    username: str = Field(pattern=r"^@?[A-Za-z0-9._]{1,30}$")
    full_name: str | None = Field(default=None, max_length=120)
    role: str = Field(pattern=r"^(?i:CLIENT|COMPETITOR|LOCAL_PAGE|MEDIA|DF_GENERAL)$")

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
    request: Request,
    session: Session = Depends(get_session),
):
    existing = session.exec(
        select(Campaign).where(
            Campaign.owner_user_id == request.state.user_id,
            Campaign.slug == data.slug,
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Já existe uma campanha com esse slug.",
        )

    campaign = Campaign(
        owner_user_id=request.state.user_id,
        name=data.name,
        slug=data.slug,
    )

    session.add(campaign)
    session.commit()
    session.refresh(campaign)

    return campaign


@router.get("")
def list_campaigns(
    request: Request,
    session: Session = Depends(get_session),
):
    from app.services.campaign_scope import slate_payloads

    campaigns = session.exec(
        select(Campaign)
        .where(Campaign.owner_user_id == request.state.user_id)
        .order_by(Campaign.id)
    ).all()

    return [
        {
            **campaign.model_dump(),
            "slates": slate_payloads(session, campaign.id),
        }
        for campaign in campaigns
    ]


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

    from app.services.campaign_scope import campaign_links, slate_payloads
    allowed = ({link.profile_id for link in campaign_links(session, campaign_id)}
               if session.info.get("slate_id") is not None or session.info.get("scope_profile_id") is not None
               else {link.profile_id for link in links})
    members = {member.profile_id:member for member in session.exec(select(SlateMember).where(SlateMember.campaign_id==campaign_id)).all()}
    profile_records = list(session.exec(select(InstagramProfile).where(InstagramProfile.id.in_([link.profile_id for link in links]))).all()) if links else []
    editing = admin.editability(session,profile_records)
    profiles = []

    for link in links:
        profile = session.get(
            InstagramProfile,
            link.profile_id,
        )

        if profile and profile.id in allowed:
            metadata = session.get(ProfileMonitoring, profile.id)
            region = session.exec(select(ProfileRegion).where(ProfileRegion.profile_id == profile.id)).first()
            profiles.append({
                "id": profile.id,
                "instagram_id": profile.instagram_id,
                **editing[profile.id],
                "slate_id": members[profile.id].slate_id if profile.id in members else None,
                "position": members[profile.id].position if profile.id in members else None,
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
        "slates": slate_payloads(session, campaign_id),
    }


@router.post("/{campaign_id}/profiles")
def add_profile_to_campaign(
    campaign_id: int,
    data: ProfileCreate,
    request: Request,
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
            InstagramProfile.owner_user_id == request.state.user_id,
            func.lower(InstagramProfile.username)
            == username
        )
    ).first()

    if not profile:
        try:
            with session.begin_nested():
                profile = InstagramProfile(
                    owner_user_id=request.state.user_id,
                    username=username,
                    full_name=data.full_name,
                )
                session.add(profile)
                session.flush()
        except IntegrityError:
            profile = session.exec(
                select(InstagramProfile).where(
                    InstagramProfile.owner_user_id == request.state.user_id,
                    func.lower(InstagramProfile.username) == username,
                )
            ).first()
            if not profile:
                raise HTTPException(
                    status_code=409,
                    detail="Não foi possível cadastrar este perfil. Tente novamente.",
                )

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

    try:
        session.add(link)
        session.commit()
    except IntegrityError:
        session.rollback()
        existing_link = session.exec(
            select(CampaignProfile).where(
                CampaignProfile.campaign_id == campaign_id,
                CampaignProfile.profile_id == profile.id,
            )
        ).first()
        if existing_link:
            raise HTTPException(
                status_code=409,
                detail="Perfil já vinculado a esta campanha.",
            )
        raise HTTPException(
            status_code=409,
            detail="Não foi possível vincular este perfil à campanha. Tente novamente.",
        )
    session.refresh(link)

    return {
        "campaign_id": campaign_id,
        "profile_id": profile.id,
        "username": profile.username,
        "role": role,
    }


class SlateInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()
        if len(value) < 2 or "<" in value or ">" in value:
            raise ValueError("Informe um nome válido.")
        return value


class MemberInput(BaseModel):
    profile_id: int = Field(gt=0)
    position: str = Field(pattern="^(CANDIDATE|VICE|ASSOCIATE)$")


@router.post("/{campaign_id}/slates")
def create_slate(campaign_id: int, data: SlateInput, session: Session = Depends(get_session)):
    admin.locked_campaign(session,campaign_id)
    if not session.get(Campaign, campaign_id):
        raise HTTPException(404, "Campanha não encontrada.")
    existing = session.exec(select(CampaignSlate).where(CampaignSlate.campaign_id == campaign_id,
                                                       CampaignSlate.name == data.name)).first()
    if existing:
        raise HTTPException(409, "Já existe uma chapa com este nome.")
    slate = CampaignSlate(campaign_id=campaign_id, name=data.name)
    session.add(slate)
    admin.commit(session)
    session.refresh(slate)
    return slate


@router.put("/{campaign_id}/slates/{slate_id}")
def rename_slate(campaign_id: int, slate_id: int, data: SlateInput, session: Session = Depends(get_session)):
    admin.locked_campaign(session,campaign_id)
    slate = session.get(CampaignSlate, slate_id)
    if not slate or slate.campaign_id != campaign_id:
        raise HTTPException(404, "Chapa não encontrada.")
    duplicate = session.exec(select(CampaignSlate).where(CampaignSlate.campaign_id == campaign_id,
        CampaignSlate.name == data.name, CampaignSlate.id != slate_id)).first()
    if duplicate:
        raise HTTPException(409, "Já existe uma chapa com este nome.")
    slate.name = data.name
    session.add(slate)
    admin.commit(session)
    session.refresh(slate)
    return slate


@router.put("/{campaign_id}/slates/{slate_id}/members")
def assign_slate_member(campaign_id: int, slate_id: int, data: MemberInput, session: Session = Depends(get_session)):
    try:
        admin.locked_campaign(session,campaign_id)
        member=admin.set_membership(session,campaign_id,data.profile_id,slate_id,data.position)
        admin.commit(session)
        session.refresh(member)
        return member
    except HTTPException:
        session.rollback()
        raise



@router.delete("/{campaign_id}/slates/{slate_id}/members/{profile_id}")
def remove_slate_member(campaign_id: int, slate_id: int, profile_id: int, session: Session = Depends(get_session)):
    admin.locked_campaign(session,campaign_id)
    member = session.exec(select(SlateMember).where(SlateMember.campaign_id == campaign_id,
        SlateMember.slate_id == slate_id, SlateMember.profile_id == profile_id)).first()
    if not member:
        raise HTTPException(404, "Vínculo não encontrado.")
    session.delete(member)
    session.commit()
    return {"removed": True}


class ProfileUpdate(BaseModel):
    username: str | None = Field(default=None,max_length=31)
    full_name: str | None = Field(default=None,max_length=120)
    role: Literal["CLIENT","COMPETITOR","LOCAL_PAGE","MEDIA","DF_GENERAL"] | None = None
    active: bool | None = None
    slate_id: int | None = Field(default=None,gt=0)
    position: Literal["CANDIDATE","VICE","ASSOCIATE"] | None = None

    @field_validator("full_name")
    @classmethod
    def clean_name(cls,value):
        if value is not None:
            value=value.strip() or None
            if value and ("<" in value or ">" in value):raise ValueError("HTML não permitido.")
        return value


class ExistingProfileInput(BaseModel):
    profile_id: int = Field(gt=0)
    role: Literal["CLIENT","COMPETITOR","LOCAL_PAGE","MEDIA","DF_GENERAL"]


@router.put("/{campaign_id}")
def edit_campaign(campaign_id:int,data:CampaignCreate,session:Session=Depends(get_session)):
    campaign=admin.locked_campaign(session,campaign_id)
    duplicate=session.exec(select(Campaign).where(Campaign.slug==data.slug,Campaign.id!=campaign_id)).first()
    if duplicate:raise HTTPException(409,"Identificador já utilizado por outra campanha.")
    campaign.name,campaign.slug=data.name,data.slug
    session.add(campaign);admin.commit(session);session.refresh(campaign)
    return campaign


@router.delete("/{campaign_id}")
def archive_campaign(campaign_id:int,confirmation:str=Query(...),session:Session=Depends(get_session)):
    campaign=admin.locked_campaign(session,campaign_id)
    admin.confirm(campaign.slug,confirmation)
    campaign.active=False
    session.add(campaign);admin.commit(session)
    return {"id":campaign.id,"archived":True,"history_preserved":True}


@router.post("/{campaign_id}/restore")
def restore_campaign(campaign_id:int,session:Session=Depends(get_session)):
    campaign=admin.locked_campaign(session,campaign_id)
    campaign.active=True
    session.add(campaign);admin.commit(session)
    return {"id":campaign.id,"active":True}


@router.get("/{campaign_id}/slates")
def list_slates(campaign_id:int,session:Session=Depends(get_session)):
    if not session.get(Campaign,campaign_id):raise HTTPException(404,"Campanha monitorada não encontrada.")
    from app.services.campaign_scope import slate_payloads
    return slate_payloads(session,campaign_id)


@router.delete("/{campaign_id}/slates/{slate_id}")
def delete_slate(campaign_id:int,slate_id:int,confirmation:str=Query(...),session:Session=Depends(get_session)):
    admin.locked_campaign(session,campaign_id)
    slate=session.get(CampaignSlate,slate_id)
    if not slate or slate.campaign_id!=campaign_id:raise HTTPException(404,"Chapa não encontrada nesta campanha.")
    admin.confirm(slate.name,confirmation)
    session.exec(delete(SlateMember).where(SlateMember.slate_id==slate_id,SlateMember.campaign_id==campaign_id))
    session.delete(slate);admin.commit(session)
    return {"deleted":True,"history_preserved":True}


@router.put("/{campaign_id}/profiles/{profile_id}")
def edit_profile(campaign_id:int,profile_id:int,data:ProfileUpdate,session:Session=Depends(get_session)):
    return admin.update_profile(session,campaign_id,profile_id,data.model_dump(exclude_unset=True))


@router.delete("/{campaign_id}/profiles/{profile_id}")
def remove_profile(campaign_id:int,profile_id:int,confirmation:str=Query(...),session:Session=Depends(get_session)):
    admin.locked_campaign(session,campaign_id)
    profile=session.get(InstagramProfile,profile_id)
    if not profile:raise HTTPException(404,"Perfil não encontrado.")
    admin.confirm(profile.username,confirmation)
    return {**admin.update_profile(session,campaign_id,profile_id,{"active":False}),"history_preserved":True}


@router.get("/{campaign_id}/available-profiles")
def available_profiles(campaign_id:int,session:Session=Depends(get_session)):
    if not session.get(Campaign,campaign_id):raise HTTPException(404,"Campanha monitorada não encontrada.")
    links={link.profile_id:link for link in session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id==campaign_id)).all()}
    return [{"id":profile.id,"username":profile.username,"full_name":profile.full_name,
             "linked":profile.id in links,"active":links[profile.id].active if profile.id in links else False}
            for profile in session.exec(select(InstagramProfile).order_by(InstagramProfile.username)).all()]


@router.post("/{campaign_id}/profile-links")
def link_existing_profile(campaign_id:int,data:ExistingProfileInput,session:Session=Depends(get_session)):
    admin.locked_campaign(session,campaign_id)
    if not session.get(InstagramProfile,data.profile_id):raise HTTPException(404,"Perfil existente não encontrado.")
    if data.role=="DF_GENERAL" and session.exec(select(ProfileRegion).where(ProfileRegion.profile_id==data.profile_id)).first():
        raise HTTPException(409,"Perfil com RA fixa não pode ser classificado como Portal geral do DF.")
    link=session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id==campaign_id,CampaignProfile.profile_id==data.profile_id)).first()
    if link and link.active:raise HTTPException(409,"Perfil já está ativo nesta campanha.")
    link=link or CampaignProfile(campaign_id=campaign_id,profile_id=data.profile_id,role=data.role)
    link.active=True;link.role=data.role
    session.add(link);admin.commit(session)
    return {"profile_id":data.profile_id,"active":True,"role":link.role}
