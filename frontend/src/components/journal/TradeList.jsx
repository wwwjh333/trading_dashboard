import { useState } from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { useDeleteTrade, useUpdateTrade } from '../../hooks/useTrades'
import { useForm } from 'react-hook-form'
import clsx from 'clsx'

function ExitForm({ trade, onClose }) {
  const { t } = useTranslation()
  const update = useUpdateTrade()
  const { register, handleSubmit, formState: { isSubmitting } } = useForm()

  const onSubmit = async (data) => {
    await update.mutateAsync({
      id: trade.id,
      data: {
        exit_date: data.exit_date,
        exit_price: parseFloat(data.exit_price),
        outcome_notes: data.outcome_notes,
        lesson: data.lesson,
        rating: data.rating ? parseInt(data.rating) : undefined,
      },
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3 border-t border-surface-600 pt-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('trades.exitDate')}</label>
          <input type="date" {...register('exit_date', { required: true })} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('trades.exitPrice')}</label>
          <input type="number" step="0.01" {...register('exit_price', { required: true })} className="input-field" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">{t('trades.outcomeNotes')}</label>
        <textarea {...register('outcome_notes')} rows={2} className="input-field resize-none text-xs" />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">{t('trades.lesson')}</label>
        <input {...register('lesson')} className="input-field" />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">{t('trades.ratingLabel')}</label>
        <select {...register('rating')} className="input-field w-24">
          <option value="">—</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary text-xs py-1">
          {isSubmitting ? t('common.saving') : t('trades.recordExit')}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary text-xs py-1">{t('common.cancel')}</button>
      </div>
    </form>
  )
}

function TradeRow({ trade }) {
  const { t } = useTranslation()
  const [showExit, setShowExit] = useState(false)
  const deleteTrade = useDeleteTrade()
  const isClosed = trade.exit_date != null

  const pnl = trade.pnl ? parseFloat(trade.pnl) : null
  const pnlPct = trade.pnl_pct ? parseFloat(trade.pnl_pct) : null

  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-accent-blue">${trade.ticker}</span>
          <span className={clsx('text-xs px-2 py-0.5 rounded-full border', {
            'text-accent-green border-green-800 bg-green-900/30': trade.direction === 'long',
            'text-accent-red border-red-800 bg-red-900/30': trade.direction === 'short',
          })}>
            {trade.direction === 'long' ? t('trades.long') : t('trades.short')}
          </span>
          <span className="text-xs text-gray-400">
            {trade.instrument === 'stock' ? t('trades.stock') :
             trade.instrument === 'call' ? t('trades.call') : t('trades.put')}
          </span>
          {trade.catalyst_type && (
            <span className="text-xs text-accent-yellow">
              {t(`trades.${trade.catalyst_type}`, { defaultValue: trade.catalyst_type })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pnl != null && (
            <span className={clsx('text-sm font-medium', pnl >= 0 ? 'positive' : 'negative')}>
              {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}
              {pnlPct != null && ` (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)`}
            </span>
          )}
          <span className={clsx('text-xs px-2 py-0.5 rounded-full', isClosed ? 'bg-surface-600 text-gray-400' : 'bg-blue-900/30 text-accent-blue border border-blue-800')}>
            {isClosed ? t('trades.closed') : t('trades.open')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
        <span>{t('trades.entry')}: {dayjs(trade.entry_date).format('MM/DD')} @ ${parseFloat(trade.entry_price).toFixed(2)}</span>
        {isClosed && <span>{t('trades.exit')}: {dayjs(trade.exit_date).format('MM/DD')} @ ${parseFloat(trade.exit_price).toFixed(2)}</span>}
        <span>{t('trades.position')}: {trade.position_size}</span>
        {trade.rating && <span>{t('trades.ratingShort')}: {'⭐'.repeat(trade.rating)}</span>}
      </div>

      <p className="text-xs text-gray-300 line-clamp-2">{trade.thesis}</p>

      {trade.outcome_notes && (
        <p className="text-xs text-gray-400 italic">{trade.outcome_notes}</p>
      )}

      {trade.lesson && (
        <p className="text-xs text-accent-yellow">📝 {trade.lesson}</p>
      )}

      {!isClosed && (
        <div>
          <button onClick={() => setShowExit(!showExit)} className="text-xs text-accent-blue hover:underline">
            {showExit ? t('common.collapse') : t('trades.recordExit')}
          </button>
          {showExit && <ExitForm trade={trade} onClose={() => setShowExit(false)} />}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => { if (confirm(t('trades.confirmDelete'))) deleteTrade.mutate(trade.id) }}
          className="text-xs text-gray-600 hover:text-accent-red"
        >
          {t('common.delete')}
        </button>
      </div>
    </div>
  )
}

const PAGE_SIZE = 20

export default function TradeList({ trades = [] }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)

  const filtered = trades.filter((tr) => {
    if (filter === 'open') return !tr.exit_date
    if (filter === 'closed') return !!tr.exit_date
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleFilterChange(f) {
    setFilter(f)
    setPage(0)
  }

  const FILTER_OPTIONS = [
    ['all', t('common.all')],
    ['open', t('trades.open')],
    ['closed', t('trades.closed')],
  ]

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {FILTER_OPTIONS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => handleFilterChange(v)}
            className={clsx('text-xs px-3 py-1.5 rounded-md border', {
              'bg-accent-blue text-surface-900 border-accent-blue': filter === v,
              'bg-surface-700 text-gray-400 border-surface-600': filter !== v,
            })}
          >
            {l}
          </button>
        ))}
      </div>

      {paginated.length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-8">{t('trades.noTrades')}</div>
      ) : (
        paginated.map((tr) => <TradeRow key={tr.id} trade={tr} />)
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="btn-secondary text-xs px-3 py-1 disabled:opacity-30"
          >
            ←
          </button>
          <span className="text-xs text-gray-400">
            {t('common.pageOf', { current: page + 1, total: totalPages })}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
            className="btn-secondary text-xs px-3 py-1 disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
