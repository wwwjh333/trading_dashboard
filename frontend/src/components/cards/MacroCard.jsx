import { useMacroHistory } from '../../hooks/useMacro'
import { useChartTheme } from '../../hooks/useChartTheme'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import dayjs from 'dayjs'

const INDICATOR_META = {
  DGS10: { label: '10Y Treasury', unit: '%', inverse: true },
  DGS2:  { label: '2Y Treasury',  unit: '%', inverse: true },
  DGS1:  { label: '1Y Treasury',  unit: '%', inverse: true },
  FEDFUNDS: { label: 'Fed Funds', unit: '%', inverse: true },
  VIXCLS: { label: 'VIX',  unit: '', inverse: true },
  MOVE:   { label: 'MOVE', unit: '', inverse: true },
  SOX:    { label: 'Philadelphia Semi', unit: '', inverse: false },
  SPY:    { label: 'S&P 500', unit: '', inverse: false },
  QQQ:    { label: 'Nasdaq 100', unit: '', inverse: false },
  NDX:    { label: 'NDX', unit: '', inverse: false },
  DXY:    { label: 'DXY', unit: '', inverse: true },
  GLD:    { label: 'Gold', unit: '', inverse: false },
  OIL:    { label: 'Oil', unit: '', inverse: false },
}

export default function MacroCard({ indicator, latestValue, change }) {
  const meta = INDICATOR_META[indicator] ?? { label: indicator, unit: '', inverse: false }
  const { data } = useMacroHistory(indicator, 30)
  const ct = useChartTheme()

  const isLarge = ['SOX', 'NDX', 'SPY', 'QQQ'].includes(indicator)
  const chartData = (data ?? []).map((d) => ({
    date: dayjs(d.date).format('MM/DD'),
    value: d.value ? parseFloat(d.value) : null,
  }))

  const isPositive = change > 0
  const isNegative = change < 0
  const isGood = meta.inverse ? isNegative : isPositive
  const isBad  = meta.inverse ? isPositive : isNegative

  const changeColor = isGood ? ct.green : isBad ? ct.red : ct.textColor
  const lineColor   = isGood ? ct.green : isBad ? ct.red : ct.blue

  return (
    <div className="card space-y-2 hover:shadow-card-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">{meta.label}</p>
          <p className="text-xl font-semibold font-mono mt-0.5 leading-none">
            {latestValue?.toFixed(isLarge ? 0 : 2)}{meta.unit}
          </p>
        </div>
        {change != null && (
          <span className="text-xs font-mono font-medium flex-shrink-0" style={{ color: changeColor }}>
            {isPositive ? '+' : ''}{change?.toFixed(2)}
          </span>
        )}
      </div>

      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={44}>
          <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              dot={false}
              strokeWidth={1.5}
            />
            <Tooltip
              formatter={(v) => [`${v?.toFixed(isLarge ? 0 : 2)}${meta.unit}`, indicator]}
              contentStyle={{
                background: ct.tooltipBg,
                border: `1px solid ${ct.grid}`,
                borderRadius: 6,
                fontSize: 11,
                color: ct.textColor,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
