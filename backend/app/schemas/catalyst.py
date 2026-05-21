from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class CatalystBase(BaseModel):
    ticker: Optional[str] = None
    catalyst_type: Optional[str] = None
    event_name: Optional[str] = None
    event_date: date
    eps_estimate: Optional[float] = None
    revenue_estimate: Optional[float] = None
    implied_move: Optional[float] = None
    user_thesis: Optional[str] = None


class CatalystCreate(CatalystBase):
    pass


class CatalystThesisUpdate(BaseModel):
    user_thesis: str


class CatalystResultUpdate(BaseModel):
    actual_eps: Optional[float] = None
    actual_revenue: Optional[float] = None
    price_reaction: Optional[float] = None


class CatalystResponse(CatalystBase):
    id: int
    actual_eps: Optional[float] = None
    actual_revenue: Optional[float] = None
    price_reaction: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
