from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.integrations.apify import collect_posts, collect_profile
from app.models import CampaignProfile, CollectionRun, InstagramPost, InstagramProfile, PostSnapshot, ProfileCollectionRun, ProfileSnapshot
from app.services.comments import save_comment_sample
from app.services.territorial_detection import classify_post
from app.services.normalizer import normalize_apify_post, normalize_non_negative


def now() -> datetime:
    return datetime.now(timezone.utc)


def upsert_post(session: Session, profile: InstagramProfile, item: dict) -> tuple[InstagramPost, bool]:
    post = session.exec(select(InstagramPost).where(InstagramPost.shortcode == item["shortcode"])).first()
    if post:
        return post, False
    post = InstagramPost(instagram_id=item.get("instagram_id"), shortcode=item["shortcode"], profile_id=profile.id, url=item["url"], caption=item.get("caption"), content_type=item.get("content_type"), product_type=item.get("product_type"), thumbnail_url=item.get("thumbnail_url"), location_name=item.get("location_name"), paid_partnership=item.get("paid_partnership"), comments_disabled=item.get("comments_disabled"), published_at=item.get("published_at"))
    session.add(post); session.flush()
    return post, True


def collect_one_profile(session: Session, profile: InstagramProfile, limit: int) -> dict:
    follower_error = None
    raw_profile = None
    try:
        raw_profile = collect_profile(profile.username)
        if raw_profile:
            session.add(ProfileSnapshot(profile_id=profile.id, followers_count=normalize_non_negative(raw_profile.get("followersCount")), following_count=normalize_non_negative(raw_profile.get("followingCount")), posts_count=normalize_non_negative(raw_profile.get("postsCount")), source="APIFY_PUBLIC"))
            session.flush()
    except Exception as exc:
        follower_error = f"{type(exc).__name__}: falha na coleta de seguidores"

    raw_posts = collect_posts(profile.username, limit)
    new_posts = snapshots = skipped = 0
    for raw in raw_posts:
        item = normalize_apify_post(raw)
        if not item.get("shortcode") or not item.get("url"):
            skipped += 1
            continue
        if item.get("owner_full_name"):
            profile.full_name = item["owner_full_name"]
        if item.get("owner_id"):
            profile.instagram_id = item["owner_id"]
        session.add(profile)
        post, created = upsert_post(session, profile, item)
        classify_post(session, post)
        save_comment_sample(session, post.id, raw, commit=False)
        new_posts += int(created)
        session.add(PostSnapshot(post_id=post.id, likes_count=item.get("likes_count"), comments_count=item.get("comments_count"), shares_count=item.get("shares_count"), saves_count=item.get("saves_count"), views_count=item.get("views_count"), plays_count=item.get("plays_count"), interactions_count=item.get("interactions_count"), interactions_complete=item.get("interactions_complete", False), source=item.get("source", "APIFY_PUBLIC")))
        snapshots += 1
    return {"username": profile.username, "posts_found": len(raw_posts), "new_posts": new_posts, "post_snapshots_created": snapshots, "items_skipped": skipped, "followers_updated": follower_error is None and raw_profile is not None, "follower_error": follower_error}


def _collect_campaign(session: Session, campaign_id: int, limit: int = 25, trigger: str = "MANUAL") -> dict:
    links = list(session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id == campaign_id, CampaignProfile.active == True)).all())  # noqa: E712
    run = CollectionRun(campaign_id=campaign_id, trigger=trigger.upper(), profiles_total=len(links))
    session.add(run); session.commit(); session.refresh(run)
    results, errors = [], []
    for link in links:
        profile = session.get(InstagramProfile, link.profile_id)
        if not profile:
            continue
        detail = ProfileCollectionRun(collection_run_id=run.id, profile_id=profile.id)
        session.add(detail); session.commit(); session.refresh(detail)
        try:
            result = collect_one_profile(session, profile, limit)
            detail.status = "PARTIAL" if result["follower_error"] else "SUCCESS"
            detail.posts_found = result["posts_found"]; detail.new_posts = result["new_posts"]; detail.post_snapshots_created = result["post_snapshots_created"]; detail.followers_updated = result["followers_updated"]
            run.profiles_succeeded += 1; run.posts_found += result["posts_found"]; run.new_posts += result["new_posts"]; run.post_snapshots_created += result["post_snapshots_created"]; run.followers_updated += int(result["followers_updated"])
            if result["follower_error"]:
                detail.error = result["follower_error"]; errors.append(f"@{profile.username}: seguidores indisponíveis")
            results.append({**result, "profile_id": profile.id, "role": link.role, "status": detail.status})
        except Exception as exc:
            session.rollback(); detail = session.get(ProfileCollectionRun, detail.id); run = session.get(CollectionRun, run.id)
            detail.status = "FAILED"; detail.error = f"{type(exc).__name__}: falha na coleta do perfil"; run.profiles_failed += 1
            errors.append(f"@{profile.username}: {type(exc).__name__}"); results.append({"profile_id": profile.id, "username": profile.username, "role": link.role, "status": "FAILED", "error": detail.error})
        detail.finished_at = now(); session.add(detail); session.add(run); session.commit()
    run = session.get(CollectionRun, run.id); run.finished_at = now()
    run.status = "FAILED" if run.profiles_succeeded == 0 and run.profiles_failed else "PARTIAL" if errors else "SUCCESS"
    run.errors = json.dumps(errors, ensure_ascii=False) if errors else None
    session.add(run); session.commit(); session.refresh(run)
    return {"profiles_synced": run.profiles_succeeded, "run_id": run.id, "campaign_id": campaign_id, "status": run.status, "started_at": run.started_at, "finished_at": run.finished_at, "profiles_total": run.profiles_total, "profiles_succeeded": run.profiles_succeeded, "profiles_failed": run.profiles_failed, "posts_found": run.posts_found, "new_posts": run.new_posts, "post_snapshots_created": run.post_snapshots_created, "followers_updated": run.followers_updated, "errors": errors, "posts_requested_per_profile": limit, "results": results}


def collect_campaign(session: Session, campaign_id: int, limit: int = 25, trigger: str = "MANUAL") -> dict:
    from app.services.collection_lock import collection_slot
    with collection_slot(session, campaign_id):
        return _collect_campaign(session, campaign_id, limit, trigger)
