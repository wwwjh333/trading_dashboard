import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

const LAYER_ORDER = ['cloud', 'chips', 'materials', 'equipment']
const LAYER_LABELS = {
  cloud:     '云厂商 / 终端客户',
  chips:     '芯片设计',
  materials: '晶圆代工',
  equipment: '设备制造',
}

export default function SupplyChainMap({ nodes, priceMap = {} }) {
  const { t } = useTranslation()

  const byLayer = {}
  for (const n of (nodes ?? [])) {
    const layer = n.supply_chain_layer ?? 'other'
    if (!byLayer[layer]) byLayer[layer] = []
    byLayer[layer].push(n)
  }

  if (!nodes?.length) {
    return <p className="text-gray-500 text-sm text-center py-8">{t('common.noData')}</p>
  }

  return (
    <div className="space-y-4">
      {LAYER_ORDER.filter((l) => byLayer[l]).map((layer) => (
        <div key={layer}>
          <p className="text-xs text-gray-500 mb-2">{LAYER_LABELS[layer] ?? layer}</p>
          <div className="flex flex-wrap gap-2">
            {byLayer[layer].map((node) => {
              const price = priceMap[node.ticker]
              const pct = price?.change_pct ?? null
              const isUp = pct != null && pct > 0
              const isDown = pct != null && pct < 0

              return (
                <div
                  key={node.ticker}
                  className={clsx(
                    'border rounded px-3 py-2 text-xs min-w-[80px] text-center transition-colors',
                    {
                      'border-accent-green bg-accent-green/10': isUp,
                      'border-accent-red bg-accent-red/10': isDown,
                      'border-surface-600 bg-surface-700': pct == null,
                    }
                  )}
                >
                  <p className="font-medium text-gray-200">{node.ticker}</p>
                  <p className="text-gray-400 text-[10px] truncate max-w-[100px]">{node.name}</p>
                  {pct != null && (
                    <p className={isUp ? 'text-accent-green' : 'text-accent-red'}>
                      {isUp ? '+' : ''}{pct.toFixed(1)}%
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Also render any layers not in the order above */}
      {Object.keys(byLayer)
        .filter((l) => !LAYER_ORDER.includes(l))
        .map((layer) => (
          <div key={layer}>
            <p className="text-xs text-gray-500 mb-2">{layer}</p>
            <div className="flex flex-wrap gap-2">
              {byLayer[layer].map((node) => (
                <div key={node.ticker} className="border border-surface-600 bg-surface-700 rounded px-3 py-2 text-xs text-center">
                  <p className="font-medium text-gray-200">{node.ticker}</p>
                  <p className="text-gray-400 text-[10px]">{node.name}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}
