import { useState, useRef, useEffect } from 'react'
import { useMacroLatest } from '../../hooks/useMacro'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

const STORAGE_KEY = 'macro_selected_indicators_v2'

const ALL_INDICATORS = [
  { id: 'VIXCLS',   label: 'VIX',     group: 'vol' },
  { id: 'MOVE',     label: 'MOVE',    group: 'vol' },
  { id: 'QQQ',      label: 'QQQ',     group: 'index' },
  { id: 'SOX',      label: 'SOX',     group: 'index' },
  { id: 'SPY',      label: 'SPY',     group: 'index' },
  { id: 'NDX',      label: 'NDX',     group: 'index' },
  { id: 'DFII10',   label: 'TIPS',    group: 'rates' },
  { id: 'DGS10',    label: '10Y',     group: 'rates' },
  { id: 'DGS2',     label: '2Y',      group: 'rates' },
  { id: 'DGS1',     label: '1Y',      group: 'rates' },
  { id: 'FEDFUNDS', label: 'FF',      group: 'rates' },
  { id: 'DXY',      label: 'DXY',     group: 'fx' },
  { id: 'GLD',      label: 'Gold',    group: 'commodity' },
  { id: 'OIL',      label: 'Oil',     group: 'commodity' },
]

const DEFAULT_SELECTED = ['VIXCLS', 'QQQ', 'SOX', 'DFII10', 'DGS10', 'DGS2', 'DXY']

function loadSelected() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return DEFAULT_SELECTED
}

function saveSelected(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

function MacroTicker({ item, label }) {
  const isLargeNum = ['SOX', 'NDX', 'SPY', 'QQQ'].includes(item.indicator)
  const val    = item.value?.toFixed(isLargeNum ? 0 : 2) ?? '--'
  const change = item.change
  const positive = change > 0
  const negative = change < 0

  return (
    <div className="flex items-center gap-1.5 px-3 border-r border-surface-600 last:border-0 flex-shrink-0 h-8">
      <span className="text-gray-500" style={{ fontSize: 10 }}>{label}</span>
      <span className="font-mono font-medium text-gray-200" style={{ fontSize: 11 }}>{val}</span>
      {change != null && (
        <span
          className={clsx('font-mono', { 'text-accent-green': positive, 'text-accent-red': negative, 'text-gray-500': !positive && !negative })}
          style={{ fontSize: 10 }}
        >
          {positive ? '+' : ''}{change.toFixed(2)}
        </span>
      )}
    </div>
  )
}

export default function MacroBar() {
  const { t } = useTranslation()
  const { data, isLoading } = useMacroLatest()
  const [selected, setSelected] = useState(loadSelected)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id]
    setSelected(next)
    saveSelected(next)
  }

  const labelMap = Object.fromEntries(ALL_INDICATORS.map((x) => [x.id, x.label]))

  const filtered = (data ?? [])
    .filter((d) => selected.includes(d.indicator))
    .sort((a, b) => selected.indexOf(a.indicator) - selected.indexOf(b.indicator))

  return (
    <div className="bg-surface-800 border-b border-surface-600 h-8 flex items-center pl-4 overflow-hidden relative text-xs">
      <span className="text-gray-600 mr-3 whitespace-nowrap flex-shrink-0 font-medium uppercase tracking-wider" style={{ fontSize: 10 }}>{t('macro.signals')}</span>
      <div className="flex items-center overflow-x-auto flex-1 min-w-0">
        {isLoading && <span className="text-gray-500 text-xs px-2">{t('common.loading')}</span>}
        {filtered.map((item) => (
          <MacroTicker key={item.indicator} item={item} label={labelMap[item.indicator] ?? item.indicator} />
        ))}
        {!isLoading && !filtered.length && (
          <span className="text-gray-600 text-xs px-2">{t('macro.noneSelected')}</span>
        )}
      </div>

      {/* Settings button */}
      <div ref={menuRef} className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="h-8 px-3 text-gray-500 hover:text-gray-300 hover:bg-surface-700 transition-colors border-l border-surface-600 flex items-center"
          title={t('macro.configure')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-px w-56 bg-surface-800 border border-surface-600 rounded-lg shadow-xl z-50 p-3">
            <p className="text-xs text-gray-500 mb-2">{t('macro.configTitle')}</p>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {ALL_INDICATORS.map((ind) => (
                <label key={ind.id} className="flex items-center gap-2 py-0.5 cursor-pointer hover:text-gray-200 text-gray-400">
                  <input
                    type="checkbox"
                    checked={selected.includes(ind.id)}
                    onChange={() => toggle(ind.id)}
                    className="accent-accent-blue"
                  />
                  <span className="text-xs">{ind.label}</span>
                  <span className="text-xs text-gray-600 ml-auto">{ind.id}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => { setSelected(DEFAULT_SELECTED); saveSelected(DEFAULT_SELECTED) }}
              className="mt-2 text-xs text-gray-500 hover:text-gray-300"
            >
              {t('macro.reset')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
