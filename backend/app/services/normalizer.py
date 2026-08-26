from datetime import datetime


def normalize_non_negative(value):
    if isinstance(value, (int, float)) and value >= 0:
        return int(value)

    return None


def parse_datetime(value):
    if not value:
        return None

    return datetime.fromisoformat(
        value.replace("Z", "+00:00")
    )


def calculate_interactions(
    likes,
    comments,
    shares,
    saves,
):
    components = [
        likes,
        comments,
        shares,
        saves,
    ]

    available = [
        value
        for value in components
        if value is not None
    ]

    if not available:
        return None, False

    interactions = sum(available)

    complete = all(
        value is not None
        for value in components
    )

    return interactions, complete


def normalize_apify_post(item: dict):
    likes = normalize_non_negative(
        item.get("likesCount")
    )

    comments = normalize_non_negative(
        item.get("commentsCount")
    )

    shares = normalize_non_negative(
        item.get("sharesCount")
    )

    saves = normalize_non_negative(
        item.get("savesCount")
    )

    views = normalize_non_negative(
        item.get("videoViewCount")
    )

    plays = normalize_non_negative(
        item.get("videoPlayCount")
    )

    interactions, interactions_complete = (
        calculate_interactions(
            likes,
            comments,
            shares,
            saves,
        )
    )

    return {
        "instagram_id": item.get("id"),

        "shortcode": item.get("shortCode"),

        "owner_id": item.get("ownerId"),
        "owner_username": item.get("ownerUsername"),
        "owner_full_name": item.get("ownerFullName"),

        "url": item.get("url"),
        "caption": item.get("caption") or None,

        "content_type": item.get("type"),
        "product_type": item.get("productType"),

        "thumbnail_url": item.get("displayUrl"),

        "location_name": item.get("locationName"),

        "paid_partnership": item.get("paidPartnership"),

        "comments_disabled": item.get(
            "isCommentsDisabled"
        ),

        "published_at": parse_datetime(
            item.get("timestamp")
        ),

        "likes_count": likes,
        "comments_count": comments,
        "shares_count": shares,
        "saves_count": saves,
        "views_count": views,
        "plays_count": plays,

        "interactions_count": interactions,
        "interactions_complete": interactions_complete,

        "source": "APIFY_PUBLIC",
    }