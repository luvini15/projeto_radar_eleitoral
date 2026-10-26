"""One validated analysis scope shared by all campaign readers; collectors stay unchanged."""
from fastapi import HTTPException
from sqlmodel import Session, select
from app.models import CampaignProfile, CampaignSlate, SlateMember


def campaign_links(session: Session, campaign_id: int) -> list[CampaignProfile]:
    links = list(session.exec(select(CampaignProfile).where(
        CampaignProfile.campaign_id == campaign_id, CampaignProfile.active == True)).all())
    slate_id = session.info.get("slate_id")
    profile_id = session.info.get("scope_profile_id")
    profile_ids = session.info.get("scope_profile_ids")
    if profile_ids is not None:
        links = [link for link in links if link.profile_id in profile_ids]
    if slate_id is not None:
        slate = session.get(CampaignSlate, slate_id)
        if not slate or slate.campaign_id != campaign_id:
            raise HTTPException(404, "Chapa não encontrada nesta campanha.")
        members = set(session.exec(select(SlateMember.profile_id).where(
            SlateMember.slate_id == slate_id, SlateMember.campaign_id == campaign_id)).all())
        links = [link for link in links if link.profile_id in members]
    if profile_id is not None:
        if not any(link.profile_id == profile_id for link in links):
            raise HTTPException(404, "Perfil não pertence ao recorte selecionado.")
        links = [link for link in links if link.profile_id == profile_id]
    return links


def slate_payloads(session: Session, campaign_id: int) -> list[dict]:
    from app.models import InstagramProfile
    profiles = {p.id: p for p in session.exec(select(InstagramProfile).join(
        CampaignProfile, InstagramProfile.id == CampaignProfile.profile_id).where(
        CampaignProfile.campaign_id == campaign_id)).all()}
    members = list(session.exec(select(SlateMember).where(SlateMember.campaign_id == campaign_id)).all())
    return [{"id": slate.id, "name": slate.name, "campaign_id": campaign_id,
             "members": [{"profile_id": member.profile_id, "username": profiles[member.profile_id].username,
                          "position": member.position} for member in members
                         if member.slate_id == slate.id and member.profile_id in profiles]}
            for slate in session.exec(select(CampaignSlate).where(
                CampaignSlate.campaign_id == campaign_id).order_by(CampaignSlate.id)).all()]
