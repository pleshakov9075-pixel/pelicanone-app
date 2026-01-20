"""add job result files

Revision ID: 9b8e2c2b3caa
Revises: 7d1f3d4a3a2b
Create Date: 2026-02-20 12:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "9b8e2c2b3caa"
down_revision = "7d1f3d4a3a2b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "jobs",
        sa.Column("result_files", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.execute("UPDATE jobs SET status='processing' WHERE status='running'")
    op.execute("UPDATE jobs SET status='error' WHERE status='failed'")


def downgrade() -> None:
    op.execute("UPDATE jobs SET status='running' WHERE status='processing'")
    op.execute("UPDATE jobs SET status='failed' WHERE status='error'")
    op.drop_column("jobs", "result_files")
