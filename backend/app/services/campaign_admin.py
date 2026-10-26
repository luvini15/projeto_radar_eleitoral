"""Transactional configuration management. Never deletes collected data or profile identities."""
from fastapi import HTTPException
from sqlalchemy import func, delete
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select
from app.models import (Campaign, CampaignProfile, CampaignSlate, SlateMember, InstagramProfile,
                        InstagramPost, ProfileSnapshot, ProfileCollectionRun, ProfileRegion, ProfileMonitoring)
from app.services.profile_import import normalize_username


def locked_campaign(session, campaign_id):
    campaign = session.exec(select(Campaign).where(Campaign.id == campaign_id).with_for_update()).first()
    if campaign is None:
        raise HTTPException(404, "Campanha monitorada não encontrada.")
    return campaign


def commit(session):
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, "Configuração em conflito com outro registro. Atualize os dados e tente novamente.") from None


def confirm(actual, supplied):
    if supplied != actual:
        raise HTTPException(422, "Confirme a operação digitando exatamente o identificador solicitado.")


def editability(session, profiles):
    ids = [profile.id for profile in profiles]
    if not ids:
        return {}
    collected = set()
    for model in (InstagramPost, ProfileSnapshot, ProfileCollectionRun):
        collected.update(session.exec(select(model.profile_id).where(model.profile_id.in_(ids)).distinct()).all())
    shared = {pid for pid,count in session.exec(select(CampaignProfile.profile_id,func.count()).where(
        CampaignProfile.profile_id.in_(ids)).group_by(CampaignProfile.profile_id)).all() if count > 1}
    result = {}
    for profile in profiles:
        reason = ("O coletor atual também identifica o perfil pelo username. O @ de perfis já coletados está protegido para evitar duplicação de identidade."
                  if profile.instagram_id or profile.id in collected else
                  "Este perfil é compartilhado com outra campanha. O username está protegido para preservar a identidade comum."
                  if profile.id in shared else None)
        result[profile.id] = {"username_editable": reason is None, "username_edit_reason": reason}
    return result


def set_membership(session, campaign_id, profile_id, slate_id, position, transfer=False):
    """Caller holds the campaign lock until commit, serializing candidate/vice slots."""
    link = session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id == campaign_id,
        CampaignProfile.profile_id == profile_id)).first()
    if not link or not link.active:
        raise HTTPException(422, "O perfil precisa estar ativo nesta campanha monitorada.")
    member = session.exec(select(SlateMember).where(SlateMember.campaign_id == campaign_id,
        SlateMember.profile_id == profile_id)).first()
    if slate_id is None:
        if member:
            session.delete(member)
        return None
    slate = session.get(CampaignSlate, slate_id)
    if slate is None or slate.campaign_id != campaign_id:
        raise HTTPException(404, "Chapa não encontrada nesta campanha monitorada.")
    if position not in {"CANDIDATE", "VICE", "ASSOCIATE"}:
        raise HTTPException(422, "Escolha a posição do perfil na chapa.")
    if member and member.slate_id != slate_id and not transfer:
        raise HTTPException(409, "Perfil já pertence a outra chapa. Use Editar perfil para transferir o vínculo.")
    if position in {"CANDIDATE", "VICE"}:
        occupied = session.exec(select(SlateMember).where(SlateMember.slate_id == slate_id,
            SlateMember.position == position, SlateMember.profile_id != profile_id)).first()
        if occupied:
            raise HTTPException(409, "Esta chapa já possui um candidato ou vice nessa posição. Nenhuma associação foi alterada.")
    member = member or SlateMember(campaign_id=campaign_id,slate_id=slate_id,profile_id=profile_id)
    member.slate_id,member.position = slate_id,position
    session.add(member)
    return member


def update_profile(session, campaign_id, profile_id, changes):
    try:
        locked_campaign(session,campaign_id)
        link = session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id==campaign_id,
            CampaignProfile.profile_id==profile_id)).first()
        profile = session.get(InstagramProfile,profile_id)
        if link is None or profile is None:
            raise HTTPException(404,"Perfil não encontrado nesta campanha monitorada.")
        if "username" in changes and changes["username"] is not None:
            try:
                username=normalize_username(changes["username"])
            except ValueError as error:
                raise HTTPException(422,str(error)) from None
            if username!=profile.username:
                rules=editability(session,[profile])[profile.id]
                if not rules["username_editable"]:
                    raise HTTPException(409,rules["username_edit_reason"])
                duplicate=session.exec(select(InstagramProfile).where(func.lower(InstagramProfile.username)==username,
                    InstagramProfile.id!=profile_id)).first()
                if duplicate:
                    raise HTTPException(409,"Este username já pertence a outro perfil. Os registros não foram mesclados.")
                metadata=session.get(ProfileMonitoring,profile_id)
                if metadata:
                    metadata.url=f"https://www.instagram.com/{username}/"
                    session.add(metadata)
                profile.username=username
        if "full_name" in changes:
            profile.full_name=changes["full_name"]
        role=changes.get("role") or link.role
        if role=="DF_GENERAL" and session.exec(select(ProfileRegion).where(ProfileRegion.profile_id==profile_id)).first():
            raise HTTPException(409,"Perfil com RA fixa não pode ser classificado como Portal geral do DF sem revisão territorial.")
        link.role=role
        if changes.get("active") is not None:
            link.active=changes["active"]
        session.add(link)
        # Validate and move associations in the SAME transaction as editable fields.
        if not link.active:
            member=session.exec(select(SlateMember).where(SlateMember.campaign_id==campaign_id,SlateMember.profile_id==profile_id)).first()
            if member:session.delete(member)
        elif "slate_id" in changes or "position" in changes:
            current=session.exec(select(SlateMember).where(SlateMember.campaign_id==campaign_id,SlateMember.profile_id==profile_id)).first()
            slate_id=changes.get("slate_id",current.slate_id if current else None)
            position=changes.get("position",current.position if current else None)
            set_membership(session,campaign_id,profile_id,slate_id,position,transfer=True)
        session.add(profile)
        commit(session)
        return {"id":profile.id,"username":profile.username,"full_name":profile.full_name,"role":link.role,"active":link.active}
    except HTTPException:
        session.rollback()
        raise
