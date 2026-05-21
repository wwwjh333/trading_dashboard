"""Process news articles with Claude API — cost-optimised version.

Cost controls implemented:
1. Model: claude-haiku-4-5 (~12x cheaper than sonnet)
2. Batch processing: up to LLM_BATCH_SIZE articles per API call
3. Keyword pre-filtering: skip obviously irrelevant articles
4. Daily call limit: tracked in a module-level counter (resets on restart)
"""
import asyncio
import json
import logging
from datetime import date
from typing import Optional

import anthropic
from tenacity import retry, stop_after_attempt, wait_fixed

from app.config import settings

logger = logging.getLogger(__name__)

# ── daily call counter (in-process; resets on pod restart) ───────────────────
_daily_counter: dict[str, int] = {}


def _today_key() -> str:
    return str(date.today())


def _check_and_inc() -> bool:
    """Return True if we may proceed, False if daily limit reached."""
    key = _today_key()
    count = _daily_counter.get(key, 0)
    if count >= settings.LLM_DAILY_LIMIT:
        return False
    _daily_counter[key] = count + 1
    return True


# ── keyword pre-filter ────────────────────────────────────────────────────────
RELEVANT_KEYWORDS = {
    "revenue", "earnings", "guidance", "forecast", "capex", "acquisition",
    "layoff", "layoffs", "product", "regulation", "tariff", "lawsuit", "merger",
    "profit", "loss", "quarterly", "annual", "outlook", "beat", "miss",
    "收入", "财报", "指引", "收购", "裁员", "政策", "利润", "季报", "年报",
    "超预期", "不及预期", "并购", "监管",
}


def is_worth_processing(title: str) -> bool:
    title_lower = title.lower()
    return any(kw in title_lower for kw in RELEVANT_KEYWORDS)


# ── prompt builder ─────────────────────────────────────────────────────────────
def _build_system_prompt() -> str:
    lang = settings.SUMMARY_LANGUAGE
    if lang == "en":
        summary_instruction = "one-sentence summary in English, max 60 chars"
    else:
        summary_instruction = "一句话摘要，不超过40字，中文"

    return f"""You are a professional stock analyst assistant.
For each news article provided, extract structured information and return ONLY a JSON array.
Each element of the array must have:
{{
  "summary": "{summary_instruction}",
  "sentiment": "bullish | bearish | neutral",
  "impact_level": "high | medium | low",
  "time_horizon": "short | medium | long",
  "key_point": "the single most important number or fact"
}}

Rules:
- sentiment: short-term directional impact on the stock
- impact_level: high=major earnings/policy, medium=routine business update, low=minor news
- time_horizon: short=within 1 week, medium=within 1 month, long=over 1 month
- Return exactly as many elements as there are articles, in the same order.
- Output ONLY the JSON array, no markdown, no explanation."""


# ── single-call batch helper ───────────────────────────────────────────────────
@retry(stop=stop_after_attempt(2), wait=wait_fixed(5))
def _call_claude_batch(items: list[dict]) -> list[Optional[dict]]:
    """Send a batch of {title, content} dicts; return list of parsed results."""
    if not settings.ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not configured, skipping LLM processing")
        return [None] * len(items)

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    # Build a numbered list of articles
    parts = []
    for idx, item in enumerate(items, 1):
        content_snippet = (item.get("content") or "")[:500]
        parts.append(f"[{idx}] Title: {item['title']}\nContent: {content_snippet}")
    user_message = "\n\n---\n\n".join(parts)

    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=150 * len(items),
        system=_build_system_prompt(),
        messages=[{"role": "user", "content": user_message}],
    )

    raw = message.content[0].text.strip()

    # Strip markdown fences if present
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:].strip()

    parsed = json.loads(raw)
    if isinstance(parsed, list):
        return parsed[:len(items)]
    # If model returned an object instead of an array, wrap it
    return [parsed]


async def process_news_with_llm(title: str, content: str) -> Optional[dict]:
    """Process a single article (thin wrapper over batch; checks keyword filter & daily limit)."""
    if not is_worth_processing(title):
        logger.debug("Skipping non-relevant article: %s", title[:60])
        return None

    if not _check_and_inc():
        logger.warning("LLM daily limit (%d) reached, skipping: %s", settings.LLM_DAILY_LIMIT, title[:60])
        return None

    try:
        results = await asyncio.to_thread(_call_claude_batch, [{"title": title, "content": content}])
        if results and results[0]:
            return results[0]
        return None
    except json.JSONDecodeError as e:
        logger.error("JSON parse error from LLM: %s", e)
        return None
    except Exception as e:
        logger.error("LLM processing error: %s", e)
        return None


async def process_news_batch(items: list[dict]) -> list[Optional[dict]]:
    """Process a batch of articles in one API call.

    Args:
        items: list of dicts with keys 'title' and 'content'

    Returns:
        list of result dicts (or None for each skipped/failed item)
    """
    if not items:
        return []

    # Keyword pre-filter
    filtered = [(i, item) for i, item in enumerate(items) if is_worth_processing(item["title"])]
    if not filtered:
        return [None] * len(items)

    # Chunk into batches of LLM_BATCH_SIZE
    results: list[Optional[dict]] = [None] * len(items)

    batch_size = max(1, settings.LLM_BATCH_SIZE)
    for chunk_start in range(0, len(filtered), batch_size):
        chunk = filtered[chunk_start: chunk_start + batch_size]

        if not _check_and_inc():
            logger.warning("LLM daily limit reached mid-batch after %d calls", _daily_counter.get(_today_key(), 0))
            break

        try:
            batch_results = await asyncio.to_thread(
                _call_claude_batch, [item for _, item in chunk]
            )
            for (orig_idx, _), res in zip(chunk, batch_results):
                results[orig_idx] = res
        except Exception as e:
            logger.error("Batch LLM error: %s", e)

    return results
