"""Initial schema for a fresh installation.

Existing installations created with SQLModel.create_all must be backed up and
stamped with this revision, not upgraded through it.
"""
from alembic import op
from sqlmodel import SQLModel
from app import models  # noqa: F401

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    later_tables = {"auth_sessions", "app_users", "assistant_conversations", "assistant_messages"}
    baseline_tables = [table for table in SQLModel.metadata.sorted_tables if table.name not in later_tables]
    SQLModel.metadata.create_all(bind=op.get_bind(), tables=baseline_tables)

def downgrade():
    later_tables = {"auth_sessions", "app_users", "assistant_conversations", "assistant_messages"}
    baseline_tables = [table for table in SQLModel.metadata.sorted_tables if table.name not in later_tables]
    SQLModel.metadata.drop_all(bind=op.get_bind(), tables=baseline_tables)
