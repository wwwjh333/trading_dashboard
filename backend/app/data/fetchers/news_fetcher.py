"""Fetch news from RSS feeds and queue for LLM processing.

Deduplication strategy (three layers):
1. news_hash       = SHA256(title + published_at)  — exact duplicate guard (DB unique)
2. title_norm_hash = SHA256(normalised_title)       — same-event / different-source guard
3. url_core_hash   = SHA256(url without query)      — Yahoo Finance cross-ticker duplicate guard

Watchlist-ticker feeds run BEFORE static macro/sector feeds so that a stock-specific
ticker (e.g. NVDA) wins over a generic tag (e.g. SEMI) when both carry the same article.
"""
import asyncio
import hashlib
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Set, Tuple

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

# Fixed macro/sector RSS feeds — always fetched regardless of watchlist
STATIC_FEEDS: List[Tuple[str, str]] = [
    ("FED",   "https://www.federalreserve.gov/feeds/press_all.xml"),
    ("MACRO", "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC%2C%5ETNX%2CDX-Y.NYB&region=US&lang=en-US"),
    ("TECH",  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5ENDX%2CQQQ%2CSPY&region=US&lang=en-US"),
    ("SEMI",  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5ESOX%2CSOXX&region=US&lang=en-US"),
    ("SEMI",  "https://seekingalpha.com/tag/semiconductors.xml"),
    ("MACRO", "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC%3DF%2CCL%3DF&region=US&lang=en-US"),
]

# ── Title normalisation ───────────────────────────────────────────────────────

_STOPWORDS: frozenset = frozenset({
    "the", "a", "an", "in", "of", "and", "or", "for", "to", "with", "by",
    "at", "on", "is", "its", "as", "be", "has", "have", "had", "was", "were",
    "will", "would", "could", "should", "that", "this", "from", "about",
    "after", "before", "over", "under", "up", "new",
    "reports", "report", "reported", "reporting",
    "says", "said", "say",
    "announces", "announced", "announce", "announcement",
    "shares", "stock", "stocks", "update", "updated", "updates",
})
_YEAR_PAT  = re.compile(r'\b20\d{2}\b')
_QTR_PAT   = re.compile(r'\b[Qq][1-4]\b')
_PUNCT_PAT = re.compile(r'[^\w\s]')
_SPACE_PAT = re.compile(r'\s+')


def _normalize_title(title: str) -> str:
    t = title.lower()
    t = _YEAR_PAT.sub('', t)
    t = _QTR_PAT.sub('', t)
    t = _PUNCT_PAT.sub(' ', t)
    words = _SPACE_PAT.sub(' ', t).strip().split()
    words = [w for w in words if w not in _STOPWORDS and len(w) > 1]
    return ' '.join(words)


def _title_norm_hash(title: str) -> str:
    return hashlib.sha256(_normalize_title(title).encode('utf-8')).hexdigest()


def _url_core_hash(url: Optional[str]) -> Optional[str]:
    """Hash the URL without query string / fragment to catch Yahoo cross-ticker dupes."""
    if not url:
        return None
    core = url.split('?')[0].split('#')[0].rstrip('/')
    return hashlib.sha256(core.encode('utf-8')).hexdigest()


def _exact_hash(title: str, published: Optional[str]) -> str:
    raw = f"{title}{published or ''}".encode('utf-8')
    return hashlib.sha256(raw).hexdigest()


# ── Feed parsing ──────────────────────────────────────────────────────────────

@retry(stop=stop_after_attempt(3), wait=wait_fixed(5))
def _parse_feed(url: str) -> feedparser.FeedParserDict:
    return feedparser.parse(url)


def _parse_date(entry) -> Optional[datetime]:
    for attr in ('published_parsed', 'updated_parsed'):
        t = getattr(entry, attr, None)
        if t:
            try:
                import time as _time
                return datetime.fromtimestamp(_time.mktime(t), tz=timezone.utc)
            except Exception:
                pass
    return None


# ── Core fetch helper (shared by watchlist and static) ───────────────────────

async def _fetch_feed(
    ticker: str,
    url: str,
    sem: asyncio.Semaphore,
    seen_norm: Set[str],
    seen_url: Set[str],
) -> int:
    """Fetch one RSS feed, dedup against in-memory sets, persist new items."""
    from app.database import AsyncSessionLocal

    new_count = 0
    async with sem:
        async with AsyncSessionLocal() as db:
            try:
                feed = await asyncio.to_thread(_parse_feed, url)
                entries = feed.get('entries', [])
                source = feed.feed.get('title', url) if hasattr(feed, 'feed') else url

                for entry in entries:
                    title = getattr(entry, 'title', '').strip()
                    if not title:
                        continue

                    published_at = _parse_date(entry)
                    pub_str      = published_at.isoformat() if published_at else ''
                    news_url     = getattr(entry, 'link', None)

                    exact_h  = _exact_hash(title, pub_str)
                    norm_h   = _title_norm_hash(title)
                    url_h    = _url_core_hash(news_url)

                    # ── Layer 2: normalised-title dedup (same-event different-source) ──
                    if norm_h in seen_norm:
                        logger.debug("Norm-dedup skip [%s]: %s", ticker, title[:60])
                        continue

                    # ── Layer 3: URL-core dedup (Yahoo cross-ticker same article) ──
                    if url_h and url_h in seen_url:
                        logger.debug("URL-dedup skip [%s]: %s", ticker, title[:60])
                        continue

                    # ── Layer 1: exact dedup via DB unique constraint ──
                    stmt = pg_insert(News).values([{
                        'ticker':          ticker,
                        'title':           title,
                        'url':             news_url,
                        'source':          source,
                        'published_at':    published_at,
                        'news_hash':       exact_h,
                        'title_norm_hash': norm_h,
                        'url_core_hash':   url_h,
                        'llm_processed':   False,
                    }])
                    stmt = stmt.on_conflict_do_nothing(index_elements=['news_hash'])
                    result = await db.execute(stmt)

                    if result.rowcount > 0:
                        new_count += 1
                        seen_norm.add(norm_h)
                        if url_h:
                            seen_url.add(url_h)

                await db.commit()
                if new_count:
                    logger.info('Feed [%s] %s: %d new items', ticker, url[:60], new_count)

            except Exception as exc:
                logger.error('RSS fetch failed [%s] %s: %s', ticker, url[:60], exc)

    return new_count


def _rss_url(ticker: str) -> str:
    return f'https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US'


# ── Public API ────────────────────────────────────────────────────────────────

async def fetch_and_store_news(db: AsyncSession) -> int:
    """
    Fetch RSS for all active watchlist stocks + static macro/sector feeds.

    Order of execution matters for ticker priority:
      1. Watchlist tickers (specific stocks — highest priority)
      2. Static macro/sector feeds (generic tags — lower priority)

    Shared in-memory sets (seen_norm, seen_url) prevent the same story from being
    stored multiple times across feeds within a single fetch cycle.
    Pre-loading existing hashes from the DB covers duplicates across fetch cycles.
    """
    # ── Active tickers ───────────────────────────────────────────────────────
    result = await db.execute(
        select(Stock.ticker).where(Stock.is_active == True)  # noqa: E712
    )
    tickers: List[str] = [row[0] for row in result.fetchall()]

    # ── Pre-load recent hashes from DB (past 24 h) into memory ──────────────
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    existing = await db.execute(
        select(News.title_norm_hash, News.url_core_hash)
        .where(News.published_at >= cutoff)
    )
    seen_norm: Set[str] = set()
    seen_url:  Set[str] = set()
    for row in existing.fetchall():
        if row[0]:
            seen_norm.add(row[0])
        if row[1]:
            seen_url.add(row[1])

    # Also load ALL url_core_hashes (not time-limited) to avoid any URL reuse
    all_url_hashes = await db.execute(
        select(News.url_core_hash).where(News.url_core_hash.isnot(None))
    )
    for (uh,) in all_url_hashes.fetchall():
        seen_url.add(uh)

    logger.info(
        'Dedup pre-load: %d norm-hashes, %d url-hashes in memory',
        len(seen_norm), len(seen_url),
    )

    sem = asyncio.Semaphore(CONCURRENCY_LIMIT)

    # ── Phase 1: watchlist tickers (run first → they own the ticker assignment) ──
    watchlist_tasks = [
        _fetch_feed(ticker, _rss_url(ticker), sem, seen_norm, seen_url)
        for ticker in tickers
    ]
    watchlist_counts = await asyncio.gather(*watchlist_tasks)

    # ── Phase 2: static macro/sector feeds (run after → dupes already in seen sets) ──
    static_tasks = [
        _fetch_feed(ticker, url, sem, seen_norm, seen_url)
        for ticker, url in STATIC_FEEDS
    ]
    static_counts = await asyncio.gather(*static_tasks)

    total = sum(watchlist_counts) + sum(static_counts)
    logger.info(
        'News fetch complete: %d new items (%d watchlist tickers × feeds, %d static feeds)',
        total, sum(watchlist_counts), sum(static_counts),
    )
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

        batch_input = [{'title': item.title, 'content': item.raw_content or ''} for item in items]

        try:
            analyses = await process_news_batch(batch_input)
        except Exception as exc:
            logger.error('Batch LLM processing failed: %s', exc)
            analyses = [None] * len(items)

        for item, analysis in zip(items, analyses):
            if analysis:
                item.summary      = analysis.get('summary')
                item.sentiment    = analysis.get('sentiment')
                item.impact_level = analysis.get('impact_level')
                item.time_horizon = analysis.get('time_horizon')
                item.key_point    = analysis.get('key_point')
            item.llm_processed = True
            db.add(item)
            total_processed += 1

        await db.commit()
        logger.info('LLM processed batch of %d, total so far: %d', len(items), total_processed)

        if len(items) < limit:
            break

    return total_processed
