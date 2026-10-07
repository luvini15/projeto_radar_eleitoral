"""Provision application users automatically after Supabase authentication."""
from alembic import op
import sqlalchemy as sa

revision = "0003_app_users"
down_revision = "0002_auth_sessions"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "app_users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("role", sa.String(), nullable=False, server_default="analyst"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_app_users_email", "app_users", ["email"])


def downgrade():
    op.drop_index("ix_app_users_email", table_name="app_users")
    op.drop_table("app_users")
