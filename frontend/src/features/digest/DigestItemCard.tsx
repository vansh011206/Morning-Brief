import React, { useState } from 'react'
import {
  ExternalLink,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Rss,
  Mail,
  Github,
  Globe,
  Sparkles,
} from 'lucide-react'
import { digestApi } from '../../api/digest'
import { cn } from '../../utils/cn'
import type { DigestItem } from '../../api/types'

interface DigestItemCardProps {
  item: DigestItem
  isFeatured?: boolean
  onFeedback?: (itemId: number, feedbackType: 'helpful' | 'unhelpful') => void
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

export const DigestItemCard: React.FC<DigestItemCardProps> = ({
  item,
  isFeatured = false,
  onFeedback,
}) => {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isUrgent = item.priority === 'urgent'
  const isHigh = item.priority === 'high'

  // Top accent colored strip
  const getTopStripColor = () => {
    if (isUrgent) return 'bg-rose-500'
    switch (item.section) {
      case 'actions':
        return 'bg-amber-500'
      case 'money':
        return 'bg-emerald-500'
      case 'emails':
        return 'bg-indigo-500'
      case 'news':
        return 'bg-indigo-600'
      default:
        return 'bg-zinc-800'
    }
  }

  // Source icon
  const getSourceIcon = (name?: string) => {
    const n = (name || '').toLowerCase()
    if (n.includes('github')) return <Github className="w-3 h-3 text-zinc-300" strokeWidth={1.75} />
    if (n.includes('mail') || n.includes('gmail'))
      return <Mail className="w-3 h-3 text-rose-300" strokeWidth={1.75} />
    if (n.includes('rss') || n.includes('feed') || n.includes('news'))
      return <Rss className="w-3 h-3 text-amber-300" strokeWidth={1.75} />
    return <Globe className="w-3 h-3 text-zinc-300" strokeWidth={1.75} />
  }

  const handleVote = async (direction: 'up' | 'down') => {
    if (isSubmitting) return
    const prevVote = voted
    const newVote = voted === direction ? null : direction

    // Optimistic update
    setVoted(newVote)
    setIsSubmitting(true)

    if (onFeedback && newVote) {
      onFeedback(item.id, newVote === 'up' ? 'helpful' : 'unhelpful')
    }

    try {
      if (newVote) {
        await digestApi.submitFeedback({
          digest_item: item.id,
          feedback_type: newVote === 'up' ? 'helpful' : 'unhelpful',
        })
      }
    } catch (err) {
      // Revert on failure
      setVoted(prevVote)
      console.error('Failed to record feedback:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      data-testid={`digest-item-${item.id}`}
      className={cn(
        'group relative border shadow-xs hover:shadow-lg hover:-translate-y-[2px] transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col justify-between',
        isFeatured
          ? 'col-span-1 md:col-span-2 rounded-[24px] p-6 sm:p-8 bg-white'
          : 'col-span-1 rounded-[20px] p-5 sm:p-6 bg-white',
        isUrgent
          ? 'bg-rose-50/40 border-rose-200/70'
          : isHigh
          ? 'bg-amber-50/30 border-amber-200/70'
          : 'border-zinc-200/80 hover:border-zinc-300'
      )}
    >
      {/* Top colored accent line: 3px rounded at top */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-[3px] transition-all duration-300',
          isFeatured ? 'rounded-t-[24px]' : 'rounded-t-[20px]',
          getTopStripColor()
        )}
      />

      {/* Top Row: Priority Badge & Ranking Reason */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Dark Executive Source Chip */}
          <span className="rounded-full bg-zinc-900 text-white px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1.5 select-none shadow-xs">
            {getSourceIcon(item.source_name)}
            <span>{item.source_name || 'Source'}</span>
          </span>

          {item.author && (
            <span className="text-[12px] text-zinc-400 truncate max-w-[140px] sm:max-w-[200px]">
              {item.author}
            </span>
          )}
        </div>

        {/* Priority Badge */}
        {isUrgent ? (
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs bg-rose-600 text-white select-none">
            Urgent
          </span>
        ) : isHigh ? (
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs bg-amber-500 text-white select-none">
            High
          </span>
        ) : null}
      </div>

      {/* Middle: Content */}
      <div className="space-y-2 flex-1">
        <h3
          className={cn(
            'font-display font-semibold text-zinc-900 leading-snug group-hover:text-indigo-700 transition-colors',
            isFeatured ? 'text-[18px] sm:text-[20px]' : 'text-[15px] sm:text-[16px] line-clamp-2'
          )}
        >
          {item.source_title}
        </h3>

        <p
          className={cn(
            'text-[#3F3F46] leading-[1.6]',
            isFeatured ? 'text-[14px] line-clamp-3 sm:line-clamp-4' : 'text-[13px] line-clamp-2'
          )}
        >
          {item.summary}
        </p>
      </div>

      {/* Bottom Meta Row */}
      <div className="flex items-center gap-3 pt-4 mt-4 border-t border-zinc-100/90 text-xs flex-wrap">
        {/* Time */}
        <div className="flex items-center gap-1 text-[12px] text-zinc-400 tabular-nums">
          <Clock className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
          <span>{formatRelativeTime(item.received_at)}</span>
        </div>

        {/* AI Reason Tooltip */}
        {item.ai_reason && (
          <div className="relative group/why inline-block">
            <button
              type="button"
              className="text-zinc-400 hover:text-zinc-900 cursor-help transition-colors p-1 rounded-lg hover:bg-zinc-100 flex items-center gap-1"
              aria-label="Why this item is ranked here"
            >
              <Sparkles className="w-3 h-3 text-amber-500" strokeWidth={1.75} />
              <span className="text-[11px] text-zinc-500 hidden sm:inline">Rationale</span>
            </button>

            <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs leading-relaxed rounded-xl shadow-2xl opacity-0 group-hover/why:opacity-100 transition-opacity duration-150 z-30">
              <p className="font-semibold text-amber-300 mb-1">Executive Rationale</p>
              <p className="text-zinc-200">{item.ai_reason}</p>
            </div>
          </div>
        )}

        {/* Feedback Buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            data-testid="feedback-up"
            onClick={() => handleVote('up')}
            disabled={isSubmitting}
            title="Helpful"
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-all border border-transparent hover:bg-zinc-100',
              voted === 'up'
                ? 'text-indigo-600 bg-indigo-50 border-indigo-200 font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-zinc-700'
            )}
          >
            <ThumbsUp className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            data-testid="feedback-down"
            onClick={() => handleVote('down')}
            disabled={isSubmitting}
            title="Not helpful"
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-all border border-transparent hover:bg-zinc-100',
              voted === 'down'
                ? 'text-rose-600 bg-rose-50 border-rose-200 font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-zinc-700'
            )}
          >
            <ThumbsDown className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>

          {/* External Link Button */}
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              title="Open source article"
              aria-label="Open source article"
              className="w-8 h-8 rounded-full bg-zinc-900 text-white shadow-md hover:bg-black transition-all flex items-center justify-center ml-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
