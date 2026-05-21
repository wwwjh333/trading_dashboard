from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class StockBase(BaseModel):
    ticker: str
    name: Optional[str] = None
    sector: Optional[str] = None
    supply_chain_layer: Optional[str] = None
    is_active: bool = True
    user_notes: Optional[str] = None


class StockCreate(StockBase):
    pass


class StockResponse(StockBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PriceHistoryResponse(BaseModel):
    id: int
    ticker: str
    date: date
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    volume: Optional[int] = None
    rsi_14: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None

    model_config = {"from_attributes": True}


class StockSummaryResponse(BaseModel):
    ticker: str
    name: Optional[str] = None
    sector: Optional[str] = None
    supply_chain_layer: Optional[str] = None
    latest_price: Optional[float] = None
    price_change_pct: Optional[float] = None
    rsi_14: Optional[float] = None
    volume: Optional[int] = None
    user_notes: Optional[str] = None
