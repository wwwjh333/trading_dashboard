from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, case
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from app.database import get_db
from app.auth import get_current_user
from app.models.news import News
from app.schemas.news import NewsResponse

router = APIRouter()


@router.get("/latest", response_model=List[NewsResponse])
async def get_latest_news(
    ticker: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    # 24h内的新闻整体优先，两个时间段内部都按重要性→时间排
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    recency_order = case((News.published_at >= cutoff, 0), else_=1)
    impact_order  = case(
        (News.impact_level == 'high',   1),
        (News.impact_level == 'medium', 2),
        (News.impact_level == 'low',    3),
        else_=4,
    )
    query = select(News).where(News.llm_processed == True)  # noqa: E712
    if ticker:
        query = query.where(News.ticker == ticker.upper())
    query = query.order_by(recency_order, impact_order, News.published_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/refresh")
async def refresh_news(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    async def _run():
        from app.data.fetchers.news_fetcher import fetch_and_store_news, process_unprocessed_news
        from app.database import AsyncSessionLocal

        async with AsyncSessionLocal() as session:
            new_count = await fetch_and_store_news(session)
            processed = await process_unprocessed_news(session)
        return new_count, processed

    background_tasks.add_task(_run)
    return {"message": "News refresh triggered"}
