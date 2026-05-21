import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMultiStockSummary } from '../hooks/useStock'
import { useQuery } from '@tanstack/react-query'
import { catalystsApi } from '../api/index'
import clsx from 'clsx'
import dayjs from 'dayjs'

// ── 产业链层级配置（写死）─────────────────────────────────────
const LAYERS = [
  {
    id: 'cloud',
    name: '云厂商',
    nameEn: 'Cloud',
    displayTickers: ['MSFT', 'AMZN'],
    allTickers: ['MSFT', 'AMZN', 'GOOG'],
  },
  {
    id: 'server',
    name: '服务器',
    nameEn: 'Server',
    displayTickers: ['SMCI', 'DELL'],
    allTickers: ['SMCI', 'DELL'],
  },
  {
    id: 'chip',
    name: '芯片设计',
    nameEn: 'Chip Design',
    displayTickers: ['NVDA', 'AMD'],
    allTickers: ['NVDA', 'AMD', 'QCOM', 'INTC'],
  },
  {
    id: 'memory',
    name: 'HBM/存储',
    nameEn: 'Memory/HBM',
    displayTickers: ['MU'],
    allTickers: ['MU'],
  },
  {
    id: 'foundry',
    name: '晶圆/封装',
    nameEn: 'Foundry',
    displayTickers: ['TSM', 'AMKR'],
    allTickers: ['TSM', 'AMKR'],
  },
  {
    id: 'equipment',
    name: '设备',
    nameEn: 'Equipment',
    displayTickers: ['ASML', 'LRCX'],
    allTickers: ['ASML', 'LRCX', 'AMAT', 'KLAC'],
  },
  {
    id: 'materials',
    name: '材料',
    nameEn: 'Materials',
    displayTickers: ['ENTG'],
    allTickers: ['ENTG'],
  },
]

// ── 传导规则（写死）──────────────────────────────────────────
const PROPAGATION_RULES = [
  {
    trigger: 'cloud',
    icon: '☁',
    text: '云厂商领涨 → 关注芯片层，订单能见度将提升',
    textEn: 'Cloud leading → Watch chip layer, order visibility improving',
  },
  {
    trigger: 'chip',
    icon: '⚡',
    text: '芯片层领涨 → 关注 TSM 产能利用率，封装或成瓶颈',
    textEn: 'Chip leading → Watch TSM utilization, packaging may bottleneck',
  },
  {
    trigger: 'foundry',
    icon: '🏭',
    text: '晶圆层领涨 → 关注设备层，采购周期可能启动',
    textEn: 'Foundry leading → Watch equipment layer, capex cycle may begin',
  },
  {
    trigger: 'equipment',
    icon: '🔧',
    text: '设备层领涨 → 确认上游需求已传导完毕，注意周期顶部',
    textEn: 'Equipment leading → Upstream demand confirmed, watch for cycle top',
  },
  {
    trigger: 'all_down',
    icon: '⚠',
    text: '全线下跌 → 关注云厂商下季度 CapEx 指引是否有下调风险',
    textEn: 'Broad selloff → Watch cloud Capex guidance for downside risk',
  },
]

// ── 层级 → 股票映射（用于催化剂标注）──────────────────────────
const TICKER_LAYER = {}
LAYERS.forEach((l) => l.allTickers.forEach((t) => { TICKER_LAYER[t] = l.id }))

const LAYER_NAME = {}
LAYERS.forEach((l) => { LAYER_NAME[l.id] = l.name })

// ── 热力色计算 ────────────────────────────────────────────────
function heatConfig(pct) {
  if (pct == null) return { level: 0, colorClass: 'text-gray-500', barColor: 'bg-gray-600', label: '—' }
  const sign  = pct >= 0 ? '+' : ''
  const label = `${sign}${pct.toFixed(2)}%`
  if (pct >=  2.0) return { level:  5, colorClass: 'text-accent-green', barColor: 'bg-accent-green',        label }
  if (pct >=  0.5) return { level:  3, colorClass: 'text-green-400',    barColor: 'bg-green-600',           label }
  if (pct >= -0.5) return { level:  1, colorClass: 'text-gray-400',     barColor: 'bg-gray-500',            label }
  if (pct >= -2.0) return { level: -3, colorClass: 'text-orange-400',   barColor: 'bg-orange-700',          label }
                   return { level: -5, colorClass: 'text-accent-red',   barColor: 'bg-accent-red',          label }
}

function HeatBar({ level }) {
  const abs = Math.abs(level)
  const isNeg = level < 0
  const filled = isNeg ? 'bg-accent-red/70' : level >= 5 ? 'bg-accent-green' : level >= 3 ? 'bg-green-600' : 'bg-gray-500'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={clsx('h-3.5 rounded-sm transition-all', i <= abs ? filled : 'bg-surface-600')}
          style={{ width: i <= abs ? '10px' : '8px' }}
        />
      ))}
    </div>
  )
}

// ── 单层行 ────────────────────────────────────────────────────
function LayerRow({ layer, summaryMap, isLoading, isExpanded, onToggle, i18n }) {
  const avgChange = useMemo(() => {
    const vals = layer.allTickers
      .map((t) => summaryMap[t]?.price_change_pct)
      .filter((v) => v != null)
    if (!vals.length) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }, [layer.allTickers, summaryMap])

  const heat = heatConfig(avgChange)

  return (
    <div className="group">
      {/* Main row */}
      <div
        onClick={onToggle}
        className={clsx(
          'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors rounded-lg',
          'hover:bg-surface-700',
          isExpanded && 'bg-surface-700',
        )}
      >
        {/* Layer name */}
        <div className="w-24 flex-shrink-0">
          <span className="text-sm font-medium text-gray-200">
            {i18n.language === 'en' ? layer.nameEn : layer.name}
          </span>
        </div>

        {/* Display tickers */}
        <div className="flex gap-1.5 flex-1 min-w-0">
          {layer.displayTickers.map((t) => {
            const s = summaryMap[t]
            const chg = s?.price_change_pct
            return (
              <span
                key={t}
                className={clsx(
                  'text-xs font-mono px-1.5 py-0.5 rounded border',
                  chg == null ? 'text-gray-500 border-surface-600 bg-surface-700' :
                  chg >= 0 ? 'text-accent-green border-accent-green/30 bg-accent-green/10' :
                             'text-accent-red border-accent-red/30 bg-accent-red/10'
                )}
              >
                {t}
                {chg != null && (
                  <span className="ml-1 opacity-70">{chg >= 0 ? '+' : ''}{chg.toFixed(1)}%</span>
                )}
              </span>
            )
          })}
          {isLoading && (
            <div className="h-5 w-16 skeleton rounded" />
          )}
        </div>

        {/* Heat bar + change % */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <HeatBar level={heat.level} />
          <span className={clsx('text-sm font-mono font-semibold w-14 text-right tabular-nums', heat.colorClass)}>
            {heat.label}
          </span>
        </div>

        {/* Expand indicator */}
        <div className="w-4 flex-shrink-0 text-gray-600 group-hover:text-gray-400 transition-colors text-center text-xs">
          {isExpanded ? '▲' : '▼'}
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="ml-4 mr-4 mb-2 border border-surface-600 rounded-lg overflow-hidden">
          {layer.allTickers.map((t, idx) => {
            const s = summaryMap[t]
            const chg = s?.price_change_pct
            const heat2 = heatConfig(chg)
            return (
              <div
                key={t}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2 text-xs',
                  idx < layer.allTickers.length - 1 && 'border-b border-surface-600',
                  idx % 2 === 0 ? 'bg-surface-800' : 'bg-surface-700/50',
                )}
              >
                <span className="font-mono font-semibold text-gray-200 w-12">{t}</span>
                {s?.name && (
                  <span className="text-gray-500 flex-1 truncate">{s.name}</span>
                )}
                {s?.latest_price && (
                  <span className="text-gray-300 font-mono w-16 text-right">
                    ${parseFloat(s.latest_price).toFixed(2)}
                  </span>
                )}
                {/* Mini bar */}
                <div className="flex items-center gap-2 w-32 justify-end">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((i) => (
                      <div
                        key={i}
                        className={clsx(
                          'h-2.5 w-2 rounded-sm',
                          i <= Math.abs(heat2.level)
                            ? (chg >= 0 ? 'bg-accent-green/80' : 'bg-accent-red/80')
                            : 'bg-surface-600'
                        )}
                      />
                    ))}
                  </div>
                  <span className={clsx('font-mono w-14 text-right tabular-nums', heat2.colorClass)}>
                    {heat2.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 传导规则区块 ──────────────────────────────────────────────
function PropagationBlock({ layerData, i18n }) {
  const topLayer = useMemo(() => {
    if (!layerData.length) return null
    const allDown = layerData.every((l) => l.avgChange != null && l.avgChange < -0.3)
    if (allDown) return 'all_down'
    const valid = layerData.filter((l) => l.avgChange != null)
    if (!valid.length) return null
    return valid.reduce((a, b) => (a.avgChange > b.avgChange ? a : b)).id
  }, [layerData])

  const activeRule = PROPAGATION_RULES.find((r) => r.trigger === topLayer)

  if (!activeRule) return null

  return (
    <div className="card border-l-2 border-l-accent-blue bg-surface-800/80">
      <div className="flex items-center gap-3">
        <span className="text-lg flex-shrink-0">{activeRule.icon}</span>
        <p className="text-sm text-gray-200 font-medium">
          {i18n.language === 'en' ? activeRule.textEn : activeRule.text}
        </p>
      </div>
    </div>
  )
}

// ── 催化剂区块 ────────────────────────────────────────────────
function CatalystBlock({ i18n }) {
  const { data: catalysts } = useQuery({
    queryKey: ['catalysts', 'upcoming', 14],
    queryFn: () => catalystsApi.getUpcoming(14),
    staleTime: 5 * 60_000,
  })

  const relevant = useMemo(() => {
    return (catalysts ?? [])
      .map((c) => ({
        ...c,
        layer: TICKER_LAYER[c.ticker] ?? null,
        daysAway: dayjs(c.event_date).diff(dayjs(), 'day'),
      }))
      .filter((c) => c.layer || c.impact_level === 'high')
      .sort((a, b) => a.daysAway - b.daysAway)
      .slice(0, 3)
  }, [catalysts])

  const label = (t, i18n) => {
    const days = dayjs(t).diff(dayjs(), 'day')
    if (days === 0) return i18n.language === 'zh' ? '今日' : 'Today'
    if (days === 1) return i18n.language === 'zh' ? '明日' : 'Tomorrow'
    return i18n.language === 'zh' ? `${days}天后` : `In ${days}d`
  }

  if (!relevant.length) return null

  return (
    <div className="card space-y-1">
      <h2 className="section-title mb-3">
        {i18n.language === 'zh' ? '近期催化剂' : 'Upcoming Catalysts'}
      </h2>
      {relevant.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-3 py-2 border-b border-surface-600 last:border-0 text-sm"
        >
          <span className="w-12 text-xs font-mono text-accent-yellow flex-shrink-0">
            {label(c.event_date, i18n)}
          </span>
          <span className="flex-1 text-gray-200 truncate">{c.event_name}</span>
          {c.layer && (
            <span className="text-xs text-gray-500 flex-shrink-0 bg-surface-700 px-2 py-0.5 rounded border border-surface-600">
              {i18n.language === 'zh' ? LAYER_NAME[c.layer] : c.layer}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────────
const ALL_TICKERS = [...new Set(LAYERS.flatMap((l) => l.allTickers))]

export default function IndustryView() {
  const { i18n } = useTranslation()
  const [expandedLayer, setExpandedLayer] = useState(null)
  const { map: summaryMap, isLoading } = useMultiStockSummary(ALL_TICKERS)

  const layerData = useMemo(() =>
    LAYERS.map((layer) => {
      const vals = layer.allTickers
        .map((t) => summaryMap[t]?.price_change_pct)
        .filter((v) => v != null)
      const avgChange = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      return { ...layer, avgChange }
    }),
    [summaryMap]
  )

  const title = i18n.language === 'zh' ? '产业链监控' : 'Supply Chain Monitor'

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-100">{title}</h1>
        {isLoading && (
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            {i18n.language === 'zh' ? '行情加载中…' : 'Loading…'}
          </span>
        )}
      </div>

      {/* ── 区块一：层级热力条 ─────────────────────────────── */}
      <div className="card p-2 space-y-0.5">
        {layerData.map((layer) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            summaryMap={summaryMap}
            isLoading={isLoading}
            isExpanded={expandedLayer === layer.id}
            onToggle={() => setExpandedLayer(expandedLayer === layer.id ? null : layer.id)}
            i18n={i18n}
          />
        ))}
      </div>

      {/* ── 区块二：传导提示 ──────────────────────────────── */}
      <PropagationBlock layerData={layerData} i18n={i18n} />

      {/* ── 区块三：催化剂 ────────────────────────────────── */}
      <CatalystBlock i18n={i18n} />
    </div>
  )
}
