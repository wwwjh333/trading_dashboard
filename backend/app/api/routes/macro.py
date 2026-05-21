from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, timedelta
from typing import List

from app.database import get_db
from app.auth import get_current_user
from app.models.macro import MacroData
from app.schemas.macro import MacroDataResponse, MacroLatestResponse

router = APIRouter()


@router.get("/latest", response_model=List[MacroLatestResponse])
async def get_macro_latest(
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    indicators = ["DGS10", "DGS2", "VIXCLS", "SOX", "DXY", "QQQ", "DFII10"]
    results = []

    for indicator in indicators:
        subq = (
            select(MacroData)
            .where(MacroData.indicator == indicator)
            .order_by(MacroData.date.desc())
            .limit(2)
            .subquery()
        )
        rows_result = await db.execute(
            select(MacroData)
            .where(MacroData.indicator == indicator)
            .order_by(MacroData.date.desc())
            .limit(2)
        )
        rows = rows_result.scalars().all()

        if not rows:
            continue

        latest = rows[0]
        change = None
        if len(rows) >= 2 and rows[1].value is not None and latest.value is not None:
            change = float(latest.value) - float(rows[1].value)

        results.append(
            MacroLatestResponse(
                indicator=latest.indicator,
                date=latest.date,
                value=float(latest.value) if latest.value is not None else None,
                change=change,
            )
        )

    return results


@router.get("/history", response_model=List[MacroDataResponse])
async def get_macro_history(
    indicator: str = Query(..., description="Indicator symbol e.g. DGS10"),
    days: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(MacroData)
        .where(MacroData.indicator == indicator, MacroData.date >= since)
        .order_by(MacroData.date.asc())
    )
    return result.scalars().all()
