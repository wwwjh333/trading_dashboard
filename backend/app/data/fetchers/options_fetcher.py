"""Fetch options data from yfinance: IV, PCR, implied move."""
import asyncio
import logging
from datetime import date
from typing import List, Optional

import yfinance as yf
import numpy as np
from tenacity import retry, stop_after_attempt, wait_fixed
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.options import OptionsData

logger = logging.getLogger(__name__)


@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def _fetch_options_data(ticker: str):
    tk = yf.Ticker(ticker)
    expirations = tk.options
    if not expirations:
        return None, None, None

    current_price = None
    try:
        info = tk.fast_info
        current_price = float(info.last_price)
    except Exception:
        pass

    return tk, expirations[:2], current_price


def _calculate_iv_rank(current_iv: float, iv_history: List[float]) -> Optional[float]:
    if not iv_history or len(iv_history) < 2:
        return None
    min_iv = min(iv_history)
    max_iv = max(iv_history)
    if max_iv == min_iv:
        return 50.0
    return (current_iv - min_iv) / (max_iv - min_iv) * 100


def _calculate_implied_move(atm_call_price: float, atm_put_price: float, stock_price: float) -> Optional[float]:
    if stock_price <= 0:
        return None
    straddle = atm_call_price + atm_put_price
    return (straddle / stock_price) * 100


def _get_atm_options(chain, current_price: float):
    if chain is None or current_price is None:
        return None, None

    strikes = chain.calls["strike"].values
    if len(strikes) == 0:
        return None, None

    atm_strike = min(strikes, key=lambda s: abs(s - current_price))

    call_row = chain.calls[chain.calls["strike"] == atm_strike]
    put_row = chain.puts[chain.puts["strike"] == atm_strike]

    atm_iv = None
    atm_call_price = None
    atm_put_price = None

    if not call_row.empty:
        atm_iv = float(call_row["impliedVolatility"].iloc[0])
        atm_call_price = float(call_row["lastPrice"].iloc[0])
    if not put_row.empty:
        atm_put_price = float(put_row["lastPrice"].iloc[0])

    return atm_iv, (atm_call_price, atm_put_price)


async def fetch_and_store_options(tickers: List[str], db: AsyncSession) -> None:
    today = date.today()

    for ticker in tickers:
        try:
            tk, expirations, current_price = await asyncio.to_thread(_fetch_options_data, ticker)
            if tk is None or not expirations:
                logger.warning("No options data for %s", ticker)
                continue

            records = []
            for expiry_str in expirations:
                try:
                    expiry = date.fromisoformat(expiry_str)
                    chain = tk.option_chain(expiry_str)

                    atm_iv, prices = _get_atm_options(chain, current_price)
                    atm_call_price, atm_put_price = prices if prices else (None, None)

                    impl_move = None
                    if atm_call_price and atm_put_price and current_price:
                        impl_move = _calculate_implied_move(atm_call_price, atm_put_price, current_price)

                    put_call_ratio = None
                    try:
                        total_call_oi = chain.calls["openInterest"].sum()
                        total_put_oi = chain.puts["openInterest"].sum()
                        if total_call_oi > 0:
                            put_call_ratio = float(total_put_oi / total_call_oi)
                    except Exception:
                        pass

                    records.append({
                        "ticker": ticker,
                        "snapshot_date": today,
                        "expiry_date": expiry,
                        "iv_atm": atm_iv,
                        "iv_rank": None,
                        "iv_percentile": None,
                        "put_call_ratio": put_call_ratio,
                        "implied_move": impl_move,
                    })
                except Exception as exc:
                    logger.error("Failed processing expiry %s for %s: %s", expiry_str, ticker, exc)

            if records:
                stmt = pg_insert(OptionsData).values(records)
                stmt = stmt.on_conflict_do_update(
                    constraint="uq_options_ticker_date_expiry",
                    set_={
                        "iv_atm": stmt.excluded.iv_atm,
                        "put_call_ratio": stmt.excluded.put_call_ratio,
                        "implied_move": stmt.excluded.implied_move,
                    },
                )
                await db.execute(stmt)
                await db.commit()
                logger.info("Stored options for %s (%d expirations)", ticker, len(records))

        except Exception as exc:
            logger.error("Options fetch failed for %s: %s", ticker, exc)
        finally:
            await asyncio.sleep(1.0)
