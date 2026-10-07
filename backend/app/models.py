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
class SyncSchedule(SQLModel, table=True):
    __tablename__ = 'sync_schedules'
    campaign_id: int = Field(primary_key=True, foreign_key='campaigns.id')
    next_run_at: datetime
    last_started_at: datetime | None = None
    last_finished_at: datetime | None = None
    status: str = 'waiting'
    error: str | None = None

class PostCommentSample(SQLModel, table=True):
    __tablename__ = 'post_comment_samples'
    post_id: int = Field(primary_key=True, foreign_key='instagram_posts.id')
    texts_json: str = '[]'
    collected_at: datetime = Field(default_factory=utc_now)


class PostAnalysis(SQLModel, table=True):
    __tablename__ = 'post_analyses'
    fingerprint: str = Field(primary_key=True)
    post_id: int = Field(index=True, foreign_key='instagram_posts.id')
    text: str
    model: str
    created_at: datetime = Field(default_factory=utc_now)


class AIUsage(SQLModel, table=True):
    __tablename__ = 'ai_usage'
    day: str = Field(primary_key=True)
    requests: int = 0


class AuthSession(SQLModel, table=True):
    __tablename__ = "auth_sessions"
    id: str = Field(primary_key=True)
    user_id: str = Field(index=True)
    first_seen_at: datetime = Field(default_factory=utc_now)
    last_seen_at: datetime = Field(default_factory=utc_now)
    expired: bool = False


class AppUser(SQLModel, table=True):
    """Application authorization record created on the first valid login."""

    __tablename__ = "app_users"

    id: str = Field(primary_key=True)
    email: str | None = Field(default=None, index=True)
    role: str = "analyst"
    active: bool = True
    created_at: datetime = Field(default_factory=utc_now)


class AssistantConversation(SQLModel, table=True):
    """A saved Data Sight assistant thread owned by one authenticated user."""

    __tablename__ = "assistant_conversations"

    id: str = Field(primary_key=True)
    user_id: str = Field(index=True)
    campaign_id: int = Field(foreign_key="campaigns.id", index=True)
    title: str
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now, index=True)


class AssistantMessage(SQLModel, table=True):
    __tablename__ = "assistant_messages"

    id: int | None = Field(default=None, primary_key=True)
    conversation_id: str = Field(
        foreign_key="assistant_conversations.id",
        index=True,
    )
    role: str
    content: str
    sources_json: str = "[]"
    created_at: datetime = Field(default_factory=utc_now)
