from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date, timedelta
from typing import List

from app.database import get_db
from app.auth import get_current_user
from app.models.options import OptionsData
from app.schemas.options import OptionsDataResponse

router = APIRouter()


@router.get("/{ticker}", response_model=List[OptionsDataResponse])
async def get_options_snapshot(
    ticker: str,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    ticker = ticker.upper()
    today = date.today()
    result = await db.execute(
        select(OptionsData)
        .where(OptionsData.ticker == ticker, OptionsData.snapshot_date == today)
        .order_by(OptionsData.expiry_date.asc())
    )
    rows = result.scalars().all()

    # Fallback to latest available snapshot
    if not rows:
        subq = (
            select(OptionsData.snapshot_date)
            .where(OptionsData.ticker == ticker)
            .order_by(OptionsData.snapshot_date.desc())
            .limit(1)
            .scalar_subquery()
        )
        result = await db.execute(
            select(OptionsData)
            .where(OptionsData.ticker == ticker, OptionsData.snapshot_date == subq)
            .order_by(OptionsData.expiry_date.asc())
        )
        rows = result.scalars().all()

    return rows


@router.get("/{ticker}/history", response_model=List[OptionsDataResponse])
async def get_options_history(
    ticker: str,
    days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    ticker = ticker.upper()
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(OptionsData)
        .where(OptionsData.ticker == ticker, OptionsData.snapshot_date >= since)
        .order_by(OptionsData.snapshot_date.desc(), OptionsData.expiry_date.asc())
    )
    return result.scalars().all()
