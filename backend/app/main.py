from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import create_tables, AsyncSessionLocal
from app.scheduler import start_scheduler, shutdown_scheduler

from app.api.routes import macro, stocks, news, options, catalysts, trades, auth, industry, baskets

logger = logging.getLogger(__name__)


async def initial_data_fetch():
    """在启动时初始化股票列表并拉取一次历史数据（如果数据库为空）。"""
    from app.data.fetchers.yfinance_fetcher import fetch_and_store_prices
    from app.data.fetchers.fred_fetcher import fetch_and_store_macro
    from app.data.fetchers.news_fetcher import fetch_and_store_news
    from app.data.fetchers.options_fetcher import fetch_and_store_options
    from app.models.stock import Stock
    from sqlalchemy import text, select
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    # 1. 确保默认 watchlist 已写入 stocks 表
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Stock))
            existing = {s.ticker for s in result.scalars().all()}
            to_add = [t for t in settings.WATCH_TICKERS if t not in existing]
            if to_add:
                # Seed default tickers for user_id=1 (first registered user)
                stmt = pg_insert(Stock).values([
                    {"ticker": t, "user_id": 1, "is_active": True} for t in to_add
                ]).on_conflict_do_nothing(index_elements=["user_id", "ticker"])
                await db.execute(stmt)
                await db.commit()
                logger.info("初始化 %d 个默认股票到 watchlist: %s", len(to_add), to_add)
        except Exception as exc:
            logger.error("初始化 stocks 失败: %s", exc)

    # 2. 拉取价格（空库时抓 90 天，含行业全景额外 ticker）
    all_price_tickers = list(dict.fromkeys(
        settings.WATCH_TICKERS + settings.INDUSTRY_TICKERS
    ))
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(text("SELECT COUNT(*) FROM price_history"))
            count = result.scalar()
            if count == 0:
                logger.info("数据库为空，开始拉取初始历史数据...")
                await fetch_and_store_prices(all_price_tickers, db, period="90d")
                logger.info("历史价格数据拉取完成")
            else:
                # 补全行业全景中缺失的 ticker
                missing_result = await db.execute(
                    text("SELECT DISTINCT ticker FROM price_history")
                )
                existing = {r[0] for r in missing_result.fetchall()}
                missing = [t for t in settings.INDUSTRY_TICKERS if t not in existing]
                if missing:
                    logger.info("补全行业全景缺失价格数据: %s", missing)
                    await fetch_and_store_prices(missing, db, period="90d")
                else:
                    logger.info("数据库已有 %d 条价格记录，跳过初始拉取", count)
        except Exception as exc:
            logger.error("初始数据拉取失败: %s", exc)

    async with AsyncSessionLocal() as db:
        try:
            await fetch_and_store_macro(db)
            logger.info("宏观数据拉取完成")
        except Exception as exc:
            logger.error("宏观数据拉取失败: %s", exc)

    async with AsyncSessionLocal() as db:
        try:
            await fetch_and_store_news(db)
            logger.info("新闻数据拉取完成")
        except Exception as exc:
            logger.error("新闻数据拉取失败: %s", exc)

    # 4. 期权数据（启动时无论市场是否开盘都抓一次，用 DB 里的动态 watchlist）
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Stock).where(Stock.is_active == True))  # noqa: E712
            db_tickers = [s.ticker for s in result.scalars().all()]
            tickers_to_fetch = db_tickers or settings.WATCH_TICKERS
            await fetch_and_store_options(tickers_to_fetch, db)
            logger.info("期权数据拉取完成")
        except Exception as exc:
            logger.error("期权数据拉取失败: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    start_scheduler()
    import asyncio
    asyncio.create_task(initial_data_fetch())
    yield
    shutdown_scheduler()


app = FastAPI(
    title="Trading Dashboard API",
    description="个人股票交易研究与日志管理平台",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(macro.router, prefix="/api/macro", tags=["macro"])
app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(news.router, prefix="/api/news", tags=["news"])
app.include_router(options.router, prefix="/api/options", tags=["options"])
app.include_router(catalysts.router, prefix="/api/catalysts", tags=["catalysts"])
app.include_router(trades.router, prefix="/api/trades", tags=["trades"])
app.include_router(industry.router, prefix="/api/industry", tags=["industry"])
app.include_router(baskets.router, prefix="/api/baskets", tags=["baskets"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/admin/refresh", tags=["admin"])
async def manual_refresh(background_tasks: BackgroundTasks):
    """手动触发全量数据刷新（价格90天、宏观、新闻）。"""
    async def _run():
        from app.data.fetchers.yfinance_fetcher import fetch_and_store_prices
        from app.data.fetchers.fred_fetcher import fetch_and_store_macro
        from app.data.fetchers.news_fetcher import fetch_and_store_news

        async with AsyncSessionLocal() as db:
            await fetch_and_store_prices(settings.WATCH_TICKERS, db, period="90d")
        async with AsyncSessionLocal() as db:
            await fetch_and_store_macro(db)
        async with AsyncSessionLocal() as db:
            await fetch_and_store_news(db)
        logger.info("手动数据刷新完成")

    background_tasks.add_task(_run)
    return {"status": "refresh started"}
