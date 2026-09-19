import React from 'react'
import { cn } from '../../utils/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  hoverable?: boolean
}

export const Card: React.FC<CardProps> = ({
  className,
  glass = false,
  hoverable = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-zinc-200/80 text-zinc-900 transition-all duration-200 ease-out',
        glass ? 'glass-card shadow-xs' : 'bg-white shadow-xs',
        hoverable && 'hover:shadow-md hover:-translate-y-[1px] hover:border-zinc-300 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('p-5 sm:p-6 border-b border-zinc-100 flex items-center justify-between gap-4', className)} {...props}>
    {children}
  </div>
)

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={cn('font-display font-semibold text-base sm:text-lg text-zinc-900 tracking-tight', className)} {...props}>
    {children}
  </h3>
)

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn('text-xs sm:text-sm text-zinc-500 mt-0.5 leading-relaxed', className)} {...props}>
    {children}
  </p>
)

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('p-5 sm:p-6', className)} {...props}>
    {children}
  </div>
)

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('p-4 sm:p-5 border-t border-zinc-100/90 bg-zinc-50/50 rounded-b-[20px] flex items-center justify-between gap-4', className)} {...props}>
    {children}
  </div>
)
