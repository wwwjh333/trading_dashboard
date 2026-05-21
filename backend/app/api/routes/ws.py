"""WebSocket endpoint: real-time price bars for a single ticker."""
import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings
from app.data.fetchers.alpaca_ws import alpaca_stream
from app.data.fetchers.market_utils import is_market_hours

router = APIRouter()


@router.websocket("/ws/prices/{ticker}")
async def price_stream(websocket: WebSocket, ticker: str) -> None:
    ticker = ticker.upper()
    await websocket.accept()

    if not settings.ALPACA_API_KEY:
        await websocket.send_json({"type": "error", "msg": "Alpaca API key not configured"})
        await websocket.close()
        return

    if not is_market_hours():
        await websocket.send_json({"type": "closed", "msg": "Market is closed"})
        # Keep connection open so browser doesn't report handshake failure
        try:
            while True:
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
        except (asyncio.TimeoutError, WebSocketDisconnect, Exception):
            pass
        return

    queue: asyncio.Queue = asyncio.Queue(maxsize=200)
    await alpaca_stream.subscribe(ticker, queue)
    try:
        while True:
            try:
                msg = await asyncio.wait_for(queue.get(), timeout=30)
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
                continue
            await websocket.send_json(msg)
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        await alpaca_stream.unsubscribe(ticker, queue)
