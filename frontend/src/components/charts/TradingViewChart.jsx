import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useThemeStore } from '../../store/globalStore'
import { getTradingViewLocale } from '../../i18n/index'

const CHART_HEIGHT = 680
const TV_SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'

function buildWidgetConfig(ticker, theme, locale) {
  return {
    autosize: true,
    symbol: ticker,
    interval: 'D',
    timezone: 'America/New_York',
    theme: theme === 'light' ? 'light' : 'dark',
    style: '1',
    locale,
    enable_publishing: false,
    allow_symbol_change: false,
    calendar: false,
    support_host: 'https://www.tradingview.com',
    hide_top_toolbar: false,
    hide_side_toolbar: false,
    hide_legend: false,
    save_image: false,
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
  const { i18n } = useTranslation()
  const tvLocale = getTradingViewLocale(i18n.language)

  useEffect(() => {
    const el = containerRef.current
    if (!ticker || !el) return

    el.replaceChildren()

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
    // cache-bust so locale/theme changes always reload the embed
    script.src = `${TV_SCRIPT}?_=${Date.now()}`
    script.async = true
    script.innerHTML = JSON.stringify(buildWidgetConfig(ticker, theme, tvLocale))

    wrapper.appendChild(widget)
    wrapper.appendChild(script)
    el.appendChild(wrapper)

    return () => { el.replaceChildren() }
  }, [ticker, theme, tvLocale, i18n.language])

  return (
    <div
      ref={containerRef}
      className="w-full rounded overflow-hidden"
      style={{ minHeight: CHART_HEIGHT, height: CHART_HEIGHT }}
    />
  )
}

export default TradingViewChart
