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
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[24px] border border-dashed border-zinc-200 bg-white/70 backdrop-blur-sm max-w-lg mx-auto shadow-xs',
        className
      )}
    >
      <div className="w-16 h-16 rounded-[20px] bg-gradient-to-b from-zinc-50 to-white border border-zinc-200 shadow-xs flex items-center justify-center text-zinc-500 mb-4 transition-transform hover:scale-105 duration-200">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-[18px] text-zinc-900 mb-1.5 tracking-tight">
        {title}
      </h3>
      <p className="text-[14px] text-zinc-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  )
}
