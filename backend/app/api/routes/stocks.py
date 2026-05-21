from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date, timedelta
from typing import List

from app.database import get_db
from app.auth import get_current_user
from app.models.stock import Stock
from app.models.price import PriceHistory
from app.schemas.stock import StockResponse, StockCreate, PriceHistoryResponse, StockSummaryResponse

router = APIRouter()


@router.post("", response_model=StockResponse, status_code=201)
async def add_stock(
    payload: StockCreate,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    existing = await db.execute(select(Stock).where(Stock.ticker == payload.ticker.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"{payload.ticker} already in watchlist")
    stock = Stock(**{**payload.model_dump(), "ticker": payload.ticker.upper()})
    db.add(stock)
    await db.flush()
    await db.refresh(stock)
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
