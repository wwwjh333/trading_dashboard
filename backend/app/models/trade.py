from sqlalchemy import Integer, String, Date, Numeric, Text, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"))
    ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)
    instrument: Mapped[str] = mapped_column(String(10), nullable=False)
    option_strike: Mapped[float | None] = mapped_column(Numeric(10, 2))
    option_expiry: Mapped[Date | None] = mapped_column(Date)
    entry_date: Mapped[Date] = mapped_column(Date, nullable=False)
    entry_price: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    position_size: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    exit_date: Mapped[Date | None] = mapped_column(Date)
    exit_price: Mapped[float | None] = mapped_column(Numeric(12, 4))
    pnl: Mapped[float | None] = mapped_column(Numeric(12, 4))
    pnl_pct: Mapped[float | None] = mapped_column(Numeric(8, 4))
    catalyst_type: Mapped[str | None] = mapped_column(String(30))
    thesis: Mapped[str] = mapped_column(Text, nullable=False)
    tech_signals: Mapped[dict | None] = mapped_column(JSONB)
    macro_context: Mapped[str | None] = mapped_column(Text)
    outcome_notes: Mapped[str | None] = mapped_column(Text)
    lesson: Mapped[str | None] = mapped_column(Text)
    rating: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="trades")
