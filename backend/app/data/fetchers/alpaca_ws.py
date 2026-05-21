"""Alpaca real-time 1-min bar streaming with fan-out to frontend WebSocket clients.

Maintains one shared Alpaca WebSocket connection. Each frontend client that calls
subscribe() gets its own asyncio.Queue; unsubscribe() removes it.  When the last
client for a ticker disconnects, that ticker is unsubscribed from Alpaca.

Intraday 1-min bars are accumulated into a running daily bar so the frontend can
call lightweight-charts series.update() with a date-keyed candle.
"""
import asyncio
import json
import logging
from collections import defaultdict
from typing import Dict, Optional, Set

import websockets

from app.config import settings

logger = logging.getLogger(__name__)

_FEED_URL = "wss://stream.data.alpaca.markets/v2/{feed}"


class _TodayBar:
    """Accumulates 1-min bars into a single daily OHLCV candle."""

    __slots__ = ("date", "open", "high", "low", "close", "volume")

    def __init__(self, bar: dict) -> None:
        self.date: str = bar["t"][:10]  # "YYYY-MM-DD"
        self.open: float = float(bar["o"])
        self.high: float = float(bar["h"])
        self.low: float = float(bar["l"])
        self.close: float = float(bar["c"])
        self.volume: int = int(bar.get("v", 0))

    def update(self, bar: dict) -> None:
        day = bar["t"][:10]
        if day != self.date:
            # New trading day — reset
            self.date = day
            self.open = float(bar["o"])
            self.high = float(bar["h"])
            self.low = float(bar["l"])
            self.volume = int(bar.get("v", 0))
        else:
            self.high = max(self.high, float(bar["h"]))
            self.low = min(self.low, float(bar["l"]))
            self.volume += int(bar.get("v", 0))
        self.close = float(bar["c"])

    def to_msg(self, ticker: str) -> dict:
        return {
            "type": "bar",
            "ticker": ticker,
            "date": self.date,
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "volume": self.volume,
        }


class AlpacaStreamManager:
    """Single shared Alpaca WS connection; fan-out to per-client queues."""

    def __init__(self) -> None:
        self._queues: Dict[str, Set[asyncio.Queue]] = defaultdict(set)
        self._today: Dict[str, _TodayBar] = {}
        self._task: Optional[asyncio.Task] = None
        self._ws = None

    async def subscribe(self, ticker: str, queue: asyncio.Queue) -> None:
        self._queues[ticker].add(queue)
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run())
        elif self._ws is not None:
            await self._ws.send(json.dumps({"action": "subscribe", "bars": [ticker]}))

    async def unsubscribe(self, ticker: str, queue: asyncio.Queue) -> None:
        self._queues[ticker].discard(queue)
        if not self._queues[ticker] and self._ws is not None:
            await self._ws.send(json.dumps({"action": "unsubscribe", "bars": [ticker]}))

    async def _run(self) -> None:
        url = _FEED_URL.format(feed=settings.ALPACA_DATA_FEED)
        while True:
            try:
                async with websockets.connect(url, ping_interval=20) as ws:
                    self._ws = ws
                    logger.info("Alpaca WS connected (%s feed)", settings.ALPACA_DATA_FEED)
                    await ws.send(json.dumps({
                        "action": "auth",
                        "key": settings.ALPACA_API_KEY,
                        "secret": settings.ALPACA_API_SECRET,
                    }))
                    active = [t for t, q in self._queues.items() if q]
                    if active:
                        await ws.send(json.dumps({"action": "subscribe", "bars": active}))
                    async for raw in ws:
                        for msg in json.loads(raw):
                            if msg.get("T") == "b":
                                await self._on_bar(msg)
            except Exception as exc:
                logger.warning("Alpaca WS lost (%s), reconnecting in 5s", exc)
            finally:
                self._ws = None
            await asyncio.sleep(5)

    async def _on_bar(self, bar: dict) -> None:
        ticker = bar["S"]
        if ticker in self._today:
            self._today[ticker].update(bar)
        else:
            self._today[ticker] = _TodayBar(bar)
        msg = self._today[ticker].to_msg(ticker)
        for q in list(self._queues.get(ticker, [])):
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                pass


alpaca_stream = AlpacaStreamManager()
