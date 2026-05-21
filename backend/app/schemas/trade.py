from pydantic import BaseModel, field_validator
from datetime import date, datetime
from typing import Optional, List, Any


class TradeCreate(BaseModel):
    ticker: str
    direction: str
    instrument: str
    option_strike: Optional[float] = None
    option_expiry: Optional[date] = None
    entry_date: date
    entry_price: float
    position_size: float
    catalyst_type: Optional[str] = None
    thesis: str
    tech_signals: Optional[List[str]] = None
    macro_context: Optional[str] = None

    @field_validator("direction")
    @classmethod
    def validate_direction(cls, v: str) -> str:
        if v not in ("long", "short"):
            raise ValueError("direction must be 'long' or 'short'")
        return v

    @field_validator("instrument")
    @classmethod
    def validate_instrument(cls, v: str) -> str:
        if v not in ("stock", "call", "put"):
            raise ValueError("instrument must be 'stock', 'call', or 'put'")
        return v


class TradeUpdate(BaseModel):
    exit_date: Optional[date] = None
    exit_price: Optional[float] = None
    outcome_notes: Optional[str] = None
    lesson: Optional[str] = None
    rating: Optional[int] = None
    thesis: Optional[str] = None
    macro_context: Optional[str] = None
    tech_signals: Optional[List[str]] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("rating must be between 1 and 5")
        return v


class TradeResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    ticker: str
    direction: str
    instrument: str
    option_strike: Optional[float] = None
    option_expiry: Optional[date] = None
    entry_date: date
    entry_price: float
    position_size: float
    exit_date: Optional[date] = None
    exit_price: Optional[float] = None
    pnl: Optional[float] = None
    pnl_pct: Optional[float] = None
    catalyst_type: Optional[str] = None
    thesis: str
    tech_signals: Optional[Any] = None
    macro_context: Optional[str] = None
    outcome_notes: Optional[str] = None
    lesson: Optional[str] = None
    rating: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TradeStatsResponse(BaseModel):
    total_trades: int
    open_trades: int
    closed_trades: int
    win_rate: Optional[float] = None
    avg_pnl: Optional[float] = None
    total_pnl: Optional[float] = None
    best_trade_pnl: Optional[float] = None
    worst_trade_pnl: Optional[float] = None
    avg_rating: Optional[float] = None


class AuthRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
