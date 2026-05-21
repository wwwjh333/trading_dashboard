from sqlalchemy import Integer, String, Date, Numeric, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Catalyst(Base):
    __tablename__ = "catalysts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str | None] = mapped_column(String(10))
    catalyst_type: Mapped[str | None] = mapped_column(String(30))
    event_name: Mapped[str | None] = mapped_column(String(200))
    event_date: Mapped[Date] = mapped_column(Date, nullable=False)
    eps_estimate: Mapped[float | None] = mapped_column(Numeric(10, 4))
    revenue_estimate: Mapped[float | None] = mapped_column(Numeric(20, 4))
    implied_move: Mapped[float | None] = mapped_column(Numeric(8, 4))
    user_thesis: Mapped[str | None] = mapped_column(Text)
    actual_eps: Mapped[float | None] = mapped_column(Numeric(10, 4))
    actual_revenue: Mapped[float | None] = mapped_column(Numeric(20, 4))
    price_reaction: Mapped[float | None] = mapped_column(Numeric(8, 4))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
