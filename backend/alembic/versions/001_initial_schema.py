"""initial schema

Revision ID: 001
Revises: 
Create Date: 2026-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("email", sa.String(100), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "stocks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("name", sa.String(100)),
        sa.Column("sector", sa.String(50)),
        sa.Column("supply_chain_layer", sa.String(50)),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("user_notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ticker"),
    )

    op.create_table(
        "price_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("open", sa.Numeric(12, 4)),
        sa.Column("high", sa.Numeric(12, 4)),
        sa.Column("low", sa.Numeric(12, 4)),
        sa.Column("close", sa.Numeric(12, 4)),
        sa.Column("volume", sa.BigInteger()),
        sa.Column("rsi_14", sa.Numeric(8, 4)),
        sa.Column("macd", sa.Numeric(12, 6)),
        sa.Column("macd_signal", sa.Numeric(12, 6)),
        sa.Column("macd_hist", sa.Numeric(12, 6)),
        sa.Column("bb_upper", sa.Numeric(12, 4)),
        sa.Column("bb_middle", sa.Numeric(12, 4)),
        sa.Column("bb_lower", sa.Numeric(12, 4)),
        sa.Column("sma_50", sa.Numeric(12, 4)),
        sa.Column("sma_200", sa.Numeric(12, 4)),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ticker", "date", name="uq_price_ticker_date"),
    )
    op.create_index("idx_price_ticker_date", "price_history", ["ticker", "date"])

    op.create_table(
        "news",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ticker", sa.String(10)),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("url", sa.Text()),
        sa.Column("source", sa.String(100)),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("raw_content", sa.Text()),
        sa.Column("summary", sa.Text()),
        sa.Column("sentiment", sa.String(10)),
        sa.Column("impact_level", sa.String(10)),
        sa.Column("time_horizon", sa.String(10)),
        sa.Column("key_point", sa.Text()),
        sa.Column("news_hash", sa.String(64), unique=True),
        sa.Column("llm_processed", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_news_ticker_date", "news", ["ticker", "published_at"])

    op.create_table(
        "catalysts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ticker", sa.String(10)),
        sa.Column("catalyst_type", sa.String(30)),
        sa.Column("event_name", sa.String(200)),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("eps_estimate", sa.Numeric(10, 4)),
        sa.Column("revenue_estimate", sa.Numeric(20, 4)),
        sa.Column("implied_move", sa.Numeric(8, 4)),
        sa.Column("user_thesis", sa.Text()),
        sa.Column("actual_eps", sa.Numeric(10, 4)),
        sa.Column("actual_revenue", sa.Numeric(20, 4)),
        sa.Column("price_reaction", sa.Numeric(8, 4)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "options_data",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("expiry_date", sa.Date(), nullable=False),
        sa.Column("iv_atm", sa.Numeric(8, 4)),
        sa.Column("iv_rank", sa.Numeric(8, 4)),
        sa.Column("iv_percentile", sa.Numeric(8, 4)),
        sa.Column("put_call_ratio", sa.Numeric(8, 4)),
        sa.Column("implied_move", sa.Numeric(8, 4)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ticker", "snapshot_date", "expiry_date", name="uq_options_ticker_date_expiry"),
    )

    op.create_table(
        "macro_data",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("indicator", sa.String(50), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("value", sa.Numeric(16, 6)),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("indicator", "date", name="uq_macro_indicator_date"),
    )

    op.create_table(
        "capex_data",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("company", sa.String(20), nullable=False),
        sa.Column("fiscal_quarter", sa.String(10), nullable=False),
        sa.Column("capex_billion", sa.Numeric(10, 2)),
        sa.Column("yoy_growth", sa.Numeric(8, 4)),
        sa.Column("notes", sa.Text()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company", "fiscal_quarter", name="uq_capex_company_quarter"),
    )

    op.create_table(
        "trades",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("direction", sa.String(10), nullable=False),
        sa.Column("instrument", sa.String(10), nullable=False),
        sa.Column("option_strike", sa.Numeric(10, 2)),
        sa.Column("option_expiry", sa.Date()),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("entry_price", sa.Numeric(12, 4), nullable=False),
        sa.Column("position_size", sa.Numeric(12, 4), nullable=False),
        sa.Column("exit_date", sa.Date()),
        sa.Column("exit_price", sa.Numeric(12, 4)),
        sa.Column("pnl", sa.Numeric(12, 4)),
        sa.Column("pnl_pct", sa.Numeric(8, 4)),
        sa.Column("catalyst_type", sa.String(30)),
        sa.Column("thesis", sa.Text(), nullable=False),
        sa.Column("tech_signals", JSONB()),
        sa.Column("macro_context", sa.Text()),
        sa.Column("outcome_notes", sa.Text()),
        sa.Column("lesson", sa.Text()),
        sa.Column("rating", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("trades")
    op.drop_table("capex_data")
    op.drop_table("macro_data")
    op.drop_table("options_data")
    op.drop_table("catalysts")
    op.drop_index("idx_news_ticker_date", table_name="news")
    op.drop_table("news")
    op.drop_index("idx_price_ticker_date", table_name="price_history")
    op.drop_table("price_history")
    op.drop_table("stocks")
    op.drop_table("users")
