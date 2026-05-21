import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useChartTheme } from '../../hooks/useChartTheme'
import { useTranslation } from 'react-i18next'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

function buildChartData(perfData) {
  if (!perfData?.items?.length) return []
  const dateSet = new Set()
  for (const item of perfData.items) {
    for (const d of (item.dates ?? [])) dateSet.add(d)
  }
  const allDates = Array.from(dateSet).sort()

  return allDates.map((date) => {
    const row = { date: date.slice(5) }
    for (const item of perfData.items) {
      const idx = item.dates?.indexOf(date)
      if (idx != null && idx >= 0) {
        row[item.ticker] = item.normalized[idx]
      }
    }
    return row
  })
}

export default function BasketPerformanceChart({ perfData, basket }) {
  const { t } = useTranslation()
  const ct = useChartTheme()
  const tickers = basket?.tickers ?? []
  const chartData = buildChartData(perfData)

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
        {t('common.noData')}
      </div>
    )
  }

  const items = perfData?.items ?? []

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs">
        {items.map((item, i) => (
          <div key={item.ticker} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-gray-300">{item.ticker}</span>
            {item.change_pct != null && (
              <span className={item.change_pct >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                {item.change_pct >= 0 ? '+' : ''}{item.change_pct.toFixed(1)}%
              </span>
            )}
            {item.relative_strength != null && (
              <span className="text-gray-500">
                ({item.relative_strength >= 0 ? '+' : ''}{item.relative_strength.toFixed(1)}% vs avg)
              </span>
            )}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: ct.textColor }}
            tickLine={false}
            interval={Math.floor(chartData.length / 6)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: ct.textColor }}
            tickLine={false}
            tickFormatter={(v) => `${v.toFixed(0)}`}
            domain={['auto', 'auto']}
          />
          <ReferenceLine y={100} stroke={ct.grid} strokeDasharray="4 4" strokeWidth={1.5} />
          <Tooltip
            contentStyle={{ backgroundColor: ct.tooltipBg, border: `1px solid ${ct.grid}`, borderRadius: 8 }}
            labelStyle={{ color: ct.textColor, fontSize: 11 }}
            formatter={(val) => [`${val?.toFixed(1)}`, '']}
          />
          {tickers.map((ticker, i) => (
            <Line
              key={ticker}
              type="monotone"
              dataKey={ticker}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
