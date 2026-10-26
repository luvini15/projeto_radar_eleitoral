"""Add explicit candidate/vice grouping without changing historical profile data."""
from alembic import op
from sqlmodel import SQLModel
from app.models import CampaignSlate, SlateMember
revision = "0006_campaign_slates"
down_revision = "0005_territorial_monitoring"
branch_labels = None
depends_on = None

def upgrade():
    SQLModel.metadata.create_all(op.get_bind(), tables=[CampaignSlate.__table__, SlateMember.__table__], checkfirst=True)

def downgrade():
    # Explicit grouping is user data and must survive a code rollback.
    pass
