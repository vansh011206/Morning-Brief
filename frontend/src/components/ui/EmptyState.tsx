import React from 'react'
import { cn } from '../../utils/cn'

export interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-zinc-200 bg-white/60 max-w-lg mx-auto',
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-primary mb-4 shadow-sm">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-base text-zinc-900 mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-zinc-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  )
}
