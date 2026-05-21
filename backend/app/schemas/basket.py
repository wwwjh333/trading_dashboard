from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class BasketCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tickers: List[str] = []
    color: Optional[str] = None


class BasketUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tickers: Optional[List[str]] = None
    color: Optional[str] = None


class BasketResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    tickers: List[str] = []
    color: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BasketPerformanceItem(BaseModel):
    ticker: str
    dates: List[str]
    normalized: List[Optional[float]]
    latest_price: Optional[float]
    change_pct: Optional[float]
    relative_strength: Optional[float]


class BasketPerformanceResponse(BaseModel):
    basket_id: int
    basket_name: str
    days: int
    items: List[BasketPerformanceItem]
