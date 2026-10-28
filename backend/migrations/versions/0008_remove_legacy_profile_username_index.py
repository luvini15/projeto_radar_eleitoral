"""Remove the legacy global Instagram username unique index."""
import sqlalchemy as sa
from alembic import op


revision = "0008_drop_legacy_username_idx"
down_revision = "0007_merge_heads"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    for index in inspector.get_indexes("instagram_profiles"):
        if (
            index.get("name") == "ix_instagram_profiles_username"
            and index.get("unique")
            and index.get("column_names") == ["username"]
        ):
            op.drop_index(index["name"], table_name="instagram_profiles")


def downgrade():
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    index_names = {index.get("name") for index in inspector.get_indexes("instagram_profiles")}

    if "ix_instagram_profiles_username" not in index_names:
        op.create_index(
            "ix_instagram_profiles_username",
            "instagram_profiles",
            ["username"],
            unique=True,
        )
