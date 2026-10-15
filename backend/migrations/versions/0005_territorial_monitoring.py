"""Add territorial attribution and scheduler metadata to existing installations."""
from alembic import op
from sqlmodel import SQLModel
from app import models

revision = "0005_territorial_monitoring"
down_revision = "0004_assistant_conversations"
branch_labels = None
depends_on = None


def upgrade():
    tables = [model.__table__ for model in (
        models.AdministrativeRegion, models.ProfileRegion, models.Theme, models.PostTheme,
        models.GeneratedReport, models.CollectionRun, models.ProfileCollectionRun,
        models.ProfileMonitoring, models.PostRegion, models.SchedulerHeartbeat,
    )]
    SQLModel.metadata.create_all(bind=op.get_bind(), tables=tables, checkfirst=True)


def downgrade():
    # Attribution and audit data must survive an application rollback.
    pass
