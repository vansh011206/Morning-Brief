import React from 'react'
import { cn } from '../../utils/cn'

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: number | string
}

export interface SegmentedTabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  size?: 'sm' | 'md'
  className?: string
}

export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  size = 'md',
  className,
}) => {
  const sizeStyles = {
    sm: 'p-1 text-xs gap-1',
    md: 'p-1.5 text-sm gap-1.5',
  }

  const tabPadding = {
    sm: 'px-3 py-1',
    md: 'px-4 py-1.5',
  }

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center rounded-xl bg-zinc-100 border border-zinc-200/80',
        sizeStyles[size],
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500',
              tabPadding[size],
              isActive
                ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
            )}
          >
            {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'bg-zinc-200 text-zinc-700'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
