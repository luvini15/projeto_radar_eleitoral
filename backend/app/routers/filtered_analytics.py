from __future__ import annotations

from collections import defaultdict
from datetime import datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import AdministrativeRegion, Campaign, CampaignProfile, InstagramPost, InstagramProfile, PostSnapshot, PostTheme, ProfileRegion, ProfileSnapshot, Theme
from app.services.taxonomy import classify_theme

router = APIRouter(prefix="/api/campaigns", tags=["filtered analytics"])


def avg(values: list[int]) -> float | None:
    return round(sum(values) / len(values), 2) if values else None


@router.get("/{campaign_id}/analytics")
def filtered_analytics(campaign_id: int, start_date: str, end_date: str, region_id: int | None = None, profile_id: list[int] = Query(default=[]), theme: str | None = None, format: str | None = None, session: Session = Depends(get_session)):
    if not session.get(Campaign, campaign_id):
        raise HTTPException(404, "Campanha não encontrada.")
    start = datetime.combine(datetime.fromisoformat(start_date).date(), time.min, tzinfo=timezone.utc)
    end = datetime.combine(datetime.fromisoformat(end_date).date(), time.max, tzinfo=timezone.utc)
    links = list(session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id == campaign_id, CampaignProfile.active == True)).all())  # noqa: E712
    roles = {x.profile_id: x.role for x in links}; ids = set(roles)
    if profile_id: ids &= set(profile_id)
    region_by_profile = {x.profile_id: x.region_id for x in session.exec(select(ProfileRegion)).all()}
    if region_id is not None: ids = {x for x in ids if region_by_profile.get(x) == region_id}
    posts = list(session.exec(select(InstagramPost).where(InstagramPost.profile_id.in_(ids), InstagramPost.published_at >= start, InstagramPost.published_at <= end)).all()) if ids else []
    post_ids = [p.id for p in posts]; snaps = list(session.exec(select(PostSnapshot).where(PostSnapshot.post_id.in_(post_ids)).order_by(PostSnapshot.collected_at)).all()) if post_ids else []; latest = {s.post_id:s for s in snaps}
    theme_names = {x.id:x.name for x in session.exec(select(Theme)).all()}; assigned = {x.post_id:theme_names.get(x.theme_id) for x in session.exec(select(PostTheme).where(PostTheme.post_id.in_(post_ids))).all()} if post_ids else {}
    profiles = {x.id:x for x in session.exec(select(InstagramProfile).where(InstagramProfile.id.in_(ids))).all()} if ids else {}; regions = {x.id:x.name for x in session.exec(select(AdministrativeRegion)).all()}
    daily=defaultdict(lambda:{"posts":0,"interactions":0}); daily_profiles=defaultdict(lambda:defaultdict(lambda:{"posts":0,"interactions":0})); themes=defaultdict(list); formats=defaultdict(list); profile_rows=defaultdict(list); region_rows=defaultdict(list)
    for post in posts:
        name=assigned.get(post.id) or classify_theme(post.caption)[0]; fmt="Carrossel" if post.content_type=="Sidecar" else "Reels" if post.content_type=="Video" or post.product_type=="clips" else "Imagem" if post.content_type=="Image" else post.content_type or "Outro"
        if theme and name.casefold()!=theme.casefold() or format and fmt.casefold()!=format.casefold(): continue
        snap=latest.get(post.id); row={"likes":snap.likes_count if snap else None,"comments":snap.comments_count if snap else None,"views":snap.views_count if snap else None,"plays":snap.plays_count if snap else None,"interactions":snap.interactions_count if snap else None}
        day=post.published_at.date().isoformat(); daily[day]["posts"]+=1; daily[day]["interactions"]+=row["interactions"] or 0; daily_profiles[day][post.profile_id]["posts"]+=1; daily_profiles[day][post.profile_id]["interactions"]+=row["interactions"] or 0; themes[name].append(row); formats[fmt].append(row); profile_rows[post.profile_id].append({**row,"theme":name,"format":fmt}); region_rows[region_by_profile.get(post.profile_id)].append(row)
    def summarize(rows):
        likes=[r["likes"] for r in rows if r["likes"] is not None]; comments=[r["comments"] for r in rows if r["comments"] is not None]; views=[r["views"] for r in rows if r["views"] is not None]; plays=[r["plays"] for r in rows if r["plays"] is not None]; interactions=[r["interactions"] for r in rows if r["interactions"] is not None]
        return {"posts":len(rows),"likes_total":sum(likes) if likes else None,"likes_average":avg(likes),"comments_total":sum(comments) if comments else None,"comments_average":avg(comments),"views_total":sum(views) if views else None,"views_average":avg(views),"plays_total":sum(plays) if plays else None,"plays_average":avg(plays),"interactions":sum(interactions),"interactions_average":avg(interactions)}
    profile_output=[]
    for pid,rows in profile_rows.items():
        thematic=defaultdict(list); format_dist=defaultdict(int)
        for row in rows: thematic[row["theme"]].append(row); format_dist[row["format"]]+=1
        profile_output.append({"profile_id":pid,"username":profiles[pid].username,"full_name":profiles[pid].full_name,"role":roles[pid],**summarize(rows),"themes":{name:len(values) for name,values in thematic.items()},"theme_performance":{name:summarize(values) for name,values in thematic.items()},"formats":dict(format_dist)})
    follower_snapshots=list(session.exec(select(ProfileSnapshot).where(ProfileSnapshot.profile_id.in_(ids),ProfileSnapshot.collected_at>=start,ProfileSnapshot.collected_at<=end).order_by(ProfileSnapshot.collected_at)).all()) if ids else []
    followers=defaultdict(list)
    for snapshot in follower_snapshots: followers[snapshot.profile_id].append({"date":snapshot.collected_at.isoformat(),"followers":snapshot.followers_count})
    daily_output=[]
    for day,totals in sorted(daily.items()):
        per_profile={profiles[pid].username:values for pid,values in daily_profiles[day].items() if pid in profiles}
        daily_output.append({"date":day,**totals,"profiles":per_profile})
    return {"filters":{"start_date":start_date,"end_date":end_date,"region_id":region_id,"profile_ids":profile_id,"theme":theme,"format":format},"data_status":"NO_DATA" if not profile_rows else "INSUFFICIENT" if sum(len(x) for x in profile_rows.values())<5 else "SUFFICIENT","daily":daily_output,"themes":[{"theme":k,**summarize(v)} for k,v in themes.items()],"formats":[{"format":k,**summarize(v)} for k,v in formats.items()],"profiles":profile_output,"follower_history":[{"profile_id":pid,"username":profiles[pid].username,"points":points} for pid,points in followers.items() if pid in profiles],"regions":[{"region_id":k,"region":regions.get(k),**summarize(v)} for k,v in region_rows.items() if k is not None],"limitations":{"missing_metrics_remain_null":True,"regions_require_explicit_profile_assignment":True,"observed_interactions_may_be_partial":True}}
