from sqlalchemy import Integer, String, Boolean, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Stock(Base):
    __tablename__ = "stocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(100))
    sector: Mapped[str | None] = mapped_column(String(50))
    supply_chain_layer: Mapped[str | None] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    user_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
