"""Isolate campaigns and collected Instagram data by application account."""
import os

import sqlalchemy as sa
from alembic import op

revision = "0006_account_data_isolation"
down_revision = "0005_territorial_monitoring"
branch_labels = None
depends_on = None


def _columns(inspector, table: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table)}


def _owner_id(connection) -> str | None:
    configured = os.getenv("CAMPAIGN_OWNER_EMAIL", "").strip().lower()
    if not configured:
        configured = next(
            (email.strip().lower() for email in os.getenv("ADMIN_EMAILS", "").split(",") if email.strip()),
            "",
        )
    if not configured:
        return None
    return connection.execute(
        sa.text("SELECT id FROM app_users WHERE lower(email) = :email ORDER BY created_at LIMIT 1"),
        {"email": configured},
    ).scalar_one_or_none()


def _drop_single_column_unique(inspector, table: str, column: str) -> None:
    for constraint in inspector.get_unique_constraints(table):
        if constraint.get("column_names") == [column] and constraint.get("name"):
            op.drop_constraint(constraint["name"], table, type_="unique")


def upgrade():
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if "owner_user_id" not in _columns(inspector, "campaigns"):
        op.add_column("campaigns", sa.Column("owner_user_id", sa.String(), nullable=True))
        op.create_index("ix_campaigns_owner_user_id", "campaigns", ["owner_user_id"])
    if "owner_user_id" not in _columns(inspector, "instagram_profiles"):
        op.add_column("instagram_profiles", sa.Column("owner_user_id", sa.String(), nullable=True))
        op.create_index("ix_instagram_profiles_owner_user_id", "instagram_profiles", ["owner_user_id"])

    inspector = sa.inspect(connection)
    campaign_foreign_keys = {tuple(item.get("constrained_columns") or []) for item in inspector.get_foreign_keys("campaigns")}
    if ("owner_user_id",) not in campaign_foreign_keys:
        op.create_foreign_key("fk_campaigns_owner_user_id", "campaigns", "app_users", ["owner_user_id"], ["id"])
    profile_foreign_keys = {tuple(item.get("constrained_columns") or []) for item in sa.inspect(connection).get_foreign_keys("instagram_profiles")}
    if ("owner_user_id",) not in profile_foreign_keys:
        op.create_foreign_key("fk_instagram_profiles_owner_user_id", "instagram_profiles", "app_users", ["owner_user_id"], ["id"])

    owner_id = _owner_id(connection)
    legacy_rows = connection.execute(sa.text(
        "SELECT (SELECT count(*) FROM campaigns WHERE owner_user_id IS NULL) + "
        "(SELECT count(*) FROM instagram_profiles WHERE owner_user_id IS NULL)"
    )).scalar_one()
    if legacy_rows and not owner_id:
        raise RuntimeError(
            "Nao foi possivel atribuir os dados existentes. Defina CAMPAIGN_OWNER_EMAIL "
            "com o e-mail da conta DataPath, faca login uma vez e execute a migracao novamente."
        )
    if owner_id:
        connection.execute(sa.text("UPDATE campaigns SET owner_user_id = :owner WHERE owner_user_id IS NULL"), {"owner": owner_id})
        connection.execute(sa.text("UPDATE instagram_profiles SET owner_user_id = :owner WHERE owner_user_id IS NULL"), {"owner": owner_id})

    inspector = sa.inspect(connection)
    _drop_single_column_unique(inspector, "campaigns", "slug")
    _drop_single_column_unique(inspector, "instagram_profiles", "username")
    _drop_single_column_unique(inspector, "instagram_posts", "shortcode")

    existing = {item["name"] for item in sa.inspect(connection).get_unique_constraints("campaigns")}
    if "uq_campaign_owner_slug" not in existing:
        op.create_unique_constraint("uq_campaign_owner_slug", "campaigns", ["owner_user_id", "slug"])
    existing = {item["name"] for item in sa.inspect(connection).get_unique_constraints("instagram_profiles")}
    if "uq_instagram_profile_owner_username" not in existing:
        op.create_unique_constraint("uq_instagram_profile_owner_username", "instagram_profiles", ["owner_user_id", "username"])
    existing = {item["name"] for item in sa.inspect(connection).get_unique_constraints("instagram_posts")}
    if "uq_instagram_post_profile_shortcode" not in existing:
        op.create_unique_constraint("uq_instagram_post_profile_shortcode", "instagram_posts", ["profile_id", "shortcode"])

    op.alter_column("campaigns", "owner_user_id", existing_type=sa.String(), nullable=False)
    op.alter_column("instagram_profiles", "owner_user_id", existing_type=sa.String(), nullable=False)


def downgrade():
    # Account ownership must survive application rollback to avoid exposing data.
    pass
