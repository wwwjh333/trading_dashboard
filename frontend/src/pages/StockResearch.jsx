import { useState, useMemo } from 'react'
import { useGlobalStore } from '../store/globalStore'
import { useStockList, useStockPrice, useStockSummary } from '../hooks/useStock'
import { useNews } from '../hooks/useNews'
import PriceChart from '../components/charts/PriceChart'
import TechChart from '../components/charts/TechChart'
import OptionsCard from '../components/cards/OptionsCard'
import NewsCard from '../components/cards/NewsCard'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

const DATE_RANGES = [30, 60, 90, 180]

export default function StockResearch() {
  const { t } = useTranslation()
  const { selectedTicker, setSelectedTicker, dateRange, setDateRange } = useGlobalStore()
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [manualTicker, setManualTicker] = useState('')

  const { data: stockList } = useStockList()
  const { data: price, isLoading: priceLoading } = useStockPrice(selectedTicker, dateRange)
  const { data: summary } = useStockSummary(selectedTicker)
  const { data: news } = useNews(selectedTicker, 20)

  const tickers = useMemo(() => (stockList ?? []).map((s) => s.ticker), [stockList])

  const filteredTickers = useMemo(() => {
    const q = sidebarSearch.trim().toUpperCase()
    return q ? tickers.filter((t) => t.includes(q)) : tickers
  }, [tickers, sidebarSearch])

  const handleManualSearch = (e) => {
    e.preventDefault()
    const val = manualTicker.trim().toUpperCase()
    if (val) { setSelectedTicker(val); setManualTicker('') }
  }

  return (
    <div className="flex gap-4 h-full">
      {/* ── Left sidebar: ticker list ── */}
      <aside className="w-40 shrink-0 flex flex-col gap-2">
        <input
          value={sidebarSearch}
          onChange={(e) => setSidebarSearch(e.target.value)}
          placeholder="搜索..."
          className="input-field py-1.5 text-xs"
        />
        <div className="flex-1 overflow-y-auto space-y-0.5 max-h-[calc(100vh-220px)]">
          {filteredTickers.map((ticker) => (
            <button
              key={ticker}
              onClick={() => setSelectedTicker(ticker)}
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
          {filteredTickers.length === 0 && (
            <p className="text-gray-600 text-xs text-center py-3">无结果</p>
          )}
        </div>

        {/* Manual ticker lookup */}
        <form onSubmit={handleManualSearch} className="flex gap-1">
          <input
            value={manualTicker}
            onChange={(e) => setManualTicker(e.target.value.toUpperCase())}
            placeholder="其他..."
            className="input-field py-1.5 text-xs flex-1 min-w-0"
            maxLength={10}
          />
          <button type="submit" className="btn-secondary text-xs py-1.5 px-2 shrink-0">Go</button>
        </form>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header: summary card + date range */}
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
              {summary?.supply_chain_layer && (
                <span className="text-xs text-accent-yellow shrink-0">{summary.supply_chain_layer}</span>
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
          {summary?.user_notes && (
            <p className="text-sm text-gray-400 mt-3 border-t border-surface-600 pt-3">
              {summary.user_notes}
            </p>
          )}
          {!summary && (
            <p className="text-gray-500 text-sm">请从左侧选择股票，或在"其他"框输入代码查看</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h3 className="text-sm font-medium mb-3">{t('research.priceChart')}</h3>
              {priceLoading ? (
                <div className="h-72 animate-pulse bg-surface-700 rounded" />
              ) : (
                <PriceChart data={price ?? []} />
              )}
            </div>
            <div className="card">
              <h3 className="text-sm font-medium mb-3">{t('research.technicals')}</h3>
              <TechChart data={price ?? []} />
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
