import { useEffect, useRef, memo } from 'react'
import { useThemeStore } from '../../store/globalStore'

const CHART_HEIGHT = 680

function buildWidgetConfig(ticker, theme) {
  return {
    autosize: true,
    symbol: ticker,
    interval: 'D',
    timezone: 'America/New_York',
    theme: theme === 'light' ? 'light' : 'dark',
    style: '1',
    locale: 'zh_CN',
    enable_publishing: false,
    allow_symbol_change: false,
    calendar: false,
    support_host: 'https://www.tradingview.com',
    // 顶部工具栏：周期(1m/5m/1D…)、K线类型、指标
    hide_top_toolbar: false,
    // 左侧画线工具
    hide_side_toolbar: false,
    hide_legend: false,
    save_image: false,
    // 底部日期范围：1D / 5D / 1M / 3M / 6M / YTD / 1Y / 5Y / All
    withdateranges: true,
    range: '6M',
    details: false,
    hotlist: false,
    studies: [],
  }
}

function TradingViewChart({ ticker }) {
  const containerRef = useRef(null)
  const { theme } = useThemeStore()

  useEffect(() => {
    const el = containerRef.current
    if (!ticker || !el) return

    el.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.className = 'tradingview-widget-container'
    wrapper.style.height = `${CHART_HEIGHT}px`
    wrapper.style.width = '100%'

    const widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget'
    widget.style.height = '100%'
    widget.style.width = '100%'

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify(buildWidgetConfig(ticker, theme))

    wrapper.appendChild(widget)
    wrapper.appendChild(script)
    el.appendChild(wrapper)

    return () => { el.innerHTML = '' }
  }, [ticker, theme])

  return (
    <div
      ref={containerRef}
      className="w-full rounded overflow-hidden"
      style={{ minHeight: CHART_HEIGHT, height: CHART_HEIGHT }}
    />
  )
}

export default memo(TradingViewChart)
