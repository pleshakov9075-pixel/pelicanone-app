"""update job statuses and add error column

Revision ID: 2f54f5a8c2d1
Revises: bdd7ae07ef89
Create Date: 2026-02-12 10:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "2f54f5a8c2d1"
down_revision = "bdd7ae07ef89"
branch_labels = None
depends_on = None


def _column_exists(table: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = {col["name"] for col in inspector.get_columns(table)}
    return column_name in existing


def upgrade() -> None:
    if not _column_exists("jobs", "error"):
        op.add_column("jobs", sa.Column("error", sa.String(), nullable=True))
    op.execute("UPDATE jobs SET status='done' WHERE status='succeeded'")
    op.execute("UPDATE jobs SET status='failed' WHERE status='canceled'")
    op.execute("CREATE TYPE job_status_new AS ENUM ('queued','running','done','failed')")
    op.execute(
        "ALTER TABLE jobs ALTER COLUMN status TYPE job_status_new USING status::text::job_status_new"
    )
    op.execute("DROP TYPE job_status")
    op.execute("ALTER TYPE job_status_new RENAME TO job_status")


def downgrade() -> None:
    op.execute("CREATE TYPE job_status_old AS ENUM ('queued','running','succeeded','failed','canceled')")
    op.execute("UPDATE jobs SET status='succeeded' WHERE status='done'")
    op.execute(
        "ALTER TABLE jobs ALTER COLUMN status TYPE job_status_old USING status::text::job_status_old"
    )
    op.execute("DROP TYPE job_status")
    op.execute("ALTER TYPE job_status_old RENAME TO job_status")
    if _column_exists("jobs", "error"):
        op.drop_column("jobs", "error")
