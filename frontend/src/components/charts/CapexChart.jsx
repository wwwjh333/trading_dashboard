import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useChartTheme } from '../../hooks/useChartTheme'

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444']

function CapexTooltip({ active, payload, label, ct }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg p-3 text-xs space-y-1 shadow-card"
      style={{ background: ct.tooltipBg, border: `1px solid ${ct.grid}` }}
    >
      <p className="font-medium" style={{ color: ct.textColor }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.dataKey}: ${p.value?.toFixed(1)}B
        </p>
      ))}
    </div>
  )
}

export default function CapexChart({ data = [] }) {
  const ct = useChartTheme()

  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
        No capex data
      </div>
    )
  }

  const quarters  = [...new Set(data.map((d) => d.fiscal_quarter))].sort()
  const companies = [...new Set(data.map((d) => d.company))]

  const chartData = quarters.map((q) => {
    const row = { quarter: q }
    companies.forEach((c) => {
      const entry = data.find((d) => d.company === c && d.fiscal_quarter === q)
      row[c] = entry?.capex_billion ?? null
    })
    return row
  })

  const tickStyle = { fontSize: 10, fill: ct.textColor }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
        <XAxis dataKey="quarter" tick={tickStyle} tickLine={false} />
        <YAxis
          tick={tickStyle}
          tickLine={false}
          tickFormatter={(v) => `$${v}B`}
          width={45}
        />
        <Tooltip content={(props) => <CapexTooltip {...props} ct={ct} />} />
        <Legend wrapperStyle={{ fontSize: 11, color: ct.textColor }} />
        {companies.map((c, i) => (
          <Bar key={c} dataKey={c} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
