"""Persist listening sources, evidence, recurrence alerts and weekly reports."""
from alembic import op
import sqlalchemy as sa

revision = "0006_territorial_listening"
down_revision = "0005_instagram_geolocation"
branch_labels = None
depends_on = None


def upgrade():
    sources = op.create_table(
        "listening_sources",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("source_type", sa.String(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False, unique=True),
        sa.Column("scope_ra", sa.String(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("official", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_status", sa.String(), nullable=False, server_default="never"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("last_items_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "listening_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_id", sa.Integer(), sa.ForeignKey("listening_sources.id", ondelete="CASCADE"), nullable=False),
        sa.Column("external_id", sa.String(), nullable=False),
        sa.Column("evidence_kind", sa.String(), nullable=False, server_default="NEWS"),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("excerpt", sa.Text(), nullable=False, server_default=""),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ra", sa.String(), nullable=True),
        sa.Column("ra_method", sa.String(), nullable=True),
        sa.Column("topics_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("issue_signal", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("source_id", "external_id", name="uq_listening_item_source_external"),
    )
    op.create_index("ix_listening_items_source_id", "listening_items", ["source_id"])
    op.create_index("ix_listening_items_external_id", "listening_items", ["external_id"])
    op.create_index("ix_listening_items_published_at", "listening_items", ["published_at"])
    op.create_index("ix_listening_items_ra", "listening_items", ["ra"])
    op.create_index("ix_listening_items_collected_at", "listening_items", ["collected_at"])
    op.create_table(
        "listening_alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("fingerprint", sa.String(), nullable=False, unique=True),
        sa.Column("campaign_id", sa.Integer(), sa.ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ra", sa.String(), nullable=False),
        sa.Column("topic", sa.String(), nullable=False),
        sa.Column("window_days", sa.Integer(), nullable=False, server_default="14"),
        sa.Column("evidence_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("source_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="NEW"),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_listening_alerts_fingerprint", "listening_alerts", ["fingerprint"], unique=True)
    op.create_index("ix_listening_alerts_campaign_id", "listening_alerts", ["campaign_id"])
    op.create_table(
        "weekly_evidence_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("campaign_id", sa.Integer(), sa.ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("week_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("week_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("data_json", sa.Text(), nullable=False),
        sa.Column("markdown", sa.Text(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("campaign_id", "week_start", "week_end", name="uq_weekly_report_campaign_period"),
    )
    op.create_index("ix_weekly_evidence_reports_campaign_id", "weekly_evidence_reports", ["campaign_id"])
    op.create_index("ix_weekly_evidence_reports_week_start", "weekly_evidence_reports", ["week_start"])
    op.create_index("ix_weekly_evidence_reports_week_end", "weekly_evidence_reports", ["week_end"])

    op.bulk_insert(sources, [
        {"name": "DF Samambaia", "source_type": "WORDPRESS", "url": "https://dfsamambaia.com.br/wp-json/wp/v2/posts", "scope_ra": "Samambaia", "active": True, "official": False},
        {"name": "DF Taguatinga", "source_type": "WORDPRESS", "url": "https://www.dftaguatinga.com.br/wp-json/wp/v2/posts", "scope_ra": "Taguatinga", "active": True, "official": False},
        {"name": "Noticiário DF", "source_type": "WORDPRESS", "url": "https://noticiariodf.com.br/wp-json/wp/v2/posts", "scope_ra": None, "active": True, "official": False},
        {"name": "OUV-DF · Emater · 2º trimestre de 2026", "source_type": "OUV_CSV", "url": "https://emater.df.gov.br/documents/d/emater/relatorio-de-dados-abertos-entrada-de-manifestacoes-de-ouvidoria-2-trimestre-2026-csv", "scope_ra": None, "active": True, "official": True},
    ])


def downgrade():
    op.drop_index("ix_weekly_evidence_reports_week_end", table_name="weekly_evidence_reports")
    op.drop_index("ix_weekly_evidence_reports_week_start", table_name="weekly_evidence_reports")
    op.drop_index("ix_weekly_evidence_reports_campaign_id", table_name="weekly_evidence_reports")
    op.drop_table("weekly_evidence_reports")
    op.drop_index("ix_listening_alerts_campaign_id", table_name="listening_alerts")
    op.drop_index("ix_listening_alerts_fingerprint", table_name="listening_alerts")
    op.drop_table("listening_alerts")
    op.drop_index("ix_listening_items_collected_at", table_name="listening_items")
    op.drop_index("ix_listening_items_ra", table_name="listening_items")
    op.drop_index("ix_listening_items_published_at", table_name="listening_items")
    op.drop_index("ix_listening_items_external_id", table_name="listening_items")
    op.drop_index("ix_listening_items_source_id", table_name="listening_items")
    op.drop_table("listening_items")
    op.drop_table("listening_sources")
