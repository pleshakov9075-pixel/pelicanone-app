"""add missing job columns

Revision ID: 7d1f3d4a3a2b
Revises: 2f54f5a8c2d1
Create Date: 2026-02-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "7d1f3d4a3a2b"
down_revision = "2f54f5a8c2d1"
branch_labels = None
depends_on = None


def _add_column_if_missing(table: str, column_name: str, column: sa.Column) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = {col["name"] for col in inspector.get_columns(table)}
    if column_name in existing:
        return False
    op.add_column(table, column)
    return True


def upgrade() -> None:
    added_provider = _add_column_if_missing(
        "jobs",
        "provider",
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="genapi"),
    )
    added_payload = _add_column_if_missing(
        "jobs",
        "payload",
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    added_result = _add_column_if_missing(
        "jobs",
        "result",
        sa.Column("result", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    added_error = _add_column_if_missing(
        "jobs",
        "error",
        sa.Column("error", sa.String(), nullable=True),
    )
    added_cost = _add_column_if_missing(
        "jobs",
        "cost",
        sa.Column("cost", sa.Integer(), nullable=False, server_default="0"),
    )
    added_started_at = _add_column_if_missing(
        "jobs",
        "started_at",
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
    )
    added_finished_at = _add_column_if_missing(
        "jobs",
        "finished_at",
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    added_updated_at = _add_column_if_missing(
        "jobs",
        "updated_at",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )

    if added_provider:
        op.alter_column("jobs", "provider", server_default=None)
    if added_payload:
        op.alter_column("jobs", "payload", server_default=None)
    if added_cost:
        op.alter_column("jobs", "cost", server_default=None)
    if added_updated_at:
        op.alter_column("jobs", "updated_at", server_default=None)

    bind = op.get_bind()
    inspector = inspect(bind)
    existing = {col["name"] for col in inspector.get_columns("jobs")}
    if "provider" in existing:
        op.alter_column("jobs", "provider", type_=sa.String(length=32))
    if "payload" in existing:
        op.alter_column("jobs", "payload", type_=postgresql.JSONB(astext_type=sa.Text()))
    if "result" in existing:
        op.alter_column("jobs", "result", type_=postgresql.JSONB(astext_type=sa.Text()))
    if "error" in existing:
        op.alter_column("jobs", "error", type_=sa.String())
    if "cost" in existing:
        op.alter_column("jobs", "cost", type_=sa.Integer())
    if "started_at" in existing:
        op.alter_column("jobs", "started_at", type_=sa.DateTime(timezone=True))
    if "finished_at" in existing:
        op.alter_column("jobs", "finished_at", type_=sa.DateTime(timezone=True))
    if "updated_at" in existing:
        op.alter_column("jobs", "updated_at", type_=sa.DateTime(timezone=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = {col["name"] for col in inspector.get_columns("jobs")}
    for column_name in (
        "updated_at",
        "finished_at",
        "started_at",
        "cost",
        "error",
        "result",
        "payload",
        "provider",
    ):
        if column_name in existing:
            op.drop_column("jobs", column_name)
