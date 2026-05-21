import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        <h1 className="text-lg font-medium">{t('catalyst.title')}</h1>
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
              {t('common.daysCount', { count: d })}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TYPE_FILTERS.map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={clsx('px-3 py-1.5 rounded-md text-xs border', {
              'bg-accent-blue text-surface-900 border-accent-blue': typeFilter === type,
              'bg-surface-700 text-gray-400 border-surface-600': typeFilter !== type,
            })}
          >
            {type === 'all' ? t('common.all') : t(`catalyst.types.${type}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="card h-24 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          <WeekGroup label={t('catalyst.week1')} items={week1} />
          <WeekGroup label={t('catalyst.week2')} items={week2} />
          <WeekGroup label={t('catalyst.beyond')} items={beyond} />
          <WeekGroup label={t('catalyst.past30')} items={[...past].reverse()} />
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>{t('catalyst.emptyFuture', { days })}</p>
              <p className="text-xs mt-1">{t('catalyst.emptyHint')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
