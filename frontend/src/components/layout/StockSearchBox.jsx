import { useState, useEffect, useRef } from 'react'
import { stocksApi } from '../../api/index'
import clsx from 'clsx'

/**
 * Debounced Yahoo stock search with dropdown.
 * onSelect(ticker, item) — user picked a result
 */
export default function StockSearchBox({
  placeholder = '搜索代码或公司名…',
  onSelect,
  className = '',
  inputClassName = 'input-field py-1.5 text-xs w-full',
  clearOnSelect = true,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const wrapRef = useRef(null)
  const debounceRef = useRef(null)
  const reqIdRef = useRef(0)

  useEffect(() => {
    const q = query.trim()
    clearTimeout(debounceRef.current)

    if (q.length < 1) {
      setResults([])
      setLoading(false)
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(false)

    debounceRef.current = setTimeout(async () => {
      const id = ++reqIdRef.current
      try {
        const data = await stocksApi.search(q)
        if (id !== reqIdRef.current) return
        setResults(data ?? [])
      } catch {
        if (id !== reqIdRef.current) return
        setResults([])
      } finally {
        if (id !== reqIdRef.current) return
        setLoading(false)
        setSearched(true)
      }
    }, 400)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (item) => {
    onSelect?.(item.ticker, item)
    if (clearOnSelect) setQuery('')
    setOpen(false)
  }

  const showPanel = open && query.trim().length > 0

  return (
    <div ref={wrapRef} className={clsx('relative', className)}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
      />
      {showPanel && (
        <div className="absolute top-full left-0 right-0 mt-0.5 bg-surface-800 border border-surface-600 rounded-lg shadow-xl z-[60] max-h-56 overflow-y-auto min-w-[220px]">
          {loading && (
            <div className="px-3 py-2.5 text-xs text-gray-500">搜索中…</div>
          )}
          {!loading && searched && results.length === 0 && (
            <div className="px-3 py-2.5 text-xs text-gray-500">未找到匹配股票</div>
          )}
          {!loading && results.map((r) => (
            <button
              key={`${r.ticker}-${r.exchange}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r)}
              className="w-full text-left px-3 py-2 hover:bg-surface-700 transition-colors border-b border-surface-700 last:border-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-accent-blue">{r.ticker}</span>
                <span className="text-xs text-gray-600 shrink-0">{r.exchange}</span>
              </div>
              {r.name && <p className="text-xs text-gray-400 truncate mt-0.5">{r.name}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
