import dayjs from 'dayjs'
import { useState } from 'react'
import { catalystsApi } from '../../api/index'
import { useQueryClient } from '@tanstack/react-query'

const TYPE_COLORS = {
  earnings: 'text-accent-blue',
  macro: 'text-accent-purple',
  product: 'text-accent-green',
  policy: 'text-accent-yellow',
}

export default function CatalystCard({ item }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [thesis, setThesis] = useState(item.user_thesis ?? '')
  const [saving, setSaving] = useState(false)

  const daysUntil = dayjs(item.event_date).diff(dayjs(), 'day')

  const save = async () => {
    setSaving(true)
    try {
      await catalystsApi.updateThesis(item.id, thesis)
      qc.invalidateQueries({ queryKey: ['catalysts'] })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {item.ticker && <span className="text-accent-blue font-medium">${item.ticker}</span>}
            <span className={`text-xs ${TYPE_COLORS[item.catalyst_type] ?? 'text-gray-400'}`}>
              {item.catalyst_type}
            </span>
          </div>
          <p className="text-sm text-gray-200 mt-0.5">{item.event_name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{dayjs(item.event_date).format('MM/DD')}</p>
          <p className={`text-xs ${daysUntil <= 7 ? 'text-accent-red' : 'text-gray-500'}`}>
            {daysUntil === 0 ? '今天' : daysUntil > 0 ? `${daysUntil}天后` : `${Math.abs(daysUntil)}天前`}
          </p>
        </div>
      </div>

      {(item.eps_estimate || item.implied_move) && (
        <div className="flex gap-4 text-xs text-gray-400">
          {item.eps_estimate && <span>EPS预期: ${item.eps_estimate}</span>}
          {item.implied_move && (
            <span>隐含波动: <span className="text-accent-yellow">±{(item.implied_move * 100).toFixed(1)}%</span></span>
          )}
        </div>
      )}

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            placeholder="写下你的预判…"
            className="input-field resize-none h-20 text-xs"
          />
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-xs py-1">
              {saving ? '保存中…' : '保存'}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1">
              取消
            </button>
          </div>
        </div>
      ) : (
        <div
          className="text-xs text-gray-400 cursor-pointer hover:text-gray-300"
          onClick={() => setEditing(true)}
        >
          {item.user_thesis ? (
            <p className="text-gray-300">{item.user_thesis}</p>
          ) : (
            <p className="text-surface-600 italic">点击填写预判…</p>
          )}
        </div>
      )}
    </div>
  )
}
