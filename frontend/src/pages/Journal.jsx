import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTrades } from '../hooks/useTrades'
import TradeForm from '../components/journal/TradeForm'
import TradeList from '../components/journal/TradeList'
import TradeStats from '../components/journal/TradeStats'

export default function Journal() {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const { data: trades, isLoading } = useTrades()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">{t('trades.title')}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? t('trades.hideForm') : t('trades.newTrade')}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-sm font-medium mb-4">{t('trades.newRecord')}</h2>
          <TradeForm onClose={() => setShowForm(false)} />
        </div>
      )}

      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t('trades.statsOverview')}</h2>
        <TradeStats />
      </section>

      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          {t('trades.tradeRecords')}
          {trades && <span className="ml-2 text-gray-600">({trades.length})</span>}
        </h2>
        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="card h-28 animate-pulse" />)}</div>
        ) : (
          <TradeList trades={trades ?? []} />
        )}
      </section>
    </div>
  )
}
