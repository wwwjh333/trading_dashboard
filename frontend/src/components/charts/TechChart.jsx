import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useChartTheme } from '../../hooks/useChartTheme'
import dayjs from 'dayjs'

function SimpleTooltip({ active, payload, label, ct }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg p-2 text-xs space-y-0.5 shadow-card"
      style={{ background: ct.tooltipBg, border: `1px solid ${ct.grid}` }}
    >
      <p style={{ color: ct.textColor }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color ?? ct.blue }}>
          {p.name ?? p.dataKey}: {p.value?.toFixed?.(3) ?? p.value}
        </p>
      ))}
    </div>
  )
}

export default function TechChart({ data = [] }) {
  const ct = useChartTheme()

  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
        No technical data
      </div>
    )
  }

  const chartData = data.map((d) => ({
    date:        dayjs(d.date).format('MM/DD'),
    rsi_14:      d.rsi_14      ? parseFloat(d.rsi_14)      : null,
    macd:        d.macd        ? parseFloat(d.macd)        : null,
    macd_signal: d.macd_signal ? parseFloat(d.macd_signal) : null,
    macd_hist:   d.macd_hist   ? parseFloat(d.macd_hist)   : null,
  }))

  const tickStyle = { fontSize: 9, fill: ct.textColor }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 font-medium">RSI (14)</p>
      <ResponsiveContainer width="100%" height={90}>
        <ComposedChart data={chartData} margin={{ top: 2, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
          <XAxis dataKey="date" tick={tickStyle} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={tickStyle} tickLine={false} width={28} />
          <Tooltip content={(props) => <SimpleTooltip {...props} ct={ct} />} />
          <ReferenceLine y={70} stroke={ct.red}   strokeDasharray="3 2" strokeWidth={1} />
          <ReferenceLine y={30} stroke={ct.green} strokeDasharray="3 2" strokeWidth={1} />
          <Line type="monotone" dataKey="rsi_14" stroke={ct.blue} dot={false} strokeWidth={1.5} />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-500 font-medium">MACD (12, 26, 9)</p>
      <ResponsiveContainer width="100%" height={90}>
        <ComposedChart data={chartData} margin={{ top: 2, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
          <XAxis dataKey="date" tick={tickStyle} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={tickStyle} tickLine={false} width={38} />
          <Tooltip content={(props) => <SimpleTooltip {...props} ct={ct} />} />
          <ReferenceLine y={0} stroke={ct.grid} strokeWidth={1} />
          <Bar
            dataKey="macd_hist"
            shape={(props) => {
              const { x, y, width, height, value } = props
              return (
                <rect
                  x={x} y={y}
                  width={width}
                  height={Math.abs(height)}
                  fill={value >= 0 ? ct.green : ct.red}
                  opacity={0.65}
                />
              )
            }}
          />
          <Line type="monotone" dataKey="macd"        stroke={ct.blue}   name="MACD"   dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey="macd_signal" stroke={ct.yellow} name="Signal" dot={false} strokeWidth={1} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
