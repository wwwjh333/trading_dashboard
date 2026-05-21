import { useTranslation } from 'react-i18next'
import { useTradeStats } from '../../hooks/useTrades'

function StatBox({ label, value, sub, color }) {
  return (
    <div className="card text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-2xl font-medium mt-1 ${color ?? ''}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function TradeStats() {
  const { t } = useTranslation()
  const { data, isLoading } = useTradeStats()

  if (isLoading) return <div className="grid grid-cols-4 gap-3">{[...Array(8)].map((_, i) => <div key={i} className="card h-20 animate-pulse" />)}</div>
  if (!data) return null

  const winRate = data.win_rate?.toFixed(1)
  const totalPnl = data.total_pnl
  const avgPnl = data.avg_pnl?.toFixed(0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatBox
        label={t('trades.totalTrades')}
        value={data.total_trades}
        sub={t('trades.openClosed', { open: data.open_trades, closed: data.closed_trades })}
      />
      <StatBox
        label={t('trades.winRate')}
        value={winRate ? `${winRate}%` : '—'}
        color={parseFloat(winRate) > 50 ? 'positive' : 'negative'}
      />
      <StatBox
        label={t('trades.totalPnl')}
        value={totalPnl != null ? `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(0)}` : '—'}
        color={totalPnl >= 0 ? 'positive' : 'negative'}
      />
      <StatBox label={t('trades.avgPnl')} value={avgPnl != null ? `$${avgPnl}` : '—'} />
      <StatBox
        label={t('trades.bestTrade')}
        value={data.best_trade_pnl != null ? `+$${data.best_trade_pnl.toFixed(0)}` : '—'}
        color="positive"
      />
      <StatBox
        label={t('trades.worstTrade')}
        value={data.worst_trade_pnl != null ? `$${data.worst_trade_pnl.toFixed(0)}` : '—'}
        color="negative"
      />
      <StatBox label={t('trades.avgRating')} value={data.avg_rating?.toFixed(1)} sub={t('trades.ratingMax')} />
      <StatBox label={t('trades.closed')} value={data.closed_trades} />
    </div>
  )
}
