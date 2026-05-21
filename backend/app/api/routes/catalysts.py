from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date, timedelta
from typing import List

from app.database import get_db
from app.auth import get_current_user
from app.models.catalyst import Catalyst
from app.schemas.catalyst import CatalystResponse, CatalystCreate, CatalystThesisUpdate, CatalystResultUpdate

router = APIRouter()


@router.get("/upcoming", response_model=List[CatalystResponse])
async def get_upcoming_catalysts(
    days: int = Query(60, ge=1, le=90),
    lookback: int = Query(30, ge=0, le=60),
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    today = date.today()
    since = today - timedelta(days=lookback)
    until = today + timedelta(days=days)
    result = await db.execute(
        select(Catalyst)
        .where(Catalyst.event_date >= since, Catalyst.event_date <= until)
        .order_by(Catalyst.event_date.asc())
    )
    return result.scalars().all()


@router.get("/{catalyst_id}", response_model=CatalystResponse)
async def get_catalyst(
    catalyst_id: int,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    result = await db.execute(select(Catalyst).where(Catalyst.id == catalyst_id))
    catalyst = result.scalar_one_or_none()
    if not catalyst:
        raise HTTPException(status_code=404, detail="Catalyst not found")
    return catalyst


@router.post("", response_model=CatalystResponse, status_code=201)
async def create_catalyst(
    payload: CatalystCreate,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    catalyst = Catalyst(**payload.model_dump())
    db.add(catalyst)
    await db.flush()
    await db.refresh(catalyst)
    return catalyst


@router.put("/{catalyst_id}/thesis", response_model=CatalystResponse)
async def update_catalyst_thesis(
    catalyst_id: int,
    payload: CatalystThesisUpdate,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    result = await db.execute(select(Catalyst).where(Catalyst.id == catalyst_id))
    catalyst = result.scalar_one_or_none()
    if not catalyst:
        raise HTTPException(status_code=404, detail="Catalyst not found")
    catalyst.user_thesis = payload.user_thesis
    await db.flush()
    await db.refresh(catalyst)
    return catalyst


@router.put("/{catalyst_id}/result", response_model=CatalystResponse)
async def update_catalyst_result(
    catalyst_id: int,
    payload: CatalystResultUpdate,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    result = await db.execute(select(Catalyst).where(Catalyst.id == catalyst_id))
    catalyst = result.scalar_one_or_none()
    if not catalyst:
        raise HTTPException(status_code=404, detail="Catalyst not found")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(catalyst, field, val)
    await db.flush()
    await db.refresh(catalyst)
    return catalyst
