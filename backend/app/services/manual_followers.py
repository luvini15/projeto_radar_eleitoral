"""Add-only, idempotent import of explicitly supplied historical observations."""
from datetime import date, datetime, time, timezone
from pathlib import Path
import json
from sqlmodel import select
from app.models import InstagramProfile, ProfileSnapshot, Campaign, CampaignProfile
from app.services.follower_history import MANUAL_SOURCE


def import_observations(session, dataset, campaign_id, apply=False):
    campaign=session.exec(select(Campaign).where(Campaign.id==campaign_id).with_for_update()).first()
    if campaign is None:
        raise ValueError("Campanha inexistente.")
    allowed={link.profile_id for link in session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id==campaign_id)).all()}
    pending=[]
    skipped=0
    for item in dataset["profiles"]:
        profile=session.exec(select(InstagramProfile).where(InstagramProfile.username==item["username"])).first()
        if profile is None or profile.id not in allowed:
            raise ValueError("Perfil histórico não pertence à campanha informada: "+item["username"])
        for row in item["observations"]:
            day=date.fromisoformat(row["date"])
            # Noon UTC represents a calendar observation, not a claimed collection time.
            instant=datetime.combine(day,time(12),timezone.utc)
            if not isinstance(row["followers"],int) or isinstance(row["followers"],bool) or row["followers"]<0:
                raise ValueError("Contagem inválida.")
            existing=session.exec(select(ProfileSnapshot).where(ProfileSnapshot.profile_id==profile.id,
                ProfileSnapshot.source==MANUAL_SOURCE,ProfileSnapshot.collected_at==instant)).first()
            if existing:
                if existing.followers_count!=row["followers"]:
                    raise ValueError("Histórico manual divergente; nenhum registro será sobrescrito.")
                skipped+=1
            else:
                pending.append(ProfileSnapshot(profile_id=profile.id,followers_count=row["followers"],source=MANUAL_SOURCE,collected_at=instant))
    if apply:
        session.add_all(pending)
        session.commit()
    return {"inserted" if apply else "would_insert":len(pending),"already_present":skipped,"source":MANUAL_SOURCE}


if __name__=="__main__":
    import argparse,os
    from sqlmodel import Session
    from app.database import engine
    parser=argparse.ArgumentParser()
    parser.add_argument("--campaign-id",type=int,required=True)
    parser.add_argument("--apply",action="store_true")
    args=parser.parse_args()
    # This explicit data-loading command is limited to the configured local database.
    if args.apply and (os.getenv("APP_ENV",os.getenv("ENVIRONMENT","")) not in {"development","local","dev"}
        or engine.url.host not in {None,"localhost","127.0.0.1","::1"}):
        raise SystemExit("Importação habilitada somente em ambiente e banco locais.")
    dataset=json.loads((Path(__file__).resolve().parents[2]/"data/manual_followers_2026_10.json").read_text(encoding="utf-8"))
    with Session(engine) as session:
        print(json.dumps(import_observations(session,dataset,args.campaign_id,args.apply)))
