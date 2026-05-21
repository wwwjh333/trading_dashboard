import { useState } from 'react'
import { useMacroLatest } from '../hooks/useMacro'
import { useNews, useRefreshNews } from '../hooks/useNews'
import { useStockList, useStockSummary } from '../hooks/useStock'
import NewsCard from '../components/cards/NewsCard'
import MacroCard from '../components/cards/MacroCard'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

const STATIC_TAGS = ['FED', 'MACRO', 'SEMI', 'TECH']

function StockSummaryRow({ ticker }) {
  const { data } = useStockSummary(ticker)
  if (!data) return null

  const change = data.price_change_pct
  const positive = change > 0

  return (
    <div className="card flex items-center justify-between hover:border-surface-500 transition-colors">
      <div>
        <span className="font-medium text-accent-blue">${data.ticker}</span>
        {data.name && <span className="text-gray-400 text-xs ml-2">{data.name}</span>}
      </div>
      <div className="flex items-center gap-4 text-sm">
        {data.latest_price && (
          <span className="font-medium">${parseFloat(data.latest_price).toFixed(2)}</span>
        )}
        {change != null && (
          <span className={positive ? 'positive' : 'negative'}>
            {positive ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
        {data.rsi_14 && (
          <span className={clsx('text-xs', {
            'text-accent-red': data.rsi_14 > 70,
            'text-accent-green': data.rsi_14 < 30,
            'text-gray-400': data.rsi_14 >= 30 && data.rsi_14 <= 70,
          })}>
            RSI {parseFloat(data.rsi_14).toFixed(0)}
          </span>
        )}
        {data.supply_chain_layer && (
          <span className="text-xs text-gray-500">{data.supply_chain_layer}</span>
        )}
      </div>
    </div>
  )
}

const MACRO_ORDER = ['VIXCLS', 'QQQ', 'SOX', 'DFII10', 'DGS10', 'DGS2', 'DXY']

export default function DailyOverview() {
  const { t } = useTranslation()
  const { data: macro } = useMacroLatest()
  const [newsFilter, setNewsFilter] = useState('all')
  const { data: news, isLoading: newsLoading } = useNews(null, 100)
  const { data: stocks, isLoading: stocksLoading } = useStockList()
  const refreshNews = useRefreshNews()

  const activeTickers = (stocks ?? []).filter((s) => s.is_active).map((s) => s.ticker)
  const allNews = news ?? []
  const filteredNews = newsFilter === 'all' ? allNews : allNews.filter((n) => n.ticker === newsFilter)
  const highImpact = allNews.filter((n) => n.impact_level === 'high').slice(0, 3)
  const recentNews = filteredNews.slice(0, 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">{t('nav.overview')}</h1>
        <button
          onClick={() => refreshNews.mutate()}
          disabled={refreshNews.isPending}
          className="btn-secondary text-xs"
        >
          {refreshNews.isPending ? t('common.refreshing') : t('overview.refreshNews')}
        </button>
      </div>

      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t('overview.macroSignals')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {(macro ?? []).slice().sort((a, b) => {
            const ai = MACRO_ORDER.indexOf(a.indicator)
            const bi = MACRO_ORDER.indexOf(b.indicator)
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
          }).map((item) => (
            <MacroCard
              key={item.indicator}
              indicator={item.indicator}
              latestValue={item.value}
              change={item.change}
            />
          ))}
        </div>
      </section>

      {highImpact.length > 0 && (
        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t('overview.majorNews')}</h2>
          <div className="space-y-2">
            {highImpact.map((n) => <NewsCard key={n.id} item={n} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t('overview.watchlist')}</h2>
        {stocksLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[...Array(6)].map((_, i) => <div key={i} className="card h-12 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {activeTickers.map((t) => <StockSummaryRow key={t} ticker={t} />)}
          </div>
        )}
        {!stocksLoading && activeTickers.length === 0 && (
          <p className="text-gray-500 text-sm">{t('overview.emptyWatchlist')}</p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider">{t('overview.newsFeed')}</h2>
          <div className="flex flex-wrap gap-1">
            {['all', ...STATIC_TAGS, ...activeTickers].map((tag) => (
              <button
                key={tag}
                onClick={() => setNewsFilter(tag)}
                className={clsx('px-2 py-0.5 rounded text-xs border transition-colors', {
                  'bg-accent-blue text-surface-900 border-accent-blue': newsFilter === tag,
                  'text-gray-400 border-surface-600 hover:text-gray-200 hover:border-surface-500': newsFilter !== tag,
                })}
              >
                {tag === 'all' ? '全部' : tag}
              </button>
            ))}
          </div>
        </div>
        {newsLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="card h-16 animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2">
            {recentNews.length > 0
              ? recentNews.map((n) => <NewsCard key={n.id} item={n} />)
              : <p className="text-gray-500 text-sm py-4 text-center">该分类暂无新闻</p>
            }
          </div>
        )}
      </section>
    </div>
  )
}
