from app.services.comments import save_comment_sample
from sqlmodel import Session, select

from app.integrations.apify import collect_posts
from app.models import (
    InstagramPost,
    InstagramProfile,
    PostSnapshot,
    ProfileSnapshot,
)
from app.services.normalizer import normalize_apify_post
from app.models import ProfileSnapshot
from app.integrations.apify import collect_profile


def get_or_create_profile(
    session: Session,
    item: dict,
):
    username = item["owner_username"]

    profile = session.exec(
        select(InstagramProfile).where(
            InstagramProfile.username == username
        )
    ).first()

    if profile:
        if item.get("owner_full_name"):
            profile.full_name = item["owner_full_name"]

        if item.get("owner_id"):
            profile.instagram_id = item["owner_id"]

        session.add(profile)
        session.commit()
        session.refresh(profile)

        return profile

    profile = InstagramProfile(
        instagram_id=item.get("owner_id"),
        username=username,
        full_name=item.get("owner_full_name"),
        profile_type=(
            "CLIENT"
            if username == "claudioborcem_"
            else "COMPETITOR"
        ),
    )

    session.add(profile)
    session.commit()
    session.refresh(profile)

    return profile


def get_or_create_post(
    session: Session,
    profile: InstagramProfile,
    item: dict,
):
    post = session.exec(
        select(InstagramPost).where(
            InstagramPost.shortcode
            == item["shortcode"]
        )
    ).first()

    if post:
        post.location_name = item.get("location_name") or post.location_name
        post.location_id = item.get("location_id") or post.location_id
        post.location_lat = item.get("location_lat") if item.get("location_lat") is not None else post.location_lat
        post.location_lng = item.get("location_lng") if item.get("location_lng") is not None else post.location_lng
        session.add(post)
        session.commit()
        session.refresh(post)
        return post, False

    post = InstagramPost(
        instagram_id=item.get("instagram_id"),
        shortcode=item["shortcode"],
        profile_id=profile.id,
        url=item["url"],
        caption=item.get("caption"),
        content_type=item.get("content_type"),
        product_type=item.get("product_type"),
        thumbnail_url=item.get("thumbnail_url"),
        location_name=item.get("location_name"),
        location_id=item.get("location_id"),
        location_lat=item.get("location_lat"),
        location_lng=item.get("location_lng"),
        paid_partnership=item.get(
            "paid_partnership"
        ),
        comments_disabled=item.get(
            "comments_disabled"
        ),
        published_at=item.get("published_at"),
    )

    session.add(post)
    session.commit()
    session.refresh(post)

    return post, True


def create_snapshot(
    session: Session,
    post: InstagramPost,
    item: dict,
):
    snapshot = PostSnapshot(
        post_id=post.id,

        likes_count=item.get("likes_count"),
        comments_count=item.get(
            "comments_count"
        ),

        shares_count=item.get("shares_count"),
        saves_count=item.get("saves_count"),

        views_count=item.get("views_count"),
        plays_count=item.get("plays_count"),

        interactions_count=item.get(
            "interactions_count"
        ),

        interactions_complete=item.get(
            "interactions_complete",
            False,
        ),

        source=item.get(
            "source",
            "APIFY_PUBLIC",
        ),
    )

    session.add(snapshot)


def sync_instagram_profile(
    session: Session,
    username: str,
    limit: int = 25,
):
    raw_posts = collect_posts(
        username=username,
        limit=limit,
    )

    created_posts = 0
    snapshots_created = 0

    for raw_post in raw_posts:
        item = normalize_apify_post(raw_post)

        if not item.get("shortcode"):
            continue

        if not item.get("owner_username"):
            continue

        profile = get_or_create_profile(
            session,
            item,
        )

        post, created = get_or_create_post(
            session,
            profile,
            item,
        )

        save_comment_sample(session, post.id, raw_post)

        if created:
            created_posts += 1

        create_snapshot(
            session,
            post,
            item,
        )

        snapshots_created += 1

    session.commit()

    return {
        "username": username,
        "posts_received": len(raw_posts),
        "posts_created": created_posts,
        "snapshots_created": snapshots_created,
    }

from sqlmodel import Session, select

from app.models import CampaignProfile, InstagramProfile


def sync_campaign(
    session: Session,
    campaign_id: int,
    limit: int = 25,
):
    links = session.exec(
        select(CampaignProfile).where(
            CampaignProfile.campaign_id == campaign_id,
            CampaignProfile.active == True,
        )
    ).all()

    results = []

    for link in links:
        profile = session.get(
            InstagramProfile,
            link.profile_id,
        )

        if not profile:
            continue

        profile_snapshot = sync_profile_snapshot(
            session=session,
            profile=profile,
        )

        result = sync_instagram_profile(
            session=session,
            username=profile.username,
            limit=limit,
        )

        result["role"] = link.role

        result["profile_snapshot"] = {
            "followers_count": (
                profile_snapshot.followers_count
                if profile_snapshot
                else None
            ),
            "following_count": (
                profile_snapshot.following_count
                if profile_snapshot
                else None
            ),
            "posts_count": (
                profile_snapshot.posts_count
                if profile_snapshot
                else None
            ),
            "collected_at": (
                profile_snapshot.collected_at
                if profile_snapshot
                else None
            ),
        }

        results.append(result)

    return {
        "campaign_id": campaign_id,
        "profiles_synced": len(results),
        "posts_requested_per_profile": limit,
        "results": results,
    }

def sync_profile_snapshot(
    session: Session,
    profile: InstagramProfile,
):
    raw = collect_profile(
        profile.username
    )

    if not raw:
        return None

    followers = raw.get("followersCount")
    following = raw.get("followingCount")
    posts_count = raw.get("postsCount")

    snapshot = ProfileSnapshot(
        profile_id=profile.id,
        followers_count=followers,
        following_count=following,
        posts_count=posts_count,
        source="APIFY_PUBLIC",
    )

    session.add(snapshot)
    session.commit()
    session.refresh(snapshot)

    return snapshot
