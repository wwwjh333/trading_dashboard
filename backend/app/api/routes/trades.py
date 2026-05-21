from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from app.database import get_db
from app.auth import get_current_user
from app.models.trade import Trade
from app.models.user import User
from app.schemas.trade import TradeCreate, TradeUpdate, TradeResponse, TradeStatsResponse

router = APIRouter()


def _calculate_pnl(trade: Trade) -> None:
    if trade.exit_price is not None and trade.entry_price is not None:
        entry = float(trade.entry_price)
        exit_p = float(trade.exit_price)
        size = float(trade.position_size)
        if trade.direction == "long":
            trade.pnl = (exit_p - entry) * size
        else:
            trade.pnl = (entry - exit_p) * size
        if entry > 0:
            trade.pnl_pct = (trade.pnl / (entry * size)) * 100


@router.get("/stats", response_model=TradeStatsResponse)
async def get_trade_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Trade).where(Trade.user_id == current_user.id)
    )
    trades = result.scalars().all()

    total = len(trades)
    closed = [t for t in trades if t.exit_date is not None]
    open_trades = total - len(closed)

    winning = [t for t in closed if t.pnl is not None and float(t.pnl) > 0]
    win_rate = (len(winning) / len(closed) * 100) if closed else None

    pnls = [float(t.pnl) for t in closed if t.pnl is not None]
    total_pnl = sum(pnls) if pnls else None
    avg_pnl = sum(pnls) / len(pnls) if pnls else None
    best = max(pnls) if pnls else None
    worst = min(pnls) if pnls else None

    ratings = [t.rating for t in trades if t.rating is not None]
    avg_rating = sum(ratings) / len(ratings) if ratings else None

    return TradeStatsResponse(
        total_trades=total,
        open_trades=open_trades,
        closed_trades=len(closed),
        win_rate=win_rate,
        avg_pnl=avg_pnl,
        total_pnl=total_pnl,
        best_trade_pnl=best,
        worst_trade_pnl=worst,
        avg_rating=avg_rating,
    )


@router.get("", response_model=List[TradeResponse])
async def get_trades(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Trade)
        .where(Trade.user_id == current_user.id)
        .order_by(Trade.entry_date.desc())
    )
    return result.scalars().all()


@router.post("", response_model=TradeResponse, status_code=201)
async def create_trade(
    payload: TradeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = Trade(**payload.model_dump(), user_id=current_user.id)
    _calculate_pnl(trade)
    db.add(trade)
    await db.flush()
    await db.refresh(trade)
    return trade


@router.put("/{trade_id}", response_model=TradeResponse)
async def update_trade(
    trade_id: int,
    payload: TradeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Trade).where(Trade.id == trade_id, Trade.user_id == current_user.id)
    )
    trade = result.scalar_one_or_none()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(trade, field, val)

    _calculate_pnl(trade)
    await db.flush()
    await db.refresh(trade)
    return trade


@router.delete("/{trade_id}", status_code=204)
async def delete_trade(
    trade_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Trade).where(Trade.id == trade_id, Trade.user_id == current_user.id)
    )
    trade = result.scalar_one_or_none()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    await db.delete(trade)
