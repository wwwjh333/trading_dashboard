from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date, timedelta
from typing import List

from app.database import get_db
from app.auth import get_current_user
from app.models.basket import Basket
from app.models.price import PriceHistory
from app.models.user import User
from app.schemas.basket import BasketCreate, BasketUpdate, BasketResponse, BasketPerformanceResponse, BasketPerformanceItem

router = APIRouter()


@router.get("", response_model=List[BasketResponse])
async def get_baskets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Basket)
        .where(Basket.user_id == current_user.id)
        .order_by(Basket.created_at.asc())
    )
    return result.scalars().all()


@router.post("", response_model=BasketResponse, status_code=201)
async def create_basket(
    payload: BasketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    basket = Basket(**payload.model_dump(), user_id=current_user.id)
    db.add(basket)
    await db.flush()
    await db.refresh(basket)
    return basket


@router.put("/{basket_id}", response_model=BasketResponse)
async def update_basket(
    basket_id: int,
    payload: BasketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Basket).where(Basket.id == basket_id, Basket.user_id == current_user.id)
    )
    basket = result.scalar_one_or_none()
    if not basket:
        raise HTTPException(status_code=404, detail="Basket not found")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(basket, field, val)
    await db.flush()
    await db.refresh(basket)
    return basket


@router.delete("/{basket_id}", status_code=204)
async def delete_basket(
    basket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Basket).where(Basket.id == basket_id, Basket.user_id == current_user.id)
    )
    basket = result.scalar_one_or_none()
    if not basket:
        raise HTTPException(status_code=404, detail="Basket not found")
    await db.delete(basket)


@router.get("/{basket_id}/performance", response_model=BasketPerformanceResponse)
async def get_basket_performance(
    basket_id: int,
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Basket).where(Basket.id == basket_id, Basket.user_id == current_user.id)
    )
    basket = result.scalar_one_or_none()
    if not basket:
        raise HTTPException(status_code=404, detail="Basket not found")

    since = date.today() - timedelta(days=days)
    tickers = basket.tickers or []

    price_result = await db.execute(
        select(PriceHistory)
        .where(
            PriceHistory.ticker.in_(tickers),
            PriceHistory.date >= since,
        )
        .order_by(PriceHistory.ticker, PriceHistory.date.asc())
    )
    all_prices = price_result.scalars().all()

    by_ticker: dict[str, list] = {}
    for p in all_prices:
        by_ticker.setdefault(p.ticker, []).append(p)

    items = []
    all_changes = []

    for ticker in tickers:
        rows = by_ticker.get(ticker, [])
        if not rows:
            items.append(BasketPerformanceItem(
                ticker=ticker, dates=[], normalized=[], latest_price=None, change_pct=None, relative_strength=None
            ))
            continue

        base_price = float(rows[0].close) if rows[0].close else None
        dates = [str(r.date) for r in rows]
        normalized = []
        for r in rows:
            c = float(r.close) if r.close else None
            normalized.append(round(c / base_price * 100, 2) if (c and base_price) else None)

        latest = float(rows[-1].close) if rows[-1].close else None
        change_pct = round((latest / base_price - 1) * 100, 2) if (latest and base_price) else None
        if change_pct is not None:
            all_changes.append(change_pct)

        items.append(BasketPerformanceItem(
            ticker=ticker,
            dates=dates,
            normalized=normalized,
            latest_price=latest,
            change_pct=change_pct,
            relative_strength=None,
        ))

    avg_change = sum(all_changes) / len(all_changes) if all_changes else 0
    for item in items:
        if item.change_pct is not None:
            item.relative_strength = round(item.change_pct - avg_change, 2)

    return BasketPerformanceResponse(
        basket_id=basket.id,
        basket_name=basket.name,
        days=days,
        items=items,
    )
