import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Overlay Alpaca real-time price on top of summary (DB/yfinance baseline).
 * Falls back to summary when market is closed or WS unavailable.
 */
export function useLivePrice(ticker, summary) {
  const [live, setLive] = useState(null)
  const prevCloseRef = useRef(null)

  const prevClose = useMemo(() => {
    if (!summary?.latest_price) return null
    const price = parseFloat(summary.latest_price)
    const pct = summary.price_change_pct
    if (pct != null) return price / (1 + parseFloat(pct) / 100)
    return price
  }, [summary?.latest_price, summary?.price_change_pct])

  useEffect(() => {
    prevCloseRef.current = prevClose
  }, [prevClose])

  useEffect(() => {
    if (!ticker) {
      setLive(null)
      return
    }

    setLive(null)
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/prices/${ticker}`)

    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data)
        if (msg.type !== 'bar') return
        const price = msg.close
        const ref = prevCloseRef.current
        const changePct = ref ? ((price - ref) / ref) * 100 : null
        setLive({ price, changePct, isLive: true })
      } catch {
        /* ignore malformed frames */
      }
    }

    return () => ws.close()
  }, [ticker])

  if (live) return live

  if (summary?.latest_price != null) {
    return {
      price: parseFloat(summary.latest_price),
      changePct: summary.price_change_pct != null ? parseFloat(summary.price_change_pct) : null,
      isLive: false,
    }
  }

  return null
}
