import { useState } from 'react'
import dayjs from 'dayjs'
import { useDeleteTrade, useUpdateTrade } from '../../hooks/useTrades'
import { useForm } from 'react-hook-form'
import clsx from 'clsx'

function ExitForm({ trade, onClose }) {
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
          <label className="text-xs text-gray-400 block mb-1">出场日期</label>
          <input type="date" {...register('exit_date', { required: true })} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">出场价格</label>
          <input type="number" step="0.01" {...register('exit_price', { required: true })} className="input-field" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">复盘笔记</label>
        <textarea {...register('outcome_notes')} rows={2} className="input-field resize-none text-xs" />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">经验教训</label>
        <input {...register('lesson')} className="input-field" />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">决策质量评分 (1-5)</label>
        <select {...register('rating')} className="input-field w-24">
          <option value="">—</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary text-xs py-1">
          {isSubmitting ? '保存中…' : '记录出场'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary text-xs py-1">取消</button>
      </div>
    </form>
  )
}

function TradeRow({ trade }) {
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
            {trade.direction}
          </span>
          <span className="text-xs text-gray-400">{trade.instrument}</span>
          {trade.catalyst_type && (
            <span className="text-xs text-accent-yellow">{trade.catalyst_type}</span>
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
            {isClosed ? '已平仓' : '持仓中'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
        <span>进场: {dayjs(trade.entry_date).format('MM/DD')} @ ${parseFloat(trade.entry_price).toFixed(2)}</span>
        {isClosed && <span>出场: {dayjs(trade.exit_date).format('MM/DD')} @ ${parseFloat(trade.exit_price).toFixed(2)}</span>}
        <span>仓位: {trade.position_size}</span>
        {trade.rating && <span>评分: {'⭐'.repeat(trade.rating)}</span>}
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
            {showExit ? '收起' : '记录出场'}
          </button>
          {showExit && <ExitForm trade={trade} onClose={() => setShowExit(false)} />}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => { if (confirm('确认删除此交易记录？')) deleteTrade.mutate(trade.id) }}
          className="text-xs text-gray-600 hover:text-accent-red"
        >
          删除
        </button>
      </div>
    </div>
  )
}

export default function TradeList({ trades = [] }) {
  const [filter, setFilter] = useState('all')

  const filtered = trades.filter((t) => {
    if (filter === 'open') return !t.exit_date
    if (filter === 'closed') return !!t.exit_date
    return true
  })

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[['all', '全部'], ['open', '持仓中'], ['closed', '已平仓']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={clsx('text-xs px-3 py-1.5 rounded-md border', {
              'bg-accent-blue text-surface-900 border-accent-blue': filter === v,
              'bg-surface-700 text-gray-400 border-surface-600': filter !== v,
            })}
          >
            {l}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-8">暂无交易记录</div>
      ) : (
        filtered.map((t) => <TradeRow key={t.id} trade={t} />)
      )}
    </div>
  )
}
