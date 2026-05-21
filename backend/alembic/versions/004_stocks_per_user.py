"""stocks table per-user isolation

Revision ID: 004
Revises: 003
Create Date: 2026-05-21 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add user_id column (nullable first so existing rows don't break)
    op.add_column("stocks", sa.Column("user_id", sa.Integer(), nullable=True))

    # Assign all existing stocks to user id=1 (the first/only user)
    op.execute("UPDATE stocks SET user_id = 1 WHERE user_id IS NULL")

    # Now make it non-nullable
    op.alter_column("stocks", "user_id", nullable=False)

    # Add FK constraint
    op.create_foreign_key(
        "fk_stocks_user_id", "stocks", "users", ["user_id"], ["id"], ondelete="CASCADE"
    )

    # Drop old global unique constraint on ticker
    op.drop_constraint("stocks_ticker_key", "stocks", type_="unique")

    # Add per-user unique constraint
    op.create_unique_constraint("uq_stock_user_ticker", "stocks", ["user_id", "ticker"])


def downgrade() -> None:
    op.drop_constraint("uq_stock_user_ticker", "stocks", type_="unique")
    op.drop_constraint("fk_stocks_user_id", "stocks", type_="foreignkey")
    op.create_unique_constraint("stocks_ticker_key", "stocks", ["ticker"])
    op.drop_column("stocks", "user_id")
