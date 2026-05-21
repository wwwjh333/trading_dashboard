import { useState } from 'react'
import { useStockList } from '../../hooks/useStock'
import { stocksApi } from '../../api/index'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import StockSearchBox from './StockSearchBox'

export default function WatchlistManager({ onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: stocks, isLoading } = useStockList()
  const [newTicker, setNewTicker] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [addedTicker, setAddedTicker] = useState('')

  const addTicker = async (ticker) => {
    const code = ticker.trim().toUpperCase()
    if (!code || adding) return
    setAdding(true)
    setError('')
    setAddedTicker('')
    try {
      await stocksApi.addStock({ ticker: code, name: null, sector: null, supply_chain_layer: null })
      qc.invalidateQueries({ queryKey: ['stocks'] })
      setNewTicker('')
      setAddedTicker(code)
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['price'] })
        qc.invalidateQueries({ queryKey: ['news'] })
        qc.invalidateQueries({ queryKey: ['summary'] })
      }, 35000)
    } catch (err) {
      setError(err.response?.data?.detail ?? t('watchlist.addError'))
    } finally {
      setAdding(false)
    }
  }

  const add = async (e) => {
    e.preventDefault()
    await addTicker(newTicker)
  }

  const remove = async (ticker) => {
    if (!confirm(t('watchlist.confirmRemove', { ticker }))) return
    try {
      await stocksApi.removeStock(ticker)
      qc.invalidateQueries({ queryKey: ['stocks'] })
    } catch {
      alert(t('watchlist.removeError'))
    }
  }

  return (
    <div className="absolute top-full right-0 mt-1 w-80 bg-surface-800 border border-surface-600 rounded-lg shadow-xl z-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('watchlist.title')}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
      </div>

      {/* Fuzzy search — click result to add directly */}
      <StockSearchBox
        placeholder={t('search.addPlaceholder')}
        onSelect={(ticker) => addTicker(ticker)}
        inputClassName="input-field py-1.5 text-xs w-full"
      />

      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span className="flex-1 border-t border-surface-600" />
        <span>{t('search.orEnterTicker')}</span>
        <span className="flex-1 border-t border-surface-600" />
      </div>

      <form onSubmit={add} className="flex gap-2">
        <input
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
          placeholder={t('watchlist.placeholder')}
          className="input-field flex-1 py-1 text-xs uppercase"
          maxLength={12}
        />
        <button type="submit" disabled={adding} className="btn-primary text-xs py-1 px-3">
          {adding ? '…' : t('common.add')}
        </button>
      </form>

      {error && <p className="text-accent-red text-xs">{error}</p>}
      {addedTicker && (
        <p className="text-accent-green text-xs">
          {t('search.addedPending', { ticker: addedTicker })}
        </p>
      )}

      <div className="space-y-1 max-h-60 overflow-y-auto">
        {isLoading && <div className="text-gray-500 text-xs">{t('common.loading')}</div>}
        {(stocks ?? []).map((s) => (
          <div key={s.ticker} className="flex items-center justify-between py-1 px-2 rounded hover:bg-surface-700">
            <div className="min-w-0">
              <span className="text-sm text-accent-blue font-medium">${s.ticker}</span>
              {s.name && <span className="text-xs text-gray-400 ml-2 truncate">{s.name}</span>}
            </div>
            <button
              onClick={() => remove(s.ticker)}
              className="text-gray-600 hover:text-accent-red text-xs shrink-0 ml-2"
            >
              {t('common.remove')}
            </button>
          </div>
        ))}
        {!isLoading && !stocks?.length && (
          <p className="text-gray-500 text-xs text-center py-2">{t('watchlist.empty')}</p>
        )}
      </div>
    </div>
  )
}
