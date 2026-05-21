import { useState } from 'react'
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
  const [search, setSearch] = useState('')

  const { data: stockList } = useStockList()
  const { data: price, isLoading: priceLoading } = useStockPrice(selectedTicker, dateRange)
  const { data: summary } = useStockSummary(selectedTicker)
  const { data: news } = useNews(selectedTicker, 20)

  const tickers = (stockList ?? []).map((s) => s.ticker)

  const handleSearch = (e) => {
    e.preventDefault()
    const val = search.trim().toUpperCase()
    if (val) { setSelectedTicker(val); setSearch('') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {tickers.map((ticker) => (
            <button
              key={ticker}
              onClick={() => setSelectedTicker(ticker)}
              className={clsx('px-3 py-1.5 rounded-md text-sm border transition-colors', {
                'bg-accent-blue text-surface-900 border-accent-blue': selectedTicker === ticker,
                'bg-surface-700 text-gray-400 border-surface-600 hover:text-gray-200': selectedTicker !== ticker,
              })}
            >
              {ticker}
            </button>
          ))}

          {/* Free-form ticker search */}
          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              placeholder={t('research.searchTicker')}
              className="bg-surface-700 border border-surface-600 text-gray-200 rounded-md px-2 py-1.5 text-sm w-24 focus:outline-none focus:border-accent-blue uppercase"
              maxLength={10}
            />
            <button type="submit" className="btn-secondary text-xs py-1.5 px-2">Go</button>
          </form>
        </div>

        <div className="flex gap-1">
          {DATE_RANGES.map((d) => (
            <button
              key={d}
              onClick={() => setDateRange(d)}
              className={clsx('px-2 py-1 rounded text-xs border', {
                'bg-surface-600 text-gray-200 border-surface-500': dateRange === d,
                'text-gray-500 border-transparent': dateRange !== d,
              })}
            >
              {d}{t('common.days')}
            </button>
          ))}
        </div>
      </div>

      {summary && (
        <div className="card">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-medium text-accent-blue">${selectedTicker}</h2>
              {summary.name && <span className="text-gray-400">{summary.name}</span>}
              {summary.sector && <span className="text-xs text-gray-500 bg-surface-700 px-2 py-0.5 rounded">{summary.sector}</span>}
              {summary.supply_chain_layer && <span className="text-xs text-accent-yellow">{summary.supply_chain_layer}</span>}
            </div>
            <div className="flex items-center gap-4">
              {summary.latest_price && (
                <span className="text-2xl font-medium">${parseFloat(summary.latest_price).toFixed(2)}</span>
              )}
              {summary.price_change_pct != null && (
                <span className={`text-lg ${summary.price_change_pct >= 0 ? 'positive' : 'negative'}`}>
                  {summary.price_change_pct >= 0 ? '+' : ''}{summary.price_change_pct.toFixed(2)}%
                </span>
              )}
              {summary.rsi_14 && (
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
            </div>
          </div>
          {summary.user_notes && (
            <p className="text-sm text-gray-400 mt-3 border-t border-surface-600 pt-3">
              {summary.user_notes}
            </p>
          )}
        </div>
      )}

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
  )
}
