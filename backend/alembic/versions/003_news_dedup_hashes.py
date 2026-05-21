"""add dedup hash columns to news table

Revision ID: 003
Revises: 002
Create Date: 2026-05-21 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("news", sa.Column("title_norm_hash", sa.String(64), nullable=True))
    op.add_column("news", sa.Column("url_core_hash", sa.String(64), nullable=True))
    op.create_index("idx_news_title_norm_hash", "news", ["title_norm_hash"])
    op.create_index("idx_news_url_core_hash", "news", ["url_core_hash"])


def downgrade() -> None:
    op.drop_index("idx_news_url_core_hash", table_name="news")
    op.drop_index("idx_news_title_norm_hash", table_name="news")
    op.drop_column("news", "url_core_hash")
    op.drop_column("news", "title_norm_hash")
