from sqlalchemy import Integer, String, Date, Numeric, DateTime, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class OptionsData(Base):
    __tablename__ = "options_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    snapshot_date: Mapped[Date] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[Date] = mapped_column(Date, nullable=False)
    iv_atm: Mapped[float | None] = mapped_column(Numeric(8, 4))
    iv_rank: Mapped[float | None] = mapped_column(Numeric(8, 4))
    iv_percentile: Mapped[float | None] = mapped_column(Numeric(8, 4))
    put_call_ratio: Mapped[float | None] = mapped_column(Numeric(8, 4))
    implied_move: Mapped[float | None] = mapped_column(Numeric(8, 4))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("ticker", "snapshot_date", "expiry_date", name="uq_options_ticker_date_expiry"),
    )
