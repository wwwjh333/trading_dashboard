import { useEffect, useRef, memo } from 'react'
import { createChart, CrosshairMode } from 'lightweight-charts'
import { useThemeStore } from '../../store/globalStore'
import { stocksApi } from '../../api/stocks'

const CHART_HEIGHT = 620

function chartOptions(isDark) {
  return {
    layout: {
      background: { color: isDark ? '#13151f' : '#ffffff' },
      textColor: isDark ? '#9ca3af' : '#374151',
    },
    grid: {
      vertLines: { color: isDark ? '#1f2437' : '#e9ecef' },
      horzLines: { color: isDark ? '#1f2437' : '#e9ecef' },
    },
    crosshair: { mode: CrosshairMode.Normal },
    timeScale: { borderColor: isDark ? '#374151' : '#d1d5db', timeVisible: false },
    rightPriceScale: { borderColor: isDark ? '#374151' : '#d1d5db' },
  }
}

function LightweightChart({ ticker }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const candleRef = useRef(null)
  const volumeRef = useRef(null)
  const wsRef = useRef(null)
  const { theme } = useThemeStore()
  const isDark = theme !== 'light'

  // Create chart once on mount, destroy on unmount
  useEffect(() => {
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: CHART_HEIGHT,
      ...chartOptions(isDark),
    })
    chartRef.current = chart

    candleRef.current = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    volumeRef.current = chart.addHistogramSeries({
      color: '#6b7280',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    })

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      volumeRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync theme changes without re-creating the chart
  useEffect(() => {
    chartRef.current?.applyOptions(chartOptions(isDark))
  }, [isDark])

  // Load history + open WebSocket when ticker changes
  useEffect(() => {
    if (!ticker) return

    candleRef.current?.setData([])
    volumeRef.current?.setData([])
    wsRef.current?.close()
    wsRef.current = null

    // Historical daily bars from yfinance DB
    stocksApi.getPrice(ticker, 180).then((bars) => {
      if (!candleRef.current) return
      candleRef.current.setData(
        bars.map((b) => ({
          time: String(b.date),
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        }))
      )
      volumeRef.current?.setData(
        bars.map((b) => ({
          time: String(b.date),
          value: b.volume ?? 0,
          color: (b.close ?? 0) >= (b.open ?? 0) ? '#22c55e40' : '#ef444440',
        }))
      )
      chartRef.current?.timeScale().fitContent()
    }).catch(() => {})

    // Real-time 1-min bars from Alpaca (via backend WS, proxied by Vite in dev)
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/prices/${ticker}`)
    wsRef.current = ws

    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data)
        if (msg.type !== 'bar') return
        // Update today's daily candle with accumulated intraday OHLCV
        candleRef.current?.update({
          time: msg.date,
          open: msg.open,
          high: msg.high,
          low: msg.low,
          close: msg.close,
        })
        volumeRef.current?.update({
          time: msg.date,
          value: msg.volume ?? 0,
          color: msg.close >= msg.open ? '#22c55e40' : '#ef444440',
        })
      } catch (_) {}
    }
    ws.onerror = () => ws.close()

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [ticker])

  return (
    <div
      ref={containerRef}
      style={{ height: CHART_HEIGHT }}
      className="w-full"
    />
  )
}

export default memo(LightweightChart)
