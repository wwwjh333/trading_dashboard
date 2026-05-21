import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const SENTIMENT_LABELS = { bullish: '↑ 看多', bearish: '↓ 看空', neutral: '→ 中性' }
const IMPACT_LABELS    = { high: '重要', medium: '中等', low: '一般' }

export default function NewsCard({ item }) {
  const sentiment = item.sentiment
  const impact    = item.impact_level

  return (
    <div className="card hover:shadow-card-md group transition-all cursor-default">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-200 hover:text-accent-blue line-clamp-2 leading-snug group-hover:text-accent-blue transition-colors"
          >
            {item.title}
          </a>
          {item.summary && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{item.summary}</p>
          )}
          {item.key_point && (
            <p className="text-xs text-accent-yellow mt-1.5 flex items-center gap-1">
              <span className="opacity-70">◆</span> {item.key_point}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`badge-${sentiment ?? 'neutral'}`}>{SENTIMENT_LABELS[sentiment] ?? '→ 中性'}</span>
          <span className={`badge-${impact ?? 'low'}`}>{IMPACT_LABELS[impact] ?? '一般'}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-surface-600 text-xs text-gray-500">
        {item.ticker && (
          <span className="text-accent-blue font-mono font-medium">${item.ticker}</span>
        )}
        <span className="truncate">{item.source}</span>
        <span className="ml-auto flex-shrink-0">
          {item.published_at ? dayjs(item.published_at).fromNow() : '—'}
        </span>
      </div>
    </div>
  )
}
