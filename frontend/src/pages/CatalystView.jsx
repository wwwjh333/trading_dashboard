import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { catalystsApi } from '../api/index'
import CatalystCard from '../components/cards/CatalystCard'
import dayjs from 'dayjs'
import clsx from 'clsx'

const TYPE_FILTERS = ['all', 'earnings', 'macro', 'product', 'policy']

function WeekGroup({ label, items }) {
  if (!items.length) return null
  return (
    <div>
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
        <span>{label}</span>
        <span className="bg-surface-600 text-gray-400 px-1.5 py-0.5 rounded text-xs">{items.length}</span>
      </h3>
      <div className="space-y-2">
        {items.map((c) => <CatalystCard key={c.id} item={c} />)}
      </div>
    </div>
  )
}

export default function CatalystView() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [days, setDays] = useState(60)

  const { data, isLoading } = useQuery({
    queryKey: ['catalysts', 'upcoming', days],
    queryFn: () => catalystsApi.getUpcoming(days, 30),
    staleTime: 15 * 60_000,
  })

  const filtered = (data ?? []).filter(
    (c) => typeFilter === 'all' || c.catalyst_type === typeFilter,
  )

  const today = dayjs()
  const past   = filtered.filter((c) => dayjs(c.event_date).isBefore(today, 'day'))
  const week1  = filtered.filter((c) => { const d = dayjs(c.event_date).diff(today, 'day'); return d >= 0 && d <= 7 })
  const week2  = filtered.filter((c) => { const d = dayjs(c.event_date).diff(today, 'day'); return d > 7 && d <= 14 })
  const beyond = filtered.filter((c) => dayjs(c.event_date).diff(today, 'day') > 14)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-medium">催化剂日历</h1>
        <div className="flex gap-1">
          {[28, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={clsx('px-3 py-1 rounded text-xs border', {
                'bg-surface-600 text-gray-200 border-surface-500': days === d,
                'text-gray-500 border-transparent hover:text-gray-300': days !== d,
              })}
            >
              {d}天
            </button>
          ))}
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={clsx('px-3 py-1.5 rounded-md text-xs border', {
              'bg-accent-blue text-surface-900 border-accent-blue': typeFilter === t,
              'bg-surface-700 text-gray-400 border-surface-600': typeFilter !== t,
            })}
          >
            {t === 'all' ? '全部' : t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="card h-24 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          <WeekGroup label="本周 (7天内)" items={week1} />
          <WeekGroup label="第2周 (8-14天)" items={week2} />
          <WeekGroup label="更远期" items={beyond} />
          <WeekGroup label="近30天已发生" items={[...past].reverse()} />
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>未来 {days} 天内无催化剂事件</p>
              <p className="text-xs mt-1">可切换至 60天 或 90天 查看更多</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
