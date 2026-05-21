import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useChartTheme } from '../../hooks/useChartTheme'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

function CustomTooltip({ active, payload, label, ct }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div
      className="rounded-lg p-3 text-xs space-y-1 shadow-card-md"
      style={{ background: ct.tooltipBg, border: `1px solid ${ct.grid}` }}
    >
      <p className="text-gray-300 font-medium">{label}</p>
      <p style={{ color: ct.blue }}>Close: ${d?.close?.toFixed(2)}</p>
      <p className="text-gray-400">
        O: ${d?.open?.toFixed(2)} H: ${d?.high?.toFixed(2)} L: ${d?.low?.toFixed(2)}
      </p>
      <p className="text-gray-500">Vol: {d?.volume?.toLocaleString()}</p>
      {d?.sma_50  && <p style={{ color: ct.yellow }}>MA50: ${d.sma_50.toFixed(2)}</p>}
      {d?.sma_200 && <p style={{ color: ct.purple }}>MA200: ${d.sma_200.toFixed(2)}</p>}
    </div>
  )
}

export default function PriceChart({ data = [] }) {
  const ct = useChartTheme()
  const { t } = useTranslation()

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
        {t('common.noData')}
      </div>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    date: dayjs(d.date).format('MM/DD'),
    close:   d.close   ? parseFloat(d.close)   : null,
    open:    d.open    ? parseFloat(d.open)     : null,
    high:    d.high    ? parseFloat(d.high)     : null,
    low:     d.low     ? parseFloat(d.low)      : null,
    volume:  d.volume  ?? 0,
    sma_50:  d.sma_50  ? parseFloat(d.sma_50)  : null,
    sma_200: d.sma_200 ? parseFloat(d.sma_200) : null,
    bb_upper: d.bb_upper ? parseFloat(d.bb_upper) : null,
    bb_lower: d.bb_lower ? parseFloat(d.bb_lower) : null,
  }))

  const prices = chartData.map((d) => d.close).filter(Boolean)
  const minPrice = Math.min(...prices) * 0.98
  const maxPrice = Math.max(...prices) * 1.02
  const maxVol   = Math.max(...chartData.map((d) => d.volume))

  const tickStyle = { fontSize: 10, fill: ct.textColor }

  return (
    <div className="space-y-1">
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
          <XAxis dataKey="date" tick={tickStyle} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={tickStyle}
            tickLine={false}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            width={55}
          />
          <Tooltip content={(props) => <CustomTooltip {...props} ct={ct} />} />
          <Line type="monotone" dataKey="close"    stroke={ct.blue}   dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="sma_50"   stroke={ct.yellow} dot={false} strokeWidth={1} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="sma_200"  stroke={ct.purple} dot={false} strokeWidth={1} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="bb_upper" stroke={ct.grid}   dot={false} strokeWidth={1} />
          <Line type="monotone" dataKey="bb_lower" stroke={ct.grid}   dot={false} strokeWidth={1} />
        </ComposedChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={50}>
        <ComposedChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
          <YAxis hide domain={[0, maxVol * 1.2]} />
          <XAxis dataKey="date" hide />
          <Bar dataKey="volume" fill={ct.grid} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex gap-4 text-xs text-gray-500 px-2">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 rounded inline-block" style={{ background: ct.blue }} />Price
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 rounded inline-block" style={{ background: ct.yellow }} />MA50
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 rounded inline-block" style={{ background: ct.purple }} />MA200
        </span>
      </div>
    </div>
  )
}
