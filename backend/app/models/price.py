from sqlalchemy import Integer, String, Date, Numeric, BigInteger, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    open: Mapped[float | None] = mapped_column(Numeric(12, 4))
    high: Mapped[float | None] = mapped_column(Numeric(12, 4))
    low: Mapped[float | None] = mapped_column(Numeric(12, 4))
    close: Mapped[float | None] = mapped_column(Numeric(12, 4))
    volume: Mapped[int | None] = mapped_column(BigInteger)
    rsi_14: Mapped[float | None] = mapped_column(Numeric(8, 4))
    macd: Mapped[float | None] = mapped_column(Numeric(12, 6))
    macd_signal: Mapped[float | None] = mapped_column(Numeric(12, 6))
    macd_hist: Mapped[float | None] = mapped_column(Numeric(12, 6))
    bb_upper: Mapped[float | None] = mapped_column(Numeric(12, 4))
    bb_middle: Mapped[float | None] = mapped_column(Numeric(12, 4))
    bb_lower: Mapped[float | None] = mapped_column(Numeric(12, 4))
    sma_50: Mapped[float | None] = mapped_column(Numeric(12, 4))
    sma_200: Mapped[float | None] = mapped_column(Numeric(12, 4))

    __table_args__ = (
        UniqueConstraint("ticker", "date", name="uq_price_ticker_date"),
        Index("idx_price_ticker_date", "ticker", "date"),
    )
