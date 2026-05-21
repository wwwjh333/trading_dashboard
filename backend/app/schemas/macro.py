from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class MacroDataResponse(BaseModel):
    id: int
    indicator: str
    date: date
    value: Optional[float] = None

    model_config = {"from_attributes": True}


class MacroLatestResponse(BaseModel):
    indicator: str
    date: date
    value: Optional[float] = None
    change: Optional[float] = None


class CapexDataResponse(BaseModel):
    id: int
    company: str
    fiscal_quarter: str
    capex_billion: Optional[float] = None
    yoy_growth: Optional[float] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}
