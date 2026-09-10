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
        'rounded-xl border border-zinc-200/90 text-zinc-900 transition-all duration-200',
        glass ? 'glass-card shadow-glass' : 'bg-white shadow-sm',
        hoverable && 'hover:shadow-md hover:-translate-y-0.5 hover:border-zinc-300 cursor-pointer',
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
  <div className={cn('p-5 border-b border-zinc-100 flex items-center justify-between gap-4', className)} {...props}>
    {children}
  </div>
)

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={cn('font-display font-semibold text-base text-zinc-900', className)} {...props}>
    {children}
  </h3>
)

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn('text-xs text-zinc-500 mt-0.5', className)} {...props}>
    {children}
  </p>
)

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('p-5', className)} {...props}>
    {children}
  </div>
)

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('p-4 border-t border-zinc-100 bg-zinc-50/50 rounded-b-xl flex items-center justify-between gap-4', className)} {...props}>
    {children}
  </div>
)
