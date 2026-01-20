"""add_user_profile_and_balance

Revision ID: 0a537a709489
Revises: 3c0a2d1c8b57
Create Date: 2026-01-20 22:42:19.996943

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0a537a709489'
down_revision = '3c0a2d1c8b57'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("first_name", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(length=64), nullable=True))
    op.add_column(
        "users",
        sa.Column("balance", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )
    op.execute(
        """
        UPDATE users
        SET balance = COALESCE(
            (SELECT SUM(delta) FROM credit_ledger WHERE credit_ledger.user_id = users.id),
            0
        )
        """
    )


def downgrade() -> None:
    op.drop_column("users", "balance")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
    op.drop_column("users", "username")
