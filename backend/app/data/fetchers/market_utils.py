"""Utilities for market hours and rate limiting."""
from datetime import datetime, time
import pytz

ET = pytz.timezone("America/New_York")

MARKET_OPEN = time(9, 30)
MARKET_CLOSE = time(16, 0)


def is_market_hours() -> bool:
    now_et = datetime.now(ET)
    if now_et.weekday() >= 5:
        return False
    current_time = now_et.time()
    return MARKET_OPEN <= current_time <= MARKET_CLOSE


def current_et_date():
    return datetime.now(ET).date()
