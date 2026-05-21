import asyncio
import logging

import yfinance as yf
from fastapi import APIRouter, BackgroundTasks, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date, timedelta
from typing import List

from app.database import get_db, AsyncSessionLocal
from app.auth import get_current_user
from app.models.stock import Stock
from app.models.price import PriceHistory
from app.schemas.stock import StockResponse, StockCreate, PriceHistoryResponse, StockSummaryResponse
from app.data.fetchers.yfinance_fetcher import fetch_and_store_prices
from app.data.fetchers.options_fetcher import fetch_and_store_options
from app.data.fetchers.news_fetcher import _fetch_feed, _rss_url
from app.data.processors.llm_processor import process_news_batch
from app.models.news import News
from sqlalchemy import select as sa_select

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_yf_info(ticker: str) -> dict:
    """Synchronous yfinance info fetch (runs in thread)."""
    try:
        tk = yf.Ticker(ticker)
        info = tk.fast_info
        name = getattr(info, "long_name", None) or ticker
        sector = getattr(info, "sector", None)
        # Validate by checking if there is a recognizable price
        price = getattr(info, "last_price", None) or getattr(info, "regularMarketPrice", None)
        return {"valid": price is not None, "name": name, "sector": sector}
    except Exception:
        return {"valid": False, "name": ticker, "sector": None}


async def _background_fetch_new_ticker(ticker: str) -> None:
    """Fetch price history + news + LLM analysis for a newly added ticker."""
    logger.info("Background init fetch started for %s", ticker)

    # 1. Price history (6 months)
    try:
        async with AsyncSessionLocal() as db:
            await fetch_and_store_prices([ticker], db, period="6mo")
        logger.info("[%s] price fetch done", ticker)
    except Exception as exc:
        logger.error("[%s] price fetch failed: %s", ticker, exc)

    # 2. News: fetch RSS feed for this ticker
    try:
        seen_norm: set = set()
        seen_url: set  = set()
        # Pre-load existing hashes so we don't re-insert what's already in DB
        async with AsyncSessionLocal() as db:
            from datetime import timedelta, timezone
            cutoff = __import__('datetime').datetime.now(timezone.utc) - timedelta(hours=24)
            rows = await db.execute(
                sa_select(News.title_norm_hash, News.url_core_hash)
                .where(News.published_at >= cutoff)
            )
            for nh, uh in rows.fetchall():
                if nh: seen_norm.add(nh)
                if uh: seen_url.add(uh)

        sem = asyncio.Semaphore(1)
        new_count = await _fetch_feed(ticker, _rss_url(ticker), sem, seen_norm, seen_url)
        logger.info("[%s] news fetch done: %d new items", ticker, new_count)
    except Exception as exc:
        logger.error("[%s] news fetch failed: %s", ticker, exc)

    # 3. LLM-process the newly fetched news for this ticker
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                sa_select(News)
                .where(News.ticker == ticker, News.llm_processed == False)  # noqa: E712
                .order_by(News.published_at.desc())
                .limit(50)
            )
            items = result.scalars().all()
            if items:
                batch_input = [{"title": n.title, "content": n.raw_content or ""} for n in items]
                analyses = await process_news_batch(batch_input)
                for item, analysis in zip(items, analyses):
                    if analysis:
                        item.summary      = analysis.get("summary")
                        item.sentiment    = analysis.get("sentiment")
                        item.impact_level = analysis.get("impact_level")
                        item.time_horizon = analysis.get("time_horizon")
                        item.key_point    = analysis.get("key_point")
                    item.llm_processed = True
                    db.add(item)
                await db.commit()
                logger.info("[%s] LLM processed %d news items", ticker, len(items))
    except Exception as exc:
        logger.error("[%s] LLM processing failed: %s", ticker, exc)

    # 4. Options snapshot
    try:
        async with AsyncSessionLocal() as db:
            await fetch_and_store_options([ticker], db)
        logger.info("[%s] options fetch done", ticker)
    except Exception as exc:
        logger.error("[%s] options fetch failed: %s", ticker, exc)

    logger.info("Background init fetch complete for %s", ticker)


@router.post("", response_model=StockResponse, status_code=201)
async def add_stock(
    payload: StockCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    ticker = payload.ticker.upper().strip()

    existing = await db.execute(select(Stock).where(Stock.ticker == ticker))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"{ticker} already in watchlist")

    # Validate and enrich via yfinance (run in thread to avoid blocking event loop)
    info = await asyncio.to_thread(_get_yf_info, ticker)
    if not info["valid"]:
        raise HTTPException(status_code=422, detail=f"无法识别的股票代码: {ticker}，请确认是否正确")

    name = payload.name or info["name"]
    sector = payload.sector or info["sector"]

    stock = Stock(
        ticker=ticker,
        name=name,
        sector=sector,
        supply_chain_layer=payload.supply_chain_layer,
        is_active=True,
        user_notes=payload.user_notes,
    )
    db.add(stock)
    await db.flush()
    await db.refresh(stock)

    # Kick off background price fetch so data is ready shortly after adding
    background_tasks.add_task(_background_fetch_new_ticker, ticker)

    return stock


@router.delete("/{ticker}", status_code=204)
async def remove_stock(
    ticker: str,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    result = await db.execute(select(Stock).where(Stock.ticker == ticker.upper()))
    stock = result.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    await db.delete(stock)


@router.patch("/{ticker}/notes", response_model=StockResponse)
async def update_stock_notes(
    ticker: str,
    notes: dict,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    result = await db.execute(select(Stock).where(Stock.ticker == ticker.upper()))
    stock = result.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    stock.user_notes = notes.get("user_notes", stock.user_notes)
    await db.flush()
    await db.refresh(stock)
    return stock


@router.get("/list", response_model=List[StockResponse])
async def get_stocks(
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    result = await db.execute(select(Stock).where(Stock.is_active == True).order_by(Stock.ticker))  # noqa: E712
    return result.scalars().all()


@router.get("/{ticker}/price", response_model=List[PriceHistoryResponse])
async def get_price_history(
    ticker: str,
    days: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    ticker = ticker.upper()
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(PriceHistory)
        .where(PriceHistory.ticker == ticker, PriceHistory.date >= since)
        .order_by(PriceHistory.date.asc())
    )
    rows = result.scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail=f"No price data for {ticker}")
    return rows


@router.get("/{ticker}/summary", response_model=StockSummaryResponse)
async def get_stock_summary(
    ticker: str,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    ticker = ticker.upper()

    stock_result = await db.execute(select(Stock).where(Stock.ticker == ticker))
    stock = stock_result.scalar_one_or_none()

    price_result = await db.execute(
        select(PriceHistory)
        .where(PriceHistory.ticker == ticker)
        .order_by(PriceHistory.date.desc())
        .limit(2)
    )
    prices = price_result.scalars().all()

    latest_price = None
    price_change_pct = None
    rsi_14 = None
    volume = None

    if prices:
        latest = prices[0]
        latest_price = float(latest.close) if latest.close else None
        rsi_14 = float(latest.rsi_14) if latest.rsi_14 else None
        volume = latest.volume
        if len(prices) >= 2 and prices[1].close and latest.close:
            prev = float(prices[1].close)
            curr = float(latest.close)
            price_change_pct = (curr - prev) / prev * 100

    return StockSummaryResponse(
        ticker=ticker,
        name=stock.name if stock else None,
        sector=stock.sector if stock else None,
        supply_chain_layer=stock.supply_chain_layer if stock else None,
        latest_price=latest_price,
        price_change_pct=price_change_pct,
        rsi_14=rsi_14,
        volume=volume,
        user_notes=stock.user_notes if stock else None,
    )
