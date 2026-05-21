import { useState } from 'react'
import { useCreateBasket, useDeleteBasket, useUpdateBasket } from '../../hooks/useBaskets'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

export default function BasketManager({ baskets, selectedId, onSelect }) {
  const { t } = useTranslation()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editTickers, setEditTickers] = useState('')

  const createMutation = useCreateBasket()
  const deleteMutation = useDeleteBasket()
  const updateMutation = useUpdateBasket()

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    const color = COLORS[baskets.length % COLORS.length]
    await createMutation.mutateAsync({ name: newName.trim(), tickers: [], color })
    setNewName('')
    setCreating(false)
  }

  const startEdit = (basket) => {
    setEditingId(basket.id)
    setEditName(basket.name)
    setEditTickers((basket.tickers ?? []).join(', '))
  }

  const saveEdit = async (id) => {
    const tickers = editTickers.split(/[,\s]+/).map((t) => t.trim().toUpperCase()).filter(Boolean)
    await updateMutation.mutateAsync({ id, data: { name: editName.trim(), tickers } })
    setEditingId(null)
  }

  const handleDelete = async (id) => {
    if (!confirm(t('basket.confirmDelete'))) return
    await deleteMutation.mutateAsync(id)
    if (selectedId === id && baskets.length > 1) {
      const next = baskets.find((b) => b.id !== id)
      if (next) onSelect(next.id)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider">{t('basket.title')}</span>
        <button onClick={() => setCreating(true)} className="text-xs text-accent-blue hover:text-blue-400">
          + {t('basket.new')}
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="flex gap-2 mb-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('basket.namePlaceholder')}
            className="input-field flex-1 py-1 text-xs"
          />
          <button type="submit" className="btn-primary text-xs py-1 px-2">{t('common.save')}</button>
          <button type="button" onClick={() => setCreating(false)} className="btn-secondary text-xs py-1 px-2">{t('common.cancel')}</button>
        </form>
      )}

      <div className="space-y-1">
        {baskets.map((basket) => (
          <div key={basket.id}>
            {editingId === basket.id ? (
              <div className="bg-surface-700 rounded p-2 space-y-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-field w-full py-1 text-xs"
                />
                <input
                  value={editTickers}
                  onChange={(e) => setEditTickers(e.target.value.toUpperCase())}
                  placeholder="NVDA, AMD, MSFT ..."
                  className="input-field w-full py-1 text-xs"
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(basket.id)} className="btn-primary text-xs py-1 px-2">{t('common.save')}</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary text-xs py-1 px-2">{t('common.cancel')}</button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => onSelect(basket.id)}
                className={clsx('flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors group', {
                  'bg-surface-600 border border-surface-500': selectedId === basket.id,
                  'hover:bg-surface-700': selectedId !== basket.id,
                })}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: basket.color ?? '#6b7280' }} />
                  <span className="text-sm truncate">{basket.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">{(basket.tickers ?? []).length}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(basket) }}
                    className="text-gray-400 hover:text-gray-200 text-xs px-1"
                  >✎</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(basket.id) }}
                    className="text-gray-400 hover:text-accent-red text-xs px-1"
                  >✕</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!baskets.length && !creating && (
        <p className="text-gray-500 text-xs text-center py-4">{t('basket.empty')}</p>
      )}
    </div>
  )
}
