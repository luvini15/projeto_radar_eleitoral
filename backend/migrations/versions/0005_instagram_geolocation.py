"""Store coordinates supplied by Instagram location tags."""
from alembic import op
import sqlalchemy as sa

revision = "0005_instagram_geolocation"
down_revision = "0004_assistant_conversations"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("instagram_posts", sa.Column("location_id", sa.String(), nullable=True))
    op.add_column("instagram_posts", sa.Column("location_lat", sa.Float(), nullable=True))
    op.add_column("instagram_posts", sa.Column("location_lng", sa.Float(), nullable=True))
    op.create_index("ix_instagram_posts_location_id", "instagram_posts", ["location_id"])


def downgrade():
    op.drop_index("ix_instagram_posts_location_id", table_name="instagram_posts")
    op.drop_column("instagram_posts", "location_lng")
    op.drop_column("instagram_posts", "location_lat")
    op.drop_column("instagram_posts", "location_id")
