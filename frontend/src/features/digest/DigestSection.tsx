import React from 'react'
import {
  Newspaper,
  Zap,
  Mail,
  Banknote,
  Layers,
} from 'lucide-react'
import { DigestItemCard } from './DigestItemCard'
import type { DigestItem, DigestSectionKey } from '../../api/types'

interface DigestSectionProps {
  sectionKey: DigestSectionKey | string
  title: string
  items: DigestItem[]
}

export const DigestSection: React.FC<DigestSectionProps> = ({
  sectionKey,
  title,
  items,
}) => {
  if (!items || items.length === 0) return null

  const getSectionIcon = (key: string) => {
    switch (key) {
      case 'news':
        return <Newspaper className="w-3.5 h-3.5 text-white" strokeWidth={1.75} />
      case 'actions':
        return <Zap className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.75} />
      case 'emails':
        return <Mail className="w-3.5 h-3.5 text-rose-300" strokeWidth={1.75} />
      case 'money':
        return <Banknote className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
      default:
        return <Layers className="w-3.5 h-3.5 text-zinc-300" strokeWidth={1.75} />
    }
  }

  return (
    <section className="space-y-4">
      {/* Editorial Section Header */}
      <div className="flex items-center justify-between pt-4 pb-1">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icon 28px rounded-xl bg-zinc-900 text-white */}
          <div className="w-7 h-7 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            {getSectionIcon(sectionKey)}
          </div>

          <h2 className="font-display font-bold text-[13px] uppercase tracking-widest text-zinc-900 truncate">
            {title}
          </h2>

          {/* Editorial divider line */}
          <div className="flex-1 h-px bg-zinc-200/80 ml-2 hidden sm:block" />
        </div>

        {/* Count badge */}
        <span className="rounded-full bg-zinc-100 border border-zinc-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 tabular-nums shrink-0 ml-3">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Bento Grid: 2 columns on desktop, 1 on mobile, gap-4. First item featured (2 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, index) => (
          <DigestItemCard
            key={item.id}
            item={item}
            isFeatured={index === 0 && items.length > 1}
          />
        ))}
      </div>
    </section>
  )
}
