from __future__ import annotations
from typing import Annotated
from app.services.comments import read_comment_sample

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from statistics import mean
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlmodel import Session, select

from app.database import get_session
from app.services.media_preview import PreviewUnavailable, get_post_preview
from app.models import (
    Campaign,
    CampaignProfile,
    InstagramPost,
    InstagramProfile,
    PostSnapshot,
    ProfileSnapshot,
)

router = APIRouter(prefix="/api/campaigns", tags=["analytics"])

SP_TZ = ZoneInfo("America/Sao_Paulo")
WEEKDAY_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

THEME_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("Mobilidade", ("ônibus", "transporte", "mobilidade", "brt", "metrô", "ciclovia", "trânsito")),
    ("Segurança", ("segurança", "polícia", "crime", "violência", "delegacia")),
    ("Saúde", ("saúde", "hospital", "ubs", "médic", "suicídio", "acolhimento", "amament")),
    ("Educação", ("educação", "escola", "creche", "professor", "aluno", "ensino")),
    ("Infraestrutura", ("obra", "infraestrutura", "buraco", "asfalto", "pavimenta", "reforma")),
    ("Emprego e renda", ("emprego", "trabalho", "renda", "qualificação", "renovadf", "feirante", "economia")),
    ("Fiscalização", ("fiscaliza", "prestação de contas", "cobrança", "denúncia")),
    ("Ações comunitárias", ("comunidade", "morador", "bairro", "visita", "ação social", "evento", "feira")),
    ("Campanha eleitoral", ("vote", "eleição", "campanha", "deputado distrital", "número", "comitê")),
    ("Institucional", ("lei", "mandato", "emenda", "secretaria", "governo", "deputado")),
]


def _campaign_or_404(session: Session, campaign_id: int) -> Campaign:
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada.")
    return campaign


def _links(session: Session, campaign_id: int) -> list[CampaignProfile]:
    return list(
        session.exec(
            select(CampaignProfile).where(
                CampaignProfile.campaign_id == campaign_id,
                CampaignProfile.active == True,  # noqa: E712
            )
        ).all()
    )


def _campaign_post_or_404(session: Session, campaign_id: int, post_id: int) -> InstagramPost:
    _campaign_or_404(session, campaign_id)
    post = session.get(InstagramPost, post_id)
    if not post or not any(link.profile_id == post.profile_id for link in _links(session, campaign_id)):
        raise HTTPException(status_code=404, detail="Publicação não encontrada nesta campanha.")
    return post


def _latest_posts(session: Session, profile_id: int, limit: int) -> list[InstagramPost]:
    return list(
        session.exec(
            select(InstagramPost)
            .where(InstagramPost.profile_id == profile_id)
            .order_by(InstagramPost.published_at.desc())
            .limit(limit)
        ).all()
    )


def _latest_snapshot(session: Session, post_id: int) -> PostSnapshot | None:
    return session.exec(
        select(PostSnapshot)
        .where(PostSnapshot.post_id == post_id)
        .order_by(PostSnapshot.collected_at.desc())
    ).first()


def _latest_profile_snapshot(session: Session, profile_id: int) -> ProfileSnapshot | None:
    return session.exec(
        select(ProfileSnapshot)
        .where(ProfileSnapshot.profile_id == profile_id)
        .order_by(ProfileSnapshot.collected_at.desc())
    ).first()


def _avg(values: list[int | float]) -> float | None:
    return round(mean(values), 2) if values else None


def _sum_available(values) -> int | float | None:
    available = [value for value in values if value is not None]
    return sum(available) if available else None


def _format_name(post: InstagramPost) -> str:
    if post.content_type == "Sidecar":
        return "Carrossel"
    if post.content_type == "Video" or post.product_type == "clips":
        return "Reels"
    if post.content_type == "Image":
        return "Imagem"
    return post.content_type or "Outro"


def _theme(caption: str | None) -> str:
    text = (caption or "").lower()
    for theme, keywords in THEME_RULES:
        if any(keyword in text for keyword in keywords):
            return theme
    return "Outros"


def _local_dt(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(SP_TZ)


def _post_payload(post: InstagramPost, profile: InstagramProfile, role: str, snapshot: PostSnapshot | None) -> dict:
    likes = snapshot.likes_count if snapshot else None
    comments = snapshot.comments_count if snapshot else None
    observed = snapshot.interactions_count if snapshot else None
    return {
        "post_id": post.id,
        "instagram_id": post.instagram_id,
        "shortcode": post.shortcode,
        "profile": {
            "id": profile.id,
            "username": profile.username,
            "full_name": profile.full_name,
            "role": role,
        },
        "content": {
            "type": post.content_type,
            "format": _format_name(post),
            "product_type": post.product_type,
            "theme": _theme(post.caption),
            "caption": post.caption,
            "url": post.url,
            "thumbnail_url": post.thumbnail_url,
            "location_name": post.location_name,
            "published_at": post.published_at,
            "paid_partnership": post.paid_partnership,
        },
        "metrics": {
            "likes": likes,
            "comments": comments,
            "views": snapshot.views_count if snapshot else None,
            "plays": snapshot.plays_count if snapshot else None,
            "shares": snapshot.shares_count if snapshot else None,
            "saves": snapshot.saves_count if snapshot else None,
            "observed_interactions": observed,
            "interactions_complete": snapshot.interactions_complete if snapshot else False,
            "collected_at": snapshot.collected_at if snapshot else None,
        },
    }


@router.get("/{campaign_id}/overview")
def campaign_overview(campaign_id: int, limit: Annotated[int, Query(ge=1, le=200)] = 25, session: Session = Depends(get_session)):
    campaign = _campaign_or_404(session, campaign_id)
    profiles_data: list[dict] = []

    for link in _links(session, campaign_id):
        profile = session.get(InstagramProfile, link.profile_id)
        if not profile:
            continue
        posts = _latest_posts(session, profile.id, limit)
        snapshots = [_latest_snapshot(session, p.id) for p in posts]
        snapshots = [s for s in snapshots if s is not None]

        likes_values = [s.likes_count for s in snapshots if s.likes_count is not None]
        comments = _sum_available(s.comments_count for s in snapshots)
        views = _sum_available(s.views_count for s in snapshots)
        plays = _sum_available(s.plays_count for s in snapshots)
        observed = _sum_available(s.interactions_count for s in snapshots)

        profiles_data.append(
            {
                "profile_id": profile.id,
                "username": profile.username,
                "full_name": profile.full_name,
                "role": link.role,
                "posts_analyzed": len(posts),
                "posts_with_snapshot": len(snapshots),
                "comments": comments,
                "likes": sum(likes_values) if likes_values else None,
                "likes_available": bool(likes_values),
                "views": views,
                "plays": plays,
                "observed_interactions": observed,
            }
        )

    return {
        "campaign": {"id": campaign.id, "name": campaign.name, "slug": campaign.slug},
        "methodology": {
            "posts_per_profile": limit,
            "latest_posts_only": True,
            "pinned_posts_excluded_at_collection": True,
            "latest_snapshot_only": True,
            "observed_interactions_are_partial": True,
        },
        "summary": {
            "profiles_monitored": len(profiles_data),
            "posts_analyzed": sum(p["posts_analyzed"] for p in profiles_data),
            "comments": _sum_available(p["comments"] for p in profiles_data),
            "views": _sum_available(p["views"] for p in profiles_data),
            "plays": _sum_available(p["plays"] for p in profiles_data),
            "observed_interactions": _sum_available(p["observed_interactions"] for p in profiles_data),
        },
        "profiles": profiles_data,
    }


@router.get("/{campaign_id}/benchmark")
def campaign_benchmark(campaign_id: int, limit: Annotated[int, Query(ge=1, le=200)] = 25, session: Session = Depends(get_session)):
    campaign = _campaign_or_404(session, campaign_id)
    results: list[dict] = []

    for link in _links(session, campaign_id):
        profile = session.get(InstagramProfile, link.profile_id)
        if not profile:
            continue
        posts = _latest_posts(session, profile.id, limit)
        comments_values: list[int] = []
        likes_values: list[int] = []
        video_views: list[int] = []
        video_plays: list[int] = []
        interactions_values: list[int] = []
        reels_count = 0
        complete_interactions = 0

        for post in posts:
            snapshot = _latest_snapshot(session, post.id)
            if not snapshot:
                continue
            if snapshot.comments_count is not None:
                comments_values.append(snapshot.comments_count)
            if snapshot.likes_count is not None:
                likes_values.append(snapshot.likes_count)
            if snapshot.interactions_count is not None:
                interactions_values.append(snapshot.interactions_count)
            if snapshot.interactions_complete:
                complete_interactions += 1
            if _format_name(post) == "Reels":
                reels_count += 1
                if snapshot.views_count is not None:
                    video_views.append(snapshot.views_count)
                if snapshot.plays_count is not None:
                    video_plays.append(snapshot.plays_count)

        follower_snapshot = _latest_profile_snapshot(session, profile.id)
        results.append(
            {
                "profile_id": profile.id,
                "username": profile.username,
                "full_name": profile.full_name,
                "role": link.role,
                "followers": follower_snapshot.followers_count if follower_snapshot else None,
                "posts_analyzed": len(posts),
                "reels_analyzed": reels_count,
                "avg_comments_per_post": _avg(comments_values),
                "avg_likes_per_post": _avg(likes_values),
                "likes_available": bool(likes_values),
                "avg_views_per_reel": _avg(video_views),
                "avg_plays_per_reel": _avg(video_plays),
                "avg_observed_interactions": _avg(interactions_values),
                "interaction_coverage": {"complete_posts": complete_interactions, "posts_analyzed": len(posts)},
            }
        )

    return {
        "campaign": {"id": campaign.id, "name": campaign.name},
        "methodology": {
            "posts_per_profile": limit,
            "latest_posts_only": True,
            "pinned_posts_excluded_at_collection": True,
            "latest_snapshot_only": True,
            "video_metrics_only_on_video_posts": True,
        },
        "profiles": results,
    }


@router.get("/{campaign_id}/posts")
def campaign_posts(
    campaign_id: int,
    limit_per_profile: Annotated[int, Query(ge=1, le=200)] = 25,
    role: Annotated[str | None, Query(max_length=30)] = None,
    username: Annotated[str | None, Query(max_length=31)] = None,
    content_type: Annotated[str | None, Query(max_length=30)] = None,
    session: Session = Depends(get_session),
):
    campaign = _campaign_or_404(session, campaign_id)
    results: list[dict] = []

    for link in _links(session, campaign_id):
        if role and link.role.upper() != role.upper():
            continue
        profile = session.get(InstagramProfile, link.profile_id)
        if not profile:
            continue
        if username and profile.username != username.strip().lstrip("@"):
            continue
        posts = _latest_posts(session, profile.id, limit_per_profile)
        for post in posts:
            if content_type and _format_name(post).lower() != content_type.lower() and (post.content_type or "").lower() != content_type.lower():
                continue
            results.append(_post_payload(post, profile, link.role, _latest_snapshot(session, post.id)))

    results.sort(
        key=lambda x: _local_dt(x["content"]["published_at"]) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return {
        "campaign": {"id": campaign.id, "name": campaign.name},
        "filters": {"role": role, "username": username, "content_type": content_type, "limit_per_profile": limit_per_profile},
        "total_posts": len(results),
        "posts": results,
    }


@router.get("/{campaign_id}/rankings")
def campaign_rankings(campaign_id: int, limit_per_profile: Annotated[int, Query(ge=1, le=200)] = 25, top_n: Annotated[int, Query(ge=1, le=100)] = 10, session: Session = Depends(get_session)):
    campaign = _campaign_or_404(session, campaign_id)
    posts_data: list[dict] = []
    for link in _links(session, campaign_id):
        profile = session.get(InstagramProfile, link.profile_id)
        if not profile:
            continue
        for post in _latest_posts(session, profile.id, limit_per_profile):
            snapshot = _latest_snapshot(session, post.id)
            if not snapshot:
                continue
            posts_data.append(
                {
                    "post_id": post.id,
                    "shortcode": post.shortcode,
                    "username": profile.username,
                    "full_name": profile.full_name,
                    "role": link.role,
                    "type": post.content_type,
                    "format": _format_name(post),
                    "caption": post.caption,
                    "url": post.url,
                    "thumbnail_url": post.thumbnail_url,
                    "published_at": post.published_at,
                    "likes": snapshot.likes_count,
                    "comments": snapshot.comments_count,
                    "views": snapshot.views_count,
                    "plays": snapshot.plays_count,
                    "observed_interactions": snapshot.interactions_count,
                    "is_video": _format_name(post) == "Reels",
                }
            )

    def top_by(field: str, only_video: bool = False) -> list[dict]:
        filtered = [x for x in posts_data if x.get(field) is not None and (not only_video or x["is_video"])]
        return sorted(filtered, key=lambda x: x[field], reverse=True)[:top_n]

    return {
        "campaign": {"id": campaign.id, "name": campaign.name},
        "methodology": {"posts_per_profile": limit_per_profile, "top_n": top_n, "latest_snapshot_only": True},
        "rankings": {
            "top_comments": top_by("comments"),
            "top_observed_interactions": top_by("observed_interactions"),
            "top_reels_views": top_by("views", True),
            "top_reels_plays": top_by("plays", True),
        },
    }


@router.get("/{campaign_id}/followers-history")
def followers_history(campaign_id: int, days: Annotated[int, Query(ge=1, le=365)] = 60, session: Session = Depends(get_session)):
    campaign = _campaign_or_404(session, campaign_id)
    if days < 1:
        raise HTTPException(status_code=400, detail="days deve ser maior que 0.")

    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    profiles: list[dict] = []

    for link in _links(session, campaign_id):
        profile = session.get(InstagramProfile, link.profile_id)
        if not profile:
            continue
        snapshots = list(
            session.exec(
                select(ProfileSnapshot)
                .where(ProfileSnapshot.profile_id == profile.id, ProfileSnapshot.collected_at >= start_date)
                .order_by(ProfileSnapshot.collected_at.asc())
            ).all()
        )
        daily: dict[str, dict] = {}
        for snapshot in snapshots:
            key = snapshot.collected_at.date().isoformat()
            daily[key] = {
                "date": key,
                "followers": snapshot.followers_count,
                "collected_at": snapshot.collected_at,
            }
        history = list(daily.values())
        current = history[-1]["followers"] if history else None
        first = history[0]["followers"] if history else None
        growth = current - first if current is not None and first is not None else None
        growth_percent = round((growth / first) * 100, 2) if growth is not None and first else None
        profiles.append(
            {
                "profile_id": profile.id,
                "username": profile.username,
                "full_name": profile.full_name,
                "role": link.role,
                "current_followers": current,
                "growth_absolute": growth,
                "growth_percent": growth_percent,
                "days_with_data": len(history),
                "history": history,
            }
        )

    return {
        "campaign": {"id": campaign.id, "name": campaign.name},
        "period": {"requested_days": days, "from": start_date.date().isoformat(), "to": now.date().isoformat()},
        "profiles": profiles,
    }


@router.get("/{campaign_id}/themes-formats")
def themes_formats(campaign_id: int, limit_per_profile: Annotated[int, Query(ge=1, le=200)] = 25, session: Session = Depends(get_session)):
    campaign = _campaign_or_404(session, campaign_id)
    theme_rows: dict[str, list[dict]] = defaultdict(list)
    format_rows: dict[str, list[dict]] = defaultdict(list)

    for link in _links(session, campaign_id):
        profile = session.get(InstagramProfile, link.profile_id)
        if not profile:
            continue
        for post in _latest_posts(session, profile.id, limit_per_profile):
            snapshot = _latest_snapshot(session, post.id)
            if not snapshot:
                continue
            row = {
                "username": profile.username,
                "role": link.role,
                "comments": snapshot.comments_count,
                "likes": snapshot.likes_count,
                "views": snapshot.views_count,
                "plays": snapshot.plays_count,
                "observed": snapshot.interactions_count,
            }
            theme_rows[_theme(post.caption)].append(row)
            format_rows[_format_name(post)].append(row)

    def summarize(groups: dict[str, list[dict]], key_name: str) -> list[dict]:
        result = []
        for name, rows in groups.items():
            def vals(field: str):
                return [r[field] for r in rows if r[field] is not None]
            result.append(
                {
                    key_name: name,
                    "posts": len(rows),
                    "avg_comments": _avg(vals("comments")),
                    "avg_likes": _avg(vals("likes")),
                    "avg_views": _avg(vals("views")),
                    "avg_plays": _avg(vals("plays")),
                    "avg_observed_interactions": _avg(vals("observed")),
                    "likes_coverage": len(vals("likes")),
                }
            )
        return sorted(result, key=lambda x: x["posts"], reverse=True)

    return {
        "campaign": {"id": campaign.id, "name": campaign.name},
        "methodology": {"theme_source": "Classificação determinística do Radar a partir da legenda", "posts_per_profile": limit_per_profile},
        "themes": summarize(theme_rows, "theme"),
        "formats": summarize(format_rows, "format"),
    }


@router.get("/{campaign_id}/time-performance")
def time_performance(campaign_id: int, limit_per_profile: Annotated[int, Query(ge=1, le=200)] = 25, session: Session = Depends(get_session)):
    campaign = _campaign_or_404(session, campaign_id)
    buckets: dict[tuple[int, int], list[dict]] = defaultdict(list)

    for link in _links(session, campaign_id):
        profile = session.get(InstagramProfile, link.profile_id)
        if not profile:
            continue
        for post in _latest_posts(session, profile.id, limit_per_profile):
            dt = _local_dt(post.published_at)
            snapshot = _latest_snapshot(session, post.id)
            if not dt or not snapshot:
                continue
            hour_bucket = (dt.hour // 3) * 3
            buckets[(dt.weekday(), hour_bucket)].append(
                {
                    "comments": snapshot.comments_count,
                    "observed": snapshot.interactions_count,
                    "views": snapshot.views_count,
                    "plays": snapshot.plays_count,
                }
            )

    cells = []
    for (weekday, hour), rows in buckets.items():
        def vals(field: str):
            return [r[field] for r in rows if r[field] is not None]
        cells.append(
            {
                "weekday_index": weekday,
                "weekday": WEEKDAY_PT[weekday],
                "hour": hour,
                "hour_label": f"{hour:02d}h–{(hour + 3) % 24:02d}h",
                "posts": len(rows),
                "avg_observed_interactions": _avg(vals("observed")),
                "avg_comments": _avg(vals("comments")),
                "avg_views": _avg(vals("views")),
                "avg_plays": _avg(vals("plays")),
            }
        )

    def best(field: str):
        valid = [c for c in cells if c.get(field) is not None]
        return max(valid, key=lambda c: c[field]) if valid else None

    return {
        "campaign": {"id": campaign.id, "name": campaign.name},
        "methodology": {"timezone": "America/Sao_Paulo", "bucket_hours": 3, "metric_is_observed_not_causal": True},
        "best_observed_interactions": best("avg_observed_interactions"),
        "best_comments": best("avg_comments"),
        "best_views": best("avg_views"),
        "best_plays": best("avg_plays"),
        "cells": sorted(cells, key=lambda c: (c["weekday_index"], c["hour"])),
    }


@router.get("/{campaign_id}/competitors")
def competitors(campaign_id: int, limit: Annotated[int, Query(ge=1, le=200)] = 25, days: Annotated[int, Query(ge=1, le=365)] = 60, session: Session = Depends(get_session)):
    _campaign_or_404(session, campaign_id)
    benchmark = campaign_benchmark(campaign_id, limit, session)
    followers = followers_history(campaign_id, days, session)
    follower_map = {p["profile_id"]: p for p in followers["profiles"]}
    profiles = []
    for item in benchmark["profiles"]:
        f = follower_map.get(item["profile_id"], {})
        profiles.append({**item, "current_followers": f.get("current_followers"), "growth_absolute": f.get("growth_absolute"), "growth_percent": f.get("growth_percent")})
    return {"campaign": benchmark["campaign"], "profiles": profiles}

@router.get('/{campaign_id}/posts/{post_id}')
def campaign_post_detail(campaign_id: int, post_id: int, session: Session = Depends(get_session), days: int = Query(default=30, ge=1, le=365)):
    post = _campaign_post_or_404(session, campaign_id, post_id)
    link = next((link for link in _links(session, campaign_id) if link.profile_id == post.profile_id), None)
    profile = session.get(InstagramProfile, post.profile_id)
    if not link or not profile:
        raise HTTPException(status_code=404, detail='Publicação não encontrada nesta campanha.')
    period_days = days if isinstance(days, int) else 30
    since = datetime.now(timezone.utc) - timedelta(days=period_days)
    history = session.exec(select(PostSnapshot).where(PostSnapshot.post_id == post_id, PostSnapshot.collected_at >= since).order_by(PostSnapshot.collected_at.desc()).limit(2000)).all()
    return {'post': _post_payload(post, profile, link.role, _latest_snapshot(session, post_id)), 'history': history, 'period_days': period_days, 'comments': read_comment_sample(session, post_id)}


@router.get('/{campaign_id}/posts/{post_id}/thumbnail', summary='Obter prévia persistente da publicação')
def campaign_post_thumbnail(campaign_id: int, post_id: int, session: Session = Depends(get_session)):
    post = _campaign_post_or_404(session, campaign_id, post_id)
    try:
        content, content_type = get_post_preview(post)
    except PreviewUnavailable:
        raise HTTPException(status_code=404, detail='Prévia indisponível para esta publicação.') from None
    return Response(content=content, media_type=content_type, headers={'Cache-Control': 'public, max-age=604800, immutable'})
