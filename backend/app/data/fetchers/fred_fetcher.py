"""Fetch macro data from FRED API and yfinance."""
import asyncio
import logging
from datetime import date, timedelta
from typing import Dict, List, Optional

import requests
import yfinance as yf
import pandas as pd
from tenacity import retry, stop_after_attempt, wait_fixed
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.models.macro import MacroData

logger = logging.getLogger(__name__)

FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"

YFINANCE_MAP = {
    "SOX": "^SOX",
    "DXY": "DX-Y.NYB",
}


@retry(stop=stop_after_attempt(3), wait=wait_fixed(5))
def _fetch_fred_series(series_id: str, observation_start: str) -> Optional[pd.DataFrame]:
    if not settings.FRED_API_KEY:
        logger.warning("FRED_API_KEY not configured, skipping %s", series_id)
        return None
    resp = requests.get(
        FRED_BASE,
        params={
            "series_id": series_id,
            "api_key": settings.FRED_API_KEY,
            "file_type": "json",
            "observation_start": observation_start,
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    obs = data.get("observations", [])
    if not obs:
        return None
    rows = []
    for o in obs:
        try:
            rows.append({"date": date.fromisoformat(o["date"]), "value": float(o["value"])})
        except (ValueError, KeyError):
            continue
    return pd.DataFrame(rows) if rows else None


@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def _fetch_yfinance_series(yf_symbol: str, period: str = "1y") -> Optional[pd.DataFrame]:
    tk = yf.Ticker(yf_symbol)
    df = tk.history(period=period, auto_adjust=True)
    if df.empty:
        return None
    rows = [{"date": idx.date(), "value": float(row["Close"])} for idx, row in df.iterrows()]
    return pd.DataFrame(rows)


async def fetch_and_store_macro(db: AsyncSession) -> None:
    start_date = (date.today() - timedelta(days=90)).isoformat()

    fred_indicators = ["DGS10", "DGS2", "VIXCLS", "DFII10"]
    yf_indicators = {"SOX": "^SOX", "DXY": "DX-Y.NYB", "QQQ": "QQQ"}

    all_records: List[Dict] = []

    for indicator in fred_indicators:
        try:
            df = await asyncio.to_thread(_fetch_fred_series, indicator, start_date)
            if df is not None:
                for _, row in df.iterrows():
                    all_records.append({"indicator": indicator, "date": row["date"], "value": row["value"]})
                logger.info("Fetched %d records for FRED %s", len(df), indicator)
        except Exception as exc:
            logger.error("FRED fetch failed for %s: %s", indicator, exc)
        await asyncio.sleep(0.5)

    for indicator, yf_symbol in yf_indicators.items():
        try:
            df = await asyncio.to_thread(_fetch_yfinance_series, yf_symbol)
            if df is not None:
                for _, row in df.iterrows():
                    all_records.append({"indicator": indicator, "date": row["date"], "value": row["value"]})
                logger.info("Fetched %d records for yfinance %s", len(df), indicator)
        except Exception as exc:
            logger.error("yfinance fetch failed for %s: %s", indicator, exc)
        await asyncio.sleep(1.0)

    if all_records:
        stmt = pg_insert(MacroData).values(all_records)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_macro_indicator_date",
            set_={"value": stmt.excluded.value},
        )
        await db.execute(stmt)
        await db.commit()
        logger.info("Stored %d macro records", len(all_records))
