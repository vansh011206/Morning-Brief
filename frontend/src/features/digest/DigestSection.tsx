import React from 'react'
import {
  Newspaper,
  CheckSquare,
  Mail,
  TrendingUp,
  Calendar,
  Layers,
} from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
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
        return <Newspaper className="w-4 h-4 text-indigo-600" />
      case 'actions':
        return <CheckSquare className="w-4 h-4 text-amber-600" />
      case 'emails':
        return <Mail className="w-4 h-4 text-sky-600" />
      case 'money':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />
      case 'events':
        return <Calendar className="w-4 h-4 text-purple-600" />
      default:
        return <Layers className="w-4 h-4 text-zinc-600" />
    }
  }

  return (
    <section className="space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-zinc-200/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-zinc-100/80">
            {getSectionIcon(sectionKey)}
          </div>
          <h2 className="font-display font-semibold text-base sm:text-lg text-zinc-900 tracking-tight">
            {title}
          </h2>
        </div>

        <Badge variant="zinc" size="sm">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </Badge>
      </div>

      {/* Grid of Items */}
      <div className="grid grid-cols-1 gap-3.5">
        {items.map((item) => (
          <DigestItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}
