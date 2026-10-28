from __future__ import annotations
from app.services.campaign_scope import campaign_links

from collections import defaultdict
from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy import func

from app.database import get_session
from app.models import AdministrativeRegion, Campaign, CampaignProfile, InstagramPost, InstagramProfile, PostSnapshot, PostTheme, ProfileSnapshot, Theme
from app.services.taxonomy import classify_theme
from app.services.territorial_detection import territories_for_posts, matching_territories
from typing import Literal

router = APIRouter(prefix="/api/campaigns", tags=["filtered analytics"])


def avg(values: list[int]) -> float | None:
    return round(sum(values) / len(values), 2) if values else None


@router.get("/{campaign_id}/analytics")
def filtered_analytics(campaign_id: int, start_date: str, end_date: str, region_id: int | None = None, profile_id: list[int] = Query(default=[]), theme: str | None = None, format: str | None = None, session: Session = Depends(get_session), territorial_origin: Literal["PROFILE", "CONTENT", "LOCATION"] | None = None, role: Literal["CLIENT", "COMPETITOR", "LOCAL_PAGE", "MEDIA", "DF_GENERAL"] | None = None, profile_selection: Literal["all", "selected"] = "all"):
    if not session.get(Campaign, campaign_id):
        raise HTTPException(404, "Campanha não encontrada.")
    try:
        start = datetime.combine(date.fromisoformat(start_date), time.min, tzinfo=timezone.utc)
        end = datetime.combine(date.fromisoformat(end_date), time.max, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(422, "Informe datas válidas no formato AAAA-MM-DD.")
    if start > end:
        raise HTTPException(422, "A data inicial deve ser anterior à data final.")
    if session.info.get("period_start") or session.info.get("analysis_days"):
        from app.services.analysis_period import analysis_bounds
        start, exclusive_end = analysis_bounds(session)
        from datetime import timedelta
        end = exclusive_end - timedelta(microseconds=1)
        start_date, end_date = start.date().isoformat(), end.date().isoformat()
    links = campaign_links(session, campaign_id)  # noqa: E712
    roles = {x.profile_id: x.role for x in links if role is None or x.role == role}; ids = set(roles)
    if profile_id or profile_selection == "selected": ids &= set(profile_id)
    posts = list(session.exec(select(InstagramPost).where(InstagramPost.profile_id.in_(ids), InstagramPost.published_at >= start, InstagramPost.published_at <= end)).all()) if ids else []
    if session.info.get("sample_limit"):
        counts = defaultdict(int)
        limited = []
        for post in sorted(posts, key=lambda p: (p.published_at, p.id), reverse=True):
            if counts[post.profile_id] < session.info["sample_limit"]:
                limited.append(post)
                counts[post.profile_id] += 1
        posts = limited
    post_ids = [p.id for p in posts]
    latest = {}
    if post_ids:
        ranked = select(PostSnapshot.id, func.row_number().over(partition_by=PostSnapshot.post_id, order_by=(PostSnapshot.collected_at.desc(), PostSnapshot.id.desc())).label("position")).where(PostSnapshot.post_id.in_(post_ids)).subquery()
        latest = {s.post_id: s for s in session.exec(select(PostSnapshot).join(ranked, PostSnapshot.id == ranked.c.id).where(ranked.c.position == 1)).all()}
    theme_names = {x.id:x.name for x in session.exec(select(Theme)).all()}; assigned = {x.post_id:theme_names.get(x.theme_id) for x in session.exec(select(PostTheme).where(PostTheme.post_id.in_(post_ids))).all()} if post_ids else {}
    profiles = {x.id:x for x in session.exec(select(InstagramProfile).where(InstagramProfile.id.in_(ids))).all()} if ids else {}; regions = {x.id:x.name for x in session.exec(select(AdministrativeRegion)).all()}
    daily=defaultdict(list); daily_profiles=defaultdict(lambda:defaultdict(list)); themes=defaultdict(list); formats=defaultdict(list); profile_rows=defaultdict(list); region_rows=defaultdict(list)
    territories = territories_for_posts(session, posts)
    for post in posts:
        matches = matching_territories(territories.get(post.id, []), region_id, territorial_origin)
        if (region_id is not None or territorial_origin) and not matches: continue
        name=assigned.get(post.id) or classify_theme(post.caption)[0]; fmt="Carrossel" if post.content_type=="Sidecar" else "Reels" if post.content_type=="Video" or post.product_type=="clips" else "Imagem" if post.content_type=="Image" else post.content_type or "Outro"
        if theme and name.casefold()!=theme.casefold() or format and fmt.casefold()!=format.casefold(): continue
        snap=latest.get(post.id); row={"likes":snap.likes_count if snap else None,"comments":snap.comments_count if snap else None,"views":snap.views_count if snap else None,"plays":snap.plays_count if snap else None,"interactions":snap.interactions_count if snap else None,"shares":snap.shares_count if snap else None,"saves":snap.saves_count if snap else None}
        day=post.published_at.date().isoformat(); daily[day].append(row); daily_profiles[day][post.profile_id].append(row); themes[name].append(row); formats[fmt].append(row); profile_rows[post.profile_id].append({**row,"theme":name,"format":fmt})
        for territory in matches: region_rows[territory["region_id"]].append(row)
    def summarize(rows):
        likes=[r["likes"] for r in rows if r["likes"] is not None]; comments=[r["comments"] for r in rows if r["comments"] is not None]; views=[r["views"] for r in rows if r["views"] is not None]; plays=[r["plays"] for r in rows if r["plays"] is not None]; interactions=[r["interactions"] for r in rows if r["interactions"] is not None]
        return {"posts":len(rows),"likes_total":sum(likes) if likes else None,"likes_average":avg(likes),"comments_total":sum(comments) if comments else None,"comments_average":avg(comments),"views_total":sum(views) if views else None,"views_average":avg(views),"plays_total":sum(plays) if plays else None,"plays_average":avg(plays),"interactions":sum(interactions) if interactions else None,"interactions_average":avg(interactions)}
    profile_output=[]
    for pid,rows in profile_rows.items():
        thematic=defaultdict(list); format_dist=defaultdict(int)
        for row in rows: thematic[row["theme"]].append(row); format_dist[row["format"]]+=1
        profile_output.append({"profile_id":pid,"username":profiles[pid].username,"full_name":profiles[pid].full_name,"role":roles[pid],**summarize(rows),"themes":{name:len(values) for name,values in thematic.items()},"theme_performance":{name:summarize(values) for name,values in thematic.items()},"formats":dict(format_dist)})
    if region_id is not None or territorial_origin: ids = set(profile_rows)
    from app.services.follower_history import daily_observations
    from datetime import timedelta
    followers = daily_observations(session, ids, start, end + timedelta(microseconds=1))
    def daily_totals(rows):
        result = {"posts": len(rows), "metric_samples": {}}
        for metric in ("interactions", "likes", "comments", "views", "plays", "shares", "saves"):
            values = [row[metric] for row in rows if row[metric] is not None]
            result[metric] = sum(values) if values else None
            result["metric_samples"][metric] = len(values)
        return result
    daily_output=[]
    for day,totals in sorted(daily.items()):
        per_profile={profiles[pid].username:daily_totals(values) for pid,values in daily_profiles[day].items() if pid in profiles}
        daily_output.append({"date":day,**daily_totals(totals),"profiles":per_profile})
    return {"filters":{"start_date":start_date,"end_date":end_date,"region_id":region_id,"profile_ids":profile_id,"theme":theme,"format":format,"territorial_origin":territorial_origin,"role":role,"profile_selection":profile_selection},"data_status":"NO_DATA" if not profile_rows else "INSUFFICIENT" if sum(len(x) for x in profile_rows.values())<5 else "SUFFICIENT","daily":daily_output,"themes":[{"theme":k,**summarize(v)} for k,v in themes.items()],"formats":[{"format":k,**summarize(v)} for k,v in formats.items()],"profiles":profile_output,"follower_history":[{"profile_id":pid,"username":profiles[pid].username,"points":points} for pid,points in followers.items() if pid in profiles],"regions":[{"region_id":k,"region":regions.get(k),**summarize(v)} for k,v in region_rows.items() if k is not None],"limitations":{"missing_metrics_remain_null":True,"regions_require_explicit_profile_assignment":False,"regions_use_post_evidence_or_explicit_profile_fallback":True,"observed_interactions_may_be_partial":True}}
