"""Fetch OHLCV price data from yfinance."""
import asyncio
import logging
from datetime import date, timedelta
from typing import List, Optional

import yfinance as yf
import pandas as pd
from tenacity import retry, stop_after_attempt, wait_fixed
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.price import PriceHistory
from app.data.processors.technical import calculate_indicators
from app.data.fetchers.market_utils import is_market_hours, current_et_date

logger = logging.getLogger(__name__)

RATE_LIMIT_DELAY = 1.0


@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def _download_ohlcv(ticker: str, period: str = "6mo") -> Optional[pd.DataFrame]:
    tk = yf.Ticker(ticker)
    df = tk.history(period=period, auto_adjust=True)
    if df.empty:
        return None
    df = df.rename(columns={
        "Open": "open", "High": "high", "Low": "low",
        "Close": "close", "Volume": "volume",
    })
    df.index = pd.to_datetime(df.index).date
    return df[["open", "high", "low", "close", "volume"]]


async def fetch_and_store_prices(tickers: List[str], db: AsyncSession, period: str = "6mo") -> None:
    for ticker in tickers:
        try:
            df = await asyncio.to_thread(_download_ohlcv, ticker, period)
            if df is None:
                logger.warning("No data returned for %s", ticker)
                continue

            df = calculate_indicators(df)
            records = []
            for dt, row in df.iterrows():
                records.append({
                    "ticker": ticker,
                    "date": dt,
                    "open": _safe_float(row.get("open")),
                    "high": _safe_float(row.get("high")),
                    "low": _safe_float(row.get("low")),
                    "close": _safe_float(row.get("close")),
                    "volume": _safe_int(row.get("volume")),
                    "rsi_14": _safe_float(row.get("RSI_14")),
                    "macd": _safe_float(row.get("MACD_12_26_9")),
                    "macd_signal": _safe_float(row.get("MACDs_12_26_9")),
                    "macd_hist": _safe_float(row.get("MACDh_12_26_9")),
                    "bb_upper": _safe_float(row.get("BBU_20_2.0")),
                    "bb_middle": _safe_float(row.get("BBM_20_2.0")),
                    "bb_lower": _safe_float(row.get("BBL_20_2.0")),
                    "sma_50": _safe_float(row.get("SMA_50")),
                    "sma_200": _safe_float(row.get("SMA_200")),
                })

            if records:
                stmt = pg_insert(PriceHistory).values(records)
                stmt = stmt.on_conflict_do_update(
                    constraint="uq_price_ticker_date",
                    set_={
                        "open": stmt.excluded.open,
                        "high": stmt.excluded.high,
                        "low": stmt.excluded.low,
                        "close": stmt.excluded.close,
                        "volume": stmt.excluded.volume,
                        "rsi_14": stmt.excluded.rsi_14,
                        "macd": stmt.excluded.macd,
                        "macd_signal": stmt.excluded.macd_signal,
                        "macd_hist": stmt.excluded.macd_hist,
                        "bb_upper": stmt.excluded.bb_upper,
                        "bb_middle": stmt.excluded.bb_middle,
                        "bb_lower": stmt.excluded.bb_lower,
                        "sma_50": stmt.excluded.sma_50,
                        "sma_200": stmt.excluded.sma_200,
                    },
                )
                await db.execute(stmt)
                await db.commit()
                logger.info("Stored %d price records for %s", len(records), ticker)

        except Exception as exc:
            logger.error("Failed to fetch prices for %s: %s", ticker, exc)
        finally:
            await asyncio.sleep(RATE_LIMIT_DELAY)


def _safe_float(v) -> Optional[float]:
    try:
        if v is None or (isinstance(v, float) and pd.isna(v)):
            return None
        return float(v)
    except Exception:
        return None


def _safe_int(v) -> Optional[int]:
    try:
        if v is None or (isinstance(v, float) and pd.isna(v)):
            return None
        return int(v)
    except Exception:
        return None
