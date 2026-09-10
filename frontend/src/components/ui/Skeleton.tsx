import React from 'react'
import { cn } from '../../utils/cn'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'rounded'
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rounded',
  ...props
}) => {
  const variantStyles = {
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-lg',
  }

  return (
    <div
      className={cn(
        'animate-pulse bg-zinc-200/80',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}

export const SkeletonFeedCard: React.FC = () => (
  <div className="p-5 bg-white rounded-xl border border-zinc-200/80 space-y-3.5 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Skeleton variant="circular" className="w-6 h-6" />
        <Skeleton className="w-24 h-4" />
      </div>
      <Skeleton className="w-16 h-5 rounded-full" />
    </div>
    <Skeleton className="w-4/5 h-5" />
    <Skeleton className="w-full h-12" />
    <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
      <Skeleton className="w-32 h-4" />
      <Skeleton className="w-20 h-7 rounded-md" />
    </div>
  </div>
)
