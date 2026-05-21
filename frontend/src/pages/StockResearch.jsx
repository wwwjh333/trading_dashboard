import { useGlobalStore } from '../store/globalStore'
import { useStockList, useStockSummary } from '../hooks/useStock'
import { useNews } from '../hooks/useNews'
import TradingViewChart from '../components/charts/TradingViewChart'
import OptionsCard from '../components/cards/OptionsCard'
import NewsCard from '../components/cards/NewsCard'
import StockSearchBox from '../components/layout/StockSearchBox'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

export default function StockResearch() {
  const { t } = useTranslation()
  const { selectedTicker, setSelectedTicker } = useGlobalStore()

  const { data: stockList } = useStockList()
  const { data: summary } = useStockSummary(selectedTicker)
  const { data: news } = useNews(selectedTicker, 20)

  const tickers = (stockList ?? []).map((s) => s.ticker)

  return (
    <div className="flex gap-4 h-full">
      <aside className="w-44 shrink-0 flex flex-col gap-2">
        <StockSearchBox
          placeholder="搜索代码或公司名…"
          onSelect={(ticker) => setSelectedTicker(ticker)}
        />

        <div className="flex-1 overflow-y-auto space-y-0.5 max-h-[calc(100vh-220px)]">
          {tickers.map((ticker) => (
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
          {tickers.length === 0 && (
            <p className="text-gray-600 text-xs text-center py-3">暂无自选股</p>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0 space-y-4">
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
            </div>
          </div>
        </div>

        {/* Full-width chart — time range via TradingView toolbar */}
        <div className="card !p-0 overflow-hidden">
          <TradingViewChart ticker={selectedTicker} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <OptionsCard ticker={selectedTicker} />
          <div className="card">
            <h3 className="text-sm font-medium mb-3">{t('research.relatedNews')}</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(news ?? []).slice(0, 8).map((n) => <NewsCard key={n.id} item={n} />)}
              {!news?.length && <p className="text-gray-500 text-sm">{t('common.noData')}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
