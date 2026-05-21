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
    news_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    llm_processed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_news_ticker_date", "ticker", "published_at"),
    )
