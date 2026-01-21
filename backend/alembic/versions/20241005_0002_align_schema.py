"""align_schema

Revision ID: 20241005_0002
Revises: 20240930_0001
Create Date: 2024-10-05 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20241005_0002"
down_revision = "20240930_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("username", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("first_name", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("last_name", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "balance",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
    op.drop_constraint("uq_users_platform_user_id", "users", type_="unique")
    op.create_unique_constraint(
        "uq_users_platform_platform_user_id",
        "users",
        ["platform", "platform_user_id"],
    )

    op.add_column("jobs", sa.Column("result_files", postgresql.JSONB(), nullable=True))

    op.create_table(
        "credit_ledger",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("provider_payment_id", sa.String(length=128), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_credit_ledger_user_id", "credit_ledger", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_credit_ledger_user_id", table_name="credit_ledger")
    op.drop_table("credit_ledger")

    op.drop_column("jobs", "result_files")

    op.drop_constraint("uq_users_platform_platform_user_id", "users", type_="unique")
    op.create_unique_constraint(
        "uq_users_platform_user_id",
        "users",
        ["platform_user_id"],
    )
    op.drop_column("users", "balance")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
    op.drop_column("users", "username")
