from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def utc_now():
    return datetime.now(timezone.utc)


class Campaign(SQLModel, table=True):
    __tablename__ = "campaigns"

    id: int | None = Field(default=None, primary_key=True)

    name: str
    slug: str = Field(index=True, unique=True)

    active: bool = True

    created_at: datetime = Field(
        default_factory=utc_now
    )


class InstagramProfile(SQLModel, table=True):
    __tablename__ = "instagram_profiles"

    id: int | None = Field(default=None, primary_key=True)

    instagram_id: str | None = Field(default=None, index=True)

    username: str = Field(
        index=True,
        unique=True,
    )

    full_name: str | None = None

    # Mantemos por enquanto para não quebrar o que já existe.
    # Depois essa informação passa a vir de CampaignProfile.role.
    profile_type: str = "COMPETITOR"

    created_at: datetime = Field(
        default_factory=utc_now
    )


class CampaignProfile(SQLModel, table=True):
    __tablename__ = "campaign_profiles"

    id: int | None = Field(default=None, primary_key=True)

    campaign_id: int = Field(
        foreign_key="campaigns.id",
        index=True,
    )

    profile_id: int = Field(
        foreign_key="instagram_profiles.id",
        index=True,
    )

    role: str
    # CLIENT
    # COMPETITOR
    # LOCAL_PAGE
    # MEDIA

    active: bool = True

    created_at: datetime = Field(
        default_factory=utc_now
    )


class InstagramPost(SQLModel, table=True):
    __tablename__ = "instagram_posts"

    id: int | None = Field(default=None, primary_key=True)

    instagram_id: str | None = Field(
        default=None,
        index=True,
    )

    shortcode: str = Field(
        index=True,
        unique=True,
    )

    profile_id: int = Field(
        foreign_key="instagram_profiles.id",
        index=True,
    )

    url: str

    caption: str | None = None

    content_type: str | None = None
    product_type: str | None = None

    thumbnail_url: str | None = None

    location_name: str | None = None

    paid_partnership: bool | None = None

    comments_disabled: bool | None = None

    published_at: datetime | None = Field(
        default=None,
        index=True,
    )

    created_at: datetime = Field(
        default_factory=utc_now
    )


class PostSnapshot(SQLModel, table=True):
    __tablename__ = "post_snapshots"

    id: int | None = Field(default=None, primary_key=True)

    post_id: int = Field(
        foreign_key="instagram_posts.id",
        index=True,
    )

    likes_count: int | None = None
    comments_count: int | None = None

    shares_count: int | None = None
    saves_count: int | None = None

    views_count: int | None = None
    plays_count: int | None = None

    interactions_count: int | None = None
    interactions_complete: bool = False

    source: str = "APIFY_PUBLIC"

    collected_at: datetime = Field(
        default_factory=utc_now,
        index=True,
    )

class ProfileSnapshot(SQLModel, table=True):
    __tablename__ = "profile_snapshots"

    id: int | None = Field(default=None, primary_key=True)

    profile_id: int = Field(
        foreign_key="instagram_profiles.id",
        index=True,
    )

    followers_count: int | None = None
    following_count: int | None = None
    posts_count: int | None = None

    source: str = "APIFY_PUBLIC"

    collected_at: datetime = Field(
        default_factory=utc_now,
        index=True,
    )


class AdministrativeRegion(SQLModel, table=True):
    __tablename__ = "administrative_regions"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    state: str = Field(default="DF", index=True)
    population: int | None = None
    description: str | None = None
    active: bool = True
    created_at: datetime = Field(default_factory=utc_now)


class ProfileRegion(SQLModel, table=True):
    __tablename__ = "profile_regions"

    id: int | None = Field(default=None, primary_key=True)
    profile_id: int = Field(foreign_key="instagram_profiles.id", index=True, unique=True)
    region_id: int = Field(foreign_key="administrative_regions.id", index=True)
    created_at: datetime = Field(default_factory=utc_now)


class Theme(SQLModel, table=True):
    __tablename__ = "themes"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    description: str | None = None
    active: bool = True
    created_at: datetime = Field(default_factory=utc_now)


class PostTheme(SQLModel, table=True):
    __tablename__ = "post_themes"

    id: int | None = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="instagram_posts.id", index=True, unique=True)
    theme_id: int = Field(foreign_key="themes.id", index=True)
    source: str = "RULES"
    confidence: float | None = None
    reviewed: bool = False
    created_at: datetime = Field(default_factory=utc_now)


class GeneratedReport(SQLModel, table=True):
    __tablename__ = "generated_reports"

    id: int | None = Field(default=None, primary_key=True)
    campaign_id: int = Field(foreign_key="campaigns.id", index=True)
    region_id: int | None = Field(default=None, foreign_key="administrative_regions.id", index=True)
    period_start: datetime = Field(index=True)
    period_end: datetime = Field(index=True)
    report_type: str = Field(index=True)
    status: str = Field(default="GENERATED", index=True)
    html_content: str | None = None
    structured_content: str | None = None
    created_at: datetime = Field(default_factory=utc_now, index=True)


class CollectionRun(SQLModel, table=True):
    __tablename__ = "collection_runs"
    id: int | None = Field(default=None, primary_key=True)
    campaign_id: int = Field(foreign_key="campaigns.id", index=True)
    trigger: str = Field(default="MANUAL", index=True)
    status: str = Field(default="RUNNING", index=True)
    started_at: datetime = Field(default_factory=utc_now, index=True)
    finished_at: datetime | None = Field(default=None, index=True)
    profiles_total: int = 0
    profiles_succeeded: int = 0
    profiles_failed: int = 0
    posts_found: int = 0
    new_posts: int = 0
    post_snapshots_created: int = 0
    followers_updated: int = 0
    errors: str | None = None


class ProfileCollectionRun(SQLModel, table=True):
    __tablename__ = "profile_collection_runs"
    id: int | None = Field(default=None, primary_key=True)
    collection_run_id: int = Field(foreign_key="collection_runs.id", index=True)
    profile_id: int = Field(foreign_key="instagram_profiles.id", index=True)
    status: str = Field(default="RUNNING", index=True)
    started_at: datetime = Field(default_factory=utc_now, index=True)
    finished_at: datetime | None = Field(default=None, index=True)
    posts_found: int = 0
    new_posts: int = 0
    post_snapshots_created: int = 0
    followers_updated: bool = False
    error: str | None = None
