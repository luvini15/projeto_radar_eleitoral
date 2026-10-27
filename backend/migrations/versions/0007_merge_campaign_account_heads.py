"""Merge the account isolation and campaign slate migration branches."""

revision = "0007_merge_campaign_account_heads"
down_revision = ("0006_account_data_isolation", "0006_campaign_slates")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
