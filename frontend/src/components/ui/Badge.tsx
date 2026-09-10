import React from 'react'
import { cn } from '../../utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'indigo' | 'amber' | 'emerald' | 'rose' | 'zinc' | 'outline'
  size?: 'sm' | 'md'
  dot?: boolean
  icon?: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'zinc',
  size = 'sm',
  dot = false,
  icon,
  children,
  ...props
}) => {
  const variantStyles = {
    indigo: 'bg-primary-light text-primary-700 border-primary-200',
    amber: 'bg-amber-sunrise-light text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    zinc: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    outline: 'bg-transparent text-zinc-700 border-zinc-300',
  }

  const dotColorStyles = {
    indigo: 'bg-primary',
    amber: 'bg-amber-sunrise',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    zinc: 'bg-zinc-400',
    outline: 'bg-zinc-500',
  }

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border leading-none transition-colors select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColorStyles[variant])}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
