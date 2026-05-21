import { useQuery } from '@tanstack/react-query'
import { optionsApi } from '../../api/index'
import dayjs from 'dayjs'

function IVMeter({ value, label }) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  const color = pct > 70 ? 'bg-accent-red' : pct > 40 ? 'bg-accent-yellow' : 'bg-accent-green'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-medium">{pct.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-surface-600 rounded-full">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function OptionsCard({ ticker }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['options', ticker],
    queryFn: () => optionsApi.getSnapshot(ticker),
    staleTime: 60 * 60_000,
    enabled: !!ticker,
  })

  if (isLoading) return <div className="card animate-pulse h-32" />
  if (isError || !data?.length) {
    return (
      <div className="card text-gray-500 text-sm">暂无期权数据</div>
    )
  }

  const first = data[0]

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">期权数据</h3>
        <span className="text-xs text-gray-500">到期: {dayjs(first.expiry_date).format('MM/DD')}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-400">ATM IV</p>
          <p className="text-lg font-medium text-accent-blue">
            {first.iv_atm ? `${(first.iv_atm * 100).toFixed(1)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">隐含波动</p>
          <p className="text-lg font-medium text-accent-yellow">
            {first.implied_move ? `±${(first.implied_move).toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      {first.iv_rank != null && <IVMeter value={first.iv_rank} label="IV Rank" />}
      {first.iv_percentile != null && <IVMeter value={first.iv_percentile} label="IV Percentile" />}

      {first.put_call_ratio != null && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Put/Call Ratio</span>
          <span className={first.put_call_ratio > 1 ? 'text-accent-red' : 'text-accent-green'}>
            {first.put_call_ratio.toFixed(2)}
          </span>
        </div>
      )}

      {data.length > 1 && (
        <div className="border-t border-surface-600 pt-2 text-xs text-gray-500">
          次近到期: {dayjs(data[1].expiry_date).format('MM/DD')}
          {data[1].iv_atm && ` · IV ${(data[1].iv_atm * 100).toFixed(1)}%`}
        </div>
      )}
    </div>
  )
}
