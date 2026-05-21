"""Fetch news from RSS feeds and queue for LLM processing."""
import asyncio
import hashlib
import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple

import feedparser
from tenacity import retry, stop_after_attempt, wait_fixed
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import select

from app.models.news import News
from app.models.stock import Stock
from app.data.processors.llm_processor import process_news_batch

logger = logging.getLogger(__name__)

CONCURRENCY_LIMIT = 10

# 固定宏观/行业 RSS，不依赖 watchlist
STATIC_FEEDS: List[Tuple[str, str]] = [
    # 美联储官方新闻稿（换帅、FOMC声明、政策文件）
    ("FED",    "https://www.federalreserve.gov/feeds/press_all.xml"),
    # Yahoo Finance 宏观综合（S&P500、国债、美元）
    ("MACRO",  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC%2C%5ETNX%2CDX-Y.NYB&region=US&lang=en-US"),
    # Yahoo Finance 科技板块
    ("TECH",   "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5ENDX%2CQQQ%2CSPY&region=US&lang=en-US"),
    # Yahoo Finance 半导体行业
    ("SEMI",   "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5ESOX%2CSOXX&region=US&lang=en-US"),
    # Seeking Alpha 半导体（免费 RSS）
    ("SEMI",   "https://seekingalpha.com/tag/semiconductors.xml"),
    # Yahoo Finance 黄金/原油（避险/风险情绪）
    ("MACRO",  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC%3DF%2CCL%3DF&region=US&lang=en-US"),
]


def _rss_url(ticker: str) -> str:
    return f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"


def _compute_hash(title: str, published: Optional[str]) -> str:
    raw = f"{title}{published or ''}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


@retry(stop=stop_after_attempt(3), wait=wait_fixed(5))
def _parse_feed(url: str) -> feedparser.FeedParserDict:
    return feedparser.parse(url)


def _parse_date(entry) -> Optional[datetime]:
    for attr in ("published_parsed", "updated_parsed"):
        t = getattr(entry, attr, None)
        if t:
            try:
                import time as time_mod
                ts = time_mod.mktime(t)
                return datetime.fromtimestamp(ts, tz=timezone.utc)
            except Exception:
                pass
    return None


async def _fetch_one(ticker: str, sem: asyncio.Semaphore) -> int:
    """Fetch RSS for a single ticker under the semaphore with its own DB session."""
    from app.database import AsyncSessionLocal
    url = _rss_url(ticker)
    new_count = 0
    async with sem:
        async with AsyncSessionLocal() as db:
            try:
                feed = await asyncio.to_thread(_parse_feed, url)
                entries = feed.get("entries", [])
                for entry in entries:
                    title = getattr(entry, "title", "").strip()
                    if not title:
                        continue
                    published_at = _parse_date(entry)
                    pub_str = published_at.isoformat() if published_at else ""
                    news_hash = _compute_hash(title, pub_str)
                    news_url = getattr(entry, "link", None)
                    source = feed.feed.get("title", "Yahoo Finance") if hasattr(feed, "feed") else "Yahoo Finance"

                    stmt = pg_insert(News).values([{
                        "ticker": ticker,
                        "title": title,
                        "url": news_url,
                        "source": source,
                        "published_at": published_at,
                        "news_hash": news_hash,
                        "llm_processed": False,
                    }])
                    stmt = stmt.on_conflict_do_nothing(index_elements=["news_hash"])
                    result = await db.execute(stmt)
                    if result.rowcount > 0:
                        new_count += 1

                await db.commit()
                logger.info("Feed %s: %d new items", ticker, new_count)
            except Exception as exc:
                logger.error("RSS fetch failed for %s: %s", ticker, exc)
    return new_count


async def _fetch_static(ticker: str, url: str, sem: asyncio.Semaphore) -> int:
    """Fetch a static RSS feed (macro/sector) with its own DB session."""
    from app.database import AsyncSessionLocal
    new_count = 0
    async with sem:
        async with AsyncSessionLocal() as db:
            try:
                feed = await asyncio.to_thread(_parse_feed, url)
                entries = feed.get("entries", [])
                for entry in entries:
                    title = getattr(entry, "title", "").strip()
                    if not title:
                        continue
                    published_at = _parse_date(entry)
                    pub_str = published_at.isoformat() if published_at else ""
                    news_hash = _compute_hash(title, pub_str)
                    news_url = getattr(entry, "link", None)
                    source = feed.feed.get("title", url) if hasattr(feed, "feed") else url

                    stmt = pg_insert(News).values([{
                        "ticker": ticker,
                        "title": title,
                        "url": news_url,
                        "source": source,
                        "published_at": published_at,
                        "news_hash": news_hash,
                        "llm_processed": False,
                    }])
                    stmt = stmt.on_conflict_do_nothing(index_elements=["news_hash"])
                    result = await db.execute(stmt)
                    if result.rowcount > 0:
                        new_count += 1

                await db.commit()
                if new_count:
                    logger.info("Static feed [%s]: %d new items", ticker, new_count)
            except Exception as exc:
                logger.error("Static RSS fetch failed [%s] %s: %s", ticker, url, exc)
    return new_count


async def fetch_and_store_news(db: AsyncSession) -> int:
    """Fetch RSS for all active watchlist stocks + static macro/sector feeds (concurrency ≤ 10)."""
    result = await db.execute(
        select(Stock.ticker).where(Stock.is_active == True)  # noqa: E712
    )
    tickers: List[str] = [row[0] for row in result.fetchall()]

    sem = asyncio.Semaphore(CONCURRENCY_LIMIT)

    # watchlist 股票
    tasks = [_fetch_one(ticker, sem) for ticker in tickers]
    # 宏观/行业固定源
    tasks += [_fetch_static(ticker, url, sem) for ticker, url in STATIC_FEEDS]

    counts = await asyncio.gather(*tasks)
    total = sum(counts)
    logger.info("News fetch complete: %d new items (%d watchlist + %d static feeds)",
                total, len(tickers), len(STATIC_FEEDS))
    return total


async def process_unprocessed_news(db: AsyncSession, limit: int = 200) -> int:
    """Process ALL pending news items with LLM until none remain."""
    total_processed = 0

    while True:
        result = await db.execute(
            select(News)
            .where(News.llm_processed == False)  # noqa: E712
            .order_by(News.published_at.desc())
            .limit(limit)
        )
        items = result.scalars().all()
        if not items:
            break

        batch_input = [{"title": item.title, "content": item.raw_content or ""} for item in items]

        try:
            analyses = await process_news_batch(batch_input)
        except Exception as exc:
            logger.error("Batch LLM processing failed: %s", exc)
            analyses = [None] * len(items)

        for item, analysis in zip(items, analyses):
            if analysis:
                item.summary = analysis.get("summary")
                item.sentiment = analysis.get("sentiment")
                item.impact_level = analysis.get("impact_level")
                item.time_horizon = analysis.get("time_horizon")
                item.key_point = analysis.get("key_point")
            item.llm_processed = True
            db.add(item)
            total_processed += 1

        await db.commit()
        logger.info("LLM processed batch of %d, total so far: %d", len(items), total_processed)

        if len(items) < limit:
            break

    return total_processed
