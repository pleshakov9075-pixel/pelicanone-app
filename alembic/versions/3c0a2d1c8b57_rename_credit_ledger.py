"""rename credit ledger table

Revision ID: 3c0a2d1c8b57
Revises: 7d1f3d4a3a2b
Create Date: 2026-02-25 10:00:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "3c0a2d1c8b57"
down_revision = "7d1f3d4a3a2b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.rename_table("credit_tx", "credit_ledger")
    op.drop_index("ix_credit_tx_user_id", table_name="credit_ledger")
    op.create_index(op.f("ix_credit_ledger_user_id"), "credit_ledger", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_credit_ledger_user_id"), table_name="credit_ledger")
    op.create_index("ix_credit_tx_user_id", "credit_ledger", ["user_id"], unique=False)
    op.rename_table("credit_ledger", "credit_tx")
