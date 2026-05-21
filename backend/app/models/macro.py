from sqlalchemy import Integer, String, Date, Numeric, Text, DateTime, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class MacroData(Base):
    __tablename__ = "macro_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    indicator: Mapped[str] = mapped_column(String(50), nullable=False)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    value: Mapped[float | None] = mapped_column(Numeric(16, 6))

    __table_args__ = (
        UniqueConstraint("indicator", "date", name="uq_macro_indicator_date"),
    )


class CapexData(Base):
    __tablename__ = "capex_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company: Mapped[str] = mapped_column(String(20), nullable=False)
    fiscal_quarter: Mapped[str] = mapped_column(String(10), nullable=False)
    capex_billion: Mapped[float | None] = mapped_column(Numeric(10, 2))
    yoy_growth: Mapped[float | None] = mapped_column(Numeric(8, 4))
    notes: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        UniqueConstraint("company", "fiscal_quarter", name="uq_capex_company_quarter"),
    )
