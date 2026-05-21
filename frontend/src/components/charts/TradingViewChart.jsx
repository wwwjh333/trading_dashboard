import { useEffect, useRef, memo } from 'react'
import { useThemeStore } from '../../store/globalStore'

const CHART_HEIGHT = 620

function TradingViewChart({ ticker }) {
  const containerRef = useRef(null)
  const { theme } = useThemeStore()

  useEffect(() => {
    if (!ticker || !containerRef.current) return

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
      new window.TradingView.widget({
        container_id: containerId,
        width: '100%',
        height: CHART_HEIGHT,
        symbol: ticker,
        interval: 'D',
        timezone: 'America/New_York',
        theme: theme === 'light' ? 'light' : 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: theme === 'light' ? '#f8f9fa' : '#1a1d27',
        enable_publishing: false,
        withdateranges: true,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        studies: ['Volume@tv-basicstudies'],
        overrides: {
          'paneProperties.background': theme === 'light' ? '#ffffff' : '#13151f',
          'paneProperties.backgroundType': 'solid',
          'scalesProperties.textColor': theme === 'light' ? '#374151' : '#9ca3af',
        },
      })
    }
    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
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
