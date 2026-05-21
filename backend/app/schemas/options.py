from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class OptionsDataResponse(BaseModel):
    id: int
    ticker: str
    snapshot_date: date
    expiry_date: date
    iv_atm: Optional[float] = None
    iv_rank: Optional[float] = None
    iv_percentile: Optional[float] = None
    put_call_ratio: Optional[float] = None
    implied_move: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}
