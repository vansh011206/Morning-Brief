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
    rounded: 'rounded-xl',
  }

  return (
    <div
      className={cn(
        'bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-100 bg-[length:200%_100%] animate-shimmer',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}

export const SkeletonFeedCard: React.FC = () => (
  <div className="p-5 sm:p-6 bg-white rounded-[20px] border border-zinc-200/80 space-y-3.5 shadow-xs">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Skeleton variant="circular" className="w-7 h-7" />
        <Skeleton className="w-28 h-4" />
      </div>
      <Skeleton className="w-20 h-5 rounded-full" />
    </div>
    <Skeleton className="w-4/5 h-5" />
    <Skeleton className="w-full h-12" />
    <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
      <Skeleton className="w-32 h-4" />
      <Skeleton className="w-20 h-8 rounded-xl" />
    </div>
  </div>
)
