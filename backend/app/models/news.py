from sqlalchemy import Integer, String, Text, Boolean, DateTime, func, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class News(Base):
    __tablename__ = "news"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str | None] = mapped_column(String(10))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(String(100))
    published_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    raw_content: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    sentiment: Mapped[str | None] = mapped_column(String(10))
    impact_level: Mapped[str | None] = mapped_column(String(10))
    time_horizon: Mapped[str | None] = mapped_column(String(10))
    key_point: Mapped[str | None] = mapped_column(Text)
    # Exact-match dedup: SHA256(title + published_at)
    news_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    # Normalised-title dedup: SHA256(normalised_title) — catches same-event different-source
    title_norm_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # URL-core dedup: SHA256(url without query string) — catches Yahoo Finance cross-ticker dupes
    url_core_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    llm_processed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_news_ticker_date", "ticker", "published_at"),
        Index("idx_news_title_norm_hash", "title_norm_hash"),
        Index("idx_news_url_core_hash", "url_core_hash"),
    )
