import { useEffect, useRef, useState, memo } from 'react'
import { createChart, CrosshairMode } from 'lightweight-charts'
import { useThemeStore } from '../../store/globalStore'
import { stocksApi } from '../../api/stocks'
import clsx from 'clsx'

const TOOLBAR_H = 40
const CHART_H = 580
const RANGES = ['2W', '1M', '3M', '6M', '1Y', 'ALL']

function fmtPrice(v) {
  return v != null ? Number(v).toFixed(2) : '–'
}
function fmtVol(v) {
  if (v == null) return '–'
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K'
  return String(v)
}

function buildChartOpts(isDark) {
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

function applyRange(chart, range, bars) {
  if (!bars.length || !chart) return
  if (range === 'ALL') { chart.timeScale().fitContent(); return }
  const calDays = { '2W': 14, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }[range]
  const tradingBars = Math.round(calDays * 5 / 7)
  const to = bars.length - 1
  const from = Math.max(0, to - tradingBars)
  chart.timeScale().setVisibleLogicalRange({ from, to })
}

function LightweightChart({ ticker }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const candleRef = useRef(null)
  const volumeRef = useRef(null)
  const wsRef = useRef(null)
  const barsRef = useRef([])
  const legendRef = useRef(null)
  const [activeRange, setActiveRange] = useState('6M')
  const { theme } = useThemeStore()
  const isDark = theme !== 'light'

  // Create chart once on mount
  useEffect(() => {
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: CHART_H,
      ...buildChartOpts(isDark),
    })
    chartRef.current = chart

    const candle = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })
    candleRef.current = candle

    const vol = chart.addHistogramSeries({
      color: '#6b7280',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    volumeRef.current = vol

    // OHLCV legend on crosshair move (direct DOM for perf)
    chart.subscribeCrosshairMove((param) => {
      if (!legendRef.current) return
      const bar = param.seriesData?.get(candle)
      const volBar = param.seriesData?.get(vol)
      if (!bar || !param.time) {
        legendRef.current.textContent = ''
        return
      }
      const up = bar.close >= bar.open
      legendRef.current.innerHTML =
        `<span class="mr-3 text-gray-400">O <span class="text-gray-200">${fmtPrice(bar.open)}</span></span>` +
        `<span class="mr-3 text-gray-400">H <span class="text-green-400">${fmtPrice(bar.high)}</span></span>` +
        `<span class="mr-3 text-gray-400">L <span class="text-red-400">${fmtPrice(bar.low)}</span></span>` +
        `<span class="mr-3 text-gray-400">C <span class="${up ? 'text-green-400' : 'text-red-400'}">${fmtPrice(bar.close)}</span></span>` +
        `<span class="text-gray-400">V <span class="text-gray-300">${fmtVol(volBar?.value)}</span></span>`
    })

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
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

  // Theme sync
  useEffect(() => {
    chartRef.current?.applyOptions(buildChartOpts(isDark))
  }, [isDark])

  // Range button → zoom
  useEffect(() => {
    applyRange(chartRef.current, activeRange, barsRef.current)
  }, [activeRange])

  // Load history + WebSocket when ticker changes
  useEffect(() => {
    if (!ticker) return
    candleRef.current?.setData([])
    volumeRef.current?.setData([])
    barsRef.current = []
    wsRef.current?.close()
    wsRef.current = null

    stocksApi.getPrice(ticker, 365).then((raw) => {
      if (!candleRef.current) return
      const candles = raw.map((b) => ({
        time: String(b.date), open: b.open, high: b.high, low: b.low, close: b.close,
      }))
      const vols = raw.map((b) => ({
        time: String(b.date), value: b.volume ?? 0,
        color: (b.close ?? 0) >= (b.open ?? 0) ? '#22c55e40' : '#ef444440',
      }))
      candleRef.current.setData(candles)
      volumeRef.current?.setData(vols)
      barsRef.current = candles
      applyRange(chartRef.current, activeRange, candles)
    }).catch(() => {})

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/prices/${ticker}`)
    wsRef.current = ws

    ws.onopen = () => { /* connected */ }

    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data)
        if (msg.type === 'closed' || msg.type === 'error') return
        if (msg.type !== 'bar') return
        const bar = { time: msg.date, open: msg.open, high: msg.high, low: msg.low, close: msg.close }
        candleRef.current?.update(bar)
        volumeRef.current?.update({
          time: msg.date, value: msg.volume ?? 0,
          color: msg.close >= msg.open ? '#22c55e40' : '#ef444440',
        })
        const last = barsRef.current[barsRef.current.length - 1]
        if (last?.time === msg.date) barsRef.current[barsRef.current.length - 1] = bar
      } catch (_) {}
    }
    ws.onerror = () => { /* nginx/backend unavailable — history chart still works */ }

    return () => { ws.close(); wsRef.current = null }
  }, [ticker]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full flex flex-col" style={{ height: TOOLBAR_H + CHART_H }}>
      {/* Toolbar */}
      <div className={clsx(
        'flex items-center justify-between px-3 shrink-0 border-b text-xs',
        isDark ? 'border-gray-800 bg-[#13151f]' : 'border-gray-200 bg-white',
      )} style={{ height: TOOLBAR_H }}>
        <div ref={legendRef} className="font-mono" />
        <div className="flex gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setActiveRange(r)}
              className={clsx(
                'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                activeRange === r
                  ? 'bg-accent-blue text-surface-900'
                  : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {/* Chart canvas */}
      <div ref={containerRef} style={{ height: CHART_H }} className="w-full" />
    </div>
  )
}

export default memo(LightweightChart)
