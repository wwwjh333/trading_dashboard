"""Calculate technical indicators using pandas-ta."""
import logging
import pandas as pd
import pandas_ta as ta

logger = logging.getLogger(__name__)


def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Expects df with columns: open, high, low, close, volume.
    Returns df with appended indicator columns.
    """
    if df.empty or len(df) < 5:
        return df

    df = df.copy()

    # Normalize column names for pandas-ta
    df.columns = [c.lower() for c in df.columns]

    try:
        df.ta.rsi(length=14, append=True)
    except Exception as e:
        logger.debug("RSI calculation failed: %s", e)

    try:
        df.ta.macd(fast=12, slow=26, signal=9, append=True)
    except Exception as e:
        logger.debug("MACD calculation failed: %s", e)

    try:
        df.ta.bbands(length=20, std=2, append=True)
    except Exception as e:
        logger.debug("BB calculation failed: %s", e)

    try:
        df.ta.sma(length=50, append=True)
    except Exception as e:
        logger.debug("SMA50 calculation failed: %s", e)

    try:
        df.ta.sma(length=200, append=True)
    except Exception as e:
        logger.debug("SMA200 calculation failed: %s", e)

    return df


def calculate_iv_rank(current_iv: float, iv_history_1yr: list) -> float:
    """IV Rank = (current - min) / (max - min) * 100"""
    if not iv_history_1yr:
        return 0.0
    min_iv = min(iv_history_1yr)
    max_iv = max(iv_history_1yr)
    if max_iv == min_iv:
        return 50.0
    return (current_iv - min_iv) / (max_iv - min_iv) * 100
