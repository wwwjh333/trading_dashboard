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
  const { data, isLoading } = useTradeStats()

  if (isLoading) return <div className="grid grid-cols-4 gap-3">{[...Array(8)].map((_, i) => <div key={i} className="card h-20 animate-pulse" />)}</div>
  if (!data) return null

  const winRate = data.win_rate?.toFixed(1)
  const totalPnl = data.total_pnl
  const avgPnl = data.avg_pnl?.toFixed(0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatBox label="总交易次数" value={data.total_trades} sub={`${data.open_trades} 持仓 · ${data.closed_trades} 已平`} />
      <StatBox
        label="胜率"
        value={winRate ? `${winRate}%` : '—'}
        color={parseFloat(winRate) > 50 ? 'positive' : 'negative'}
      />
      <StatBox
        label="总盈亏"
        value={totalPnl != null ? `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(0)}` : '—'}
        color={totalPnl >= 0 ? 'positive' : 'negative'}
      />
      <StatBox label="平均盈亏" value={avgPnl != null ? `$${avgPnl}` : '—'} />
      <StatBox
        label="最佳交易"
        value={data.best_trade_pnl != null ? `+$${data.best_trade_pnl.toFixed(0)}` : '—'}
        color="positive"
      />
      <StatBox
        label="最差交易"
        value={data.worst_trade_pnl != null ? `$${data.worst_trade_pnl.toFixed(0)}` : '—'}
        color="negative"
      />
      <StatBox label="平均决策评分" value={data.avg_rating?.toFixed(1)} sub="满分5分" />
      <StatBox label="已平仓" value={data.closed_trades} />
    </div>
  )
}
