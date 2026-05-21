import { useEffect, useRef, memo } from 'react'
import { useThemeStore } from '../../store/globalStore'

const INTERVAL_MAP = {
  30:  'D',
  60:  'D',
  90:  'D',
  180: 'W',
}

function TradingViewChart({ ticker, days = 90 }) {
  const containerRef = useRef(null)
  const widgetRef    = useRef(null)
  const { theme } = useThemeStore()

  useEffect(() => {
    if (!ticker || !containerRef.current) return

    // Remove previous widget
    containerRef.current.innerHTML = ''

    const containerId = `tv_${ticker}_${Date.now()}`
    const div = document.createElement('div')
    div.id = containerId
    containerRef.current.appendChild(div)

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (!window.TradingView) return
      widgetRef.current = new window.TradingView.widget({
        container_id:      containerId,
        width:             '100%',
        height:            420,
        symbol:            ticker,
        interval:          INTERVAL_MAP[days] ?? 'D',
        timezone:          'America/New_York',
        theme:             theme === 'light' ? 'light' : 'dark',
        style:             '1',           // Candlestick
        locale:            'en',
        toolbar_bg:        theme === 'light' ? '#f8f9fa' : '#1a1d27',
        enable_publishing: false,
        withdateranges:    true,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image:        false,
        studies: [
          'MASimple@tv-basicstudies',   // MA
          'RSI@tv-basicstudies',        // RSI
          'MACD@tv-basicstudies',       // MACD
          'BB@tv-basicstudies',         // Bollinger Bands
          'Volume@tv-basicstudies',     // Volume
        ],
        overrides: {
          'paneProperties.background':           theme === 'light' ? '#ffffff' : '#13151f',
          'paneProperties.backgroundType':       'solid',
          'scalesProperties.textColor':          theme === 'light' ? '#374151' : '#9ca3af',
        },
      })
    }
    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [ticker, days, theme])

  return (
    <div ref={containerRef} className="w-full rounded overflow-hidden" style={{ minHeight: 420 }} />
  )
}

export default memo(TradingViewChart)
