"""Remove the legacy global Instagram post shortcode index."""
import sqlalchemy as sa
from alembic import op


revision = "0009_drop_post_shortcode_idx"
down_revision = "0008_drop_legacy_username_idx"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    for index in inspector.get_indexes("instagram_posts"):
        if (
            index.get("name") == "ix_instagram_posts_shortcode"
            and index.get("unique")
            and index.get("column_names") == ["shortcode"]
        ):
            op.drop_index(index["name"], table_name="instagram_posts")


def downgrade():
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    index_names = {index.get("name") for index in inspector.get_indexes("instagram_posts")}

    if "ix_instagram_posts_shortcode" not in index_names:
        op.create_index(
            "ix_instagram_posts_shortcode",
            "instagram_posts",
            ["shortcode"],
            unique=True,
        )
