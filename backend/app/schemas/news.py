from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NewsResponse(BaseModel):
    id: int
    ticker: Optional[str] = None
    title: str
    url: Optional[str] = None
    source: Optional[str] = None
    published_at: Optional[datetime] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    impact_level: Optional[str] = None
    time_horizon: Optional[str] = None
    key_point: Optional[str] = None
    llm_processed: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}
