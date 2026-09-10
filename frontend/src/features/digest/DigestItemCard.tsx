import { ExternalLink, Clock } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import type { DigestItem } from '../../api/types'

interface DigestItemCardProps {
  item: DigestItem
}

function formatRelativeTime(dateString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return 'Recently'
  }
}

export const DigestItemCard: React.FC<DigestItemCardProps> = ({ item }) => {
  // Border color corresponding to section per design system
  const getSectionBorderClass = (section: string) => {
    switch (section) {
      case 'news':
        return 'border-l-indigo-500 hover:border-l-indigo-600'
      case 'actions':
        return 'border-l-amber-500 hover:border-l-amber-600'
      case 'emails':
        return 'border-l-sky-500 hover:border-l-sky-600'
      case 'money':
        return 'border-l-emerald-500 hover:border-l-emerald-600'
      case 'events':
        return 'border-l-purple-500 hover:border-l-purple-600'
      default:
        return 'border-l-zinc-400'
    }
  }

  const isUrgent = item.priority === 'urgent'
  const isHigh = item.priority === 'high'

  return (
    <div
      className={`group relative rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md border-l-4 ${getSectionBorderClass(
        item.section
      )}`}
    >
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold tracking-wider text-zinc-700 uppercase bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/70">
            {item.source_name || 'Feed'}
          </span>

          {item.author && (
            <>
              <span className="text-zinc-300">•</span>
              <span className="text-xs text-zinc-400 truncate max-w-[140px] sm:max-w-[200px]">
                {item.author}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isUrgent ? (
            <Badge variant="rose" dot size="sm">
              Urgent
            </Badge>
          ) : isHigh ? (
            <Badge variant="amber" dot size="sm">
              High Priority
            </Badge>
          ) : null}

          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTime(item.received_at)}</span>
          </div>
        </div>
      </div>

      {/* Main Title (font weight 600) */}
      <h3 className="font-semibold text-zinc-900 text-sm sm:text-base leading-snug tracking-tight">
        {item.source_title}
      </h3>

      {/* AI Summary (2-line clamp) */}
      <p className="mt-1.5 text-xs sm:text-sm text-zinc-600 leading-relaxed line-clamp-2">
        {item.summary}
      </p>

      {/* AI Rationale / Footer Link */}
      <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
          {item.ai_reason ? (
            <span className="truncate italic text-[11px] text-zinc-500">
              {item.ai_reason}
            </span>
          ) : (
            <span className="text-[11px] text-zinc-400">Rank #{item.rank}</span>
          )}
        </div>

        {item.source_url ? (
          <a
            href={item.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors shrink-0"
          >
            <span>Source</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : null}
      </div>
    </div>
  )
}
