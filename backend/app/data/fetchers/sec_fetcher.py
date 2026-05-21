"""Fetch earnings calendar from yfinance."""
import asyncio
import logging
from datetime import date, timedelta
from typing import List

import yfinance as yf
from tenacity import retry, stop_after_attempt, wait_fixed
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.catalyst import Catalyst

logger = logging.getLogger(__name__)


@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def _fetch_earnings_dates(ticker: str):
    tk = yf.Ticker(ticker)
    try:
        return tk.earnings_dates
    except Exception:
        return None


async def fetch_and_store_earnings_calendar(tickers: List[str], db: AsyncSession) -> None:
    today = date.today()
    lookback = today - timedelta(days=30)   # 过去 30 天
    lookahead = today + timedelta(days=90)  # 未来 90 天

    for ticker in tickers:
        try:
            df = await asyncio.to_thread(_fetch_earnings_dates, ticker)
            if df is None or df.empty:
                continue

            records = []
            for idx, row in df.iterrows():
                try:
                    event_date = idx.date() if hasattr(idx, "date") else idx
                    if event_date < lookback or event_date > lookahead:
                        continue

                    eps_estimate = None
                    try:
                        eps_estimate = float(row.get("EPS Estimate") or 0) or None
                    except Exception:
                        pass

                    records.append({
                        "ticker": ticker,
                        "catalyst_type": "earnings",
                        "event_name": f"{ticker} Earnings",
                        "event_date": event_date,
                        "eps_estimate": eps_estimate,
                    })
                except Exception as exc:
                    logger.debug("Skipping earnings row for %s: %s", ticker, exc)

            if records:
                stmt = pg_insert(Catalyst).values(records)
                stmt = stmt.on_conflict_do_nothing()
                await db.execute(stmt)
                await db.commit()
                logger.info("Stored %d earnings events for %s", len(records), ticker)

        except Exception as exc:
            logger.error("Earnings fetch failed for %s: %s", ticker, exc)
        finally:
            await asyncio.sleep(1.0)
