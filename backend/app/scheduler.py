"""APScheduler configuration and task registration."""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="America/New_York")


async def job_fetch_prices():
    from app.data.fetchers.yfinance_fetcher import fetch_and_store_prices
    from app.data.fetchers.market_utils import is_market_hours

    if not is_market_hours():
        logger.debug("Outside market hours, skipping price fetch")
        return

    all_tickers = list(dict.fromkeys(
        settings.WATCH_TICKERS + settings.INDUSTRY_TICKERS
    ))
    async with AsyncSessionLocal() as db:
        try:
            await fetch_and_store_prices(all_tickers, db, period="5d")
        except Exception as exc:
            logger.error("Price fetch failed: %s", exc)


async def job_fetch_macro():
    from app.data.fetchers.fred_fetcher import fetch_and_store_macro

    async with AsyncSessionLocal() as db:
        try:
            await fetch_and_store_macro(db)
        except Exception as exc:
            logger.error("Macro fetch failed: %s", exc)


async def job_fetch_news():
    from app.data.fetchers.news_fetcher import fetch_and_store_news, process_unprocessed_news

    async with AsyncSessionLocal() as db:
        try:
            new = await fetch_and_store_news(db)
            logger.info("Fetched %d new news items", new)
        except Exception as exc:
            logger.error("News fetch failed: %s", exc)

    # 新闻抓完后立即全量处理，直到积压清零
    async with AsyncSessionLocal() as db:
        try:
            processed = await process_unprocessed_news(db)
            logger.info("LLM processed %d news items (all clear)", processed)
        except Exception as exc:
            logger.error("LLM processing failed: %s", exc)


async def _get_active_tickers() -> list[str]:
    """Read active watchlist tickers from DB (falls back to config if DB is empty)."""
    from app.models.stock import Stock
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Stock.ticker).where(Stock.is_active == True))  # noqa: E712
        tickers = [row[0] for row in result.fetchall()]
    return tickers or settings.WATCH_TICKERS


async def job_fetch_options():
    """Fetch options during market hours (every hour) + once at 4:30 PM close snapshot."""
    from app.data.fetchers.options_fetcher import fetch_and_store_options

    tickers = await _get_active_tickers()
    async with AsyncSessionLocal() as db:
        try:
            await fetch_and_store_options(tickers, db)
        except Exception as exc:
            logger.error("Options fetch failed: %s", exc)


async def job_fetch_earnings():
    from app.data.fetchers.sec_fetcher import fetch_and_store_earnings_calendar

    tickers = await _get_active_tickers()
    async with AsyncSessionLocal() as db:
        try:
            await fetch_and_store_earnings_calendar(tickers, db)
        except Exception as exc:
            logger.error("Earnings calendar fetch failed: %s", exc)


def start_scheduler():
    # Price data: every 15 min, market hours Mon-Fri
    scheduler.add_job(
        job_fetch_prices,
        CronTrigger(minute="*/15", hour="9-16", day_of_week="mon-fri"),
        id="fetch_prices",
        replace_existing=True,
        misfire_grace_time=60,
    )

    # Macro data: daily at 8:00 AM ET
    scheduler.add_job(
        job_fetch_macro,
        CronTrigger(hour=8, minute=0),
        id="fetch_macro",
        replace_existing=True,
    )

    # News: every 30 minutes
    scheduler.add_job(
        job_fetch_news,
        CronTrigger(minute="*/30"),
        id="fetch_news",
        replace_existing=True,
    )

    # Options: every hour during market hours + 4:30 PM closing snapshot
    scheduler.add_job(
        job_fetch_options,
        CronTrigger(minute=0, hour="9-16", day_of_week="mon-fri"),
        id="fetch_options",
        replace_existing=True,
    )
    scheduler.add_job(
        job_fetch_options,
        CronTrigger(hour=16, minute=30, day_of_week="mon-fri"),
        id="fetch_options_close",
        replace_existing=True,
    )

    # Earnings calendar: daily at 7:00 AM ET
    scheduler.add_job(
        job_fetch_earnings,
        CronTrigger(hour=7, minute=0),
        id="fetch_earnings",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started with %d jobs", len(scheduler.get_jobs()))


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler shut down")
