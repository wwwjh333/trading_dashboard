import { useState, useMemo, useEffect, useRef } from 'react'
import { useGlobalStore } from '../store/globalStore'
import { useStockList, useStockSummary } from '../hooks/useStock'
import { useNews } from '../hooks/useNews'
import { stocksApi } from '../api/index'
import TradingViewChart from '../components/charts/TradingViewChart'
import OptionsCard from '../components/cards/OptionsCard'
import NewsCard from '../components/cards/NewsCard'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

const DATE_RANGES = [30, 60, 90, 180]

function useStockSearch(query) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 1) { setResults([]); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await stocksApi.search(q)
        setResults(data ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(timerRef.current)
  }, [query])

  return { results, loading }
}

export default function StockResearch() {
  const { t } = useTranslation()
  const { selectedTicker, setSelectedTicker, dateRange, setDateRange } = useGlobalStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef(null)

  const { data: stockList } = useStockList()
  const { data: summary } = useStockSummary(selectedTicker)
  const { data: news } = useNews(selectedTicker, 20)
  const { results: searchResults, loading: searchLoading } = useStockSearch(searchQuery)

  const tickers = useMemo(() => (stockList ?? []).map((s) => s.ticker), [stockList])

  const filteredWatchlist = useMemo(() => {
    const q = searchQuery.trim().toUpperCase()
    if (!q) return tickers
    return tickers.filter((t) => t.includes(q))
  }, [tickers, searchQuery])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectTicker = (ticker) => {
    setSelectedTicker(ticker)
    setSearchQuery('')
    setShowDropdown(false)
  }

  return (
    <div className="flex gap-4 h-full">
      {/* ── Left sidebar ── */}
      <aside className="w-44 shrink-0 flex flex-col gap-2">
        {/* Search input with dropdown */}
        <div ref={searchRef} className="relative">
          <input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            placeholder="搜索股票名称或代码..."
            className="input-field py-1.5 text-xs w-full"
          />
          {/* Search dropdown */}
          {showDropdown && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-0.5 bg-surface-800 border border-surface-600 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
              {searchLoading && (
                <div className="px-3 py-2 text-xs text-gray-500">搜索中...</div>
              )}
              {!searchLoading && searchResults.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-500">无结果</div>
              )}
              {searchResults.map((r) => (
                <button
                  key={r.ticker}
                  onClick={() => selectTicker(r.ticker)}
                  className="w-full text-left px-3 py-2 hover:bg-surface-700 transition-colors border-b border-surface-700 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-accent-blue">{r.ticker}</span>
                    <span className="text-xs text-gray-600">{r.exchange}</span>
                  </div>
                  {r.name && <p className="text-xs text-gray-400 truncate mt-0.5">{r.name}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Watchlist */}
        <div className="flex-1 overflow-y-auto space-y-0.5 max-h-[calc(100vh-220px)]">
          {filteredWatchlist.map((ticker) => (
            <button
              key={ticker}
              onClick={() => selectTicker(ticker)}
              className={clsx(
                'w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors',
                selectedTicker === ticker
                  ? 'bg-accent-blue text-surface-900'
                  : 'text-gray-400 hover:bg-surface-700 hover:text-gray-200',
              )}
            >
              {ticker}
            </button>
          ))}
          {filteredWatchlist.length === 0 && searchQuery && (
            <p className="text-gray-600 text-xs text-center py-3">自选股无匹配</p>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Summary header */}
        <div className="card">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-xl font-medium text-accent-blue">${selectedTicker}</h2>
              {summary?.name && <span className="text-gray-400 truncate">{summary.name}</span>}
              {summary?.sector && (
                <span className="text-xs text-gray-500 bg-surface-700 px-2 py-0.5 rounded shrink-0">
                  {summary.sector}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {summary?.latest_price && (
                <span className="text-2xl font-medium">${parseFloat(summary.latest_price).toFixed(2)}</span>
              )}
              {summary?.price_change_pct != null && (
                <span className={`text-lg font-medium ${summary.price_change_pct >= 0 ? 'positive' : 'negative'}`}>
                  {summary.price_change_pct >= 0 ? '+' : ''}{summary.price_change_pct.toFixed(2)}%
                </span>
              )}
              {summary?.rsi_14 && (
                <div className="text-center">
                  <p className="text-xs text-gray-400">RSI</p>
                  <p className={clsx('font-medium', {
                    'text-accent-red': summary.rsi_14 > 70,
                    'text-accent-green': summary.rsi_14 < 30,
                    'text-gray-200': summary.rsi_14 >= 30 && summary.rsi_14 <= 70,
                  })}>
                    {parseFloat(summary.rsi_14).toFixed(1)}
                  </p>
                </div>
              )}
              <div className="flex gap-1 border-l border-surface-600 pl-4">
                {DATE_RANGES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDateRange(d)}
                    className={clsx('px-2 py-1 rounded text-xs border transition-colors', {
                      'bg-surface-600 text-gray-200 border-surface-500': dateRange === d,
                      'text-gray-500 border-transparent hover:border-surface-600 hover:text-gray-400': dateRange !== d,
                    })}
                  >
                    {d}{t('common.days')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* TradingView chart */}
            <div className="card !p-0 overflow-hidden">
              <TradingViewChart ticker={selectedTicker} days={dateRange} />
            </div>
          </div>

          <div className="space-y-4">
            <OptionsCard ticker={selectedTicker} />
            <div className="card">
              <h3 className="text-sm font-medium mb-3">{t('research.relatedNews')}</h3>
              <div className="space-y-2">
                {(news ?? []).slice(0, 8).map((n) => <NewsCard key={n.id} item={n} />)}
                {!news?.length && <p className="text-gray-500 text-sm">{t('common.noData')}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
