import React from 'react'
import { cn } from '../../utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'indigo' | 'amber' | 'emerald' | 'rose' | 'zinc' | 'outline' | 'urgent' | 'high' | 'normal'
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
    urgent: 'bg-rose-600 text-white border-transparent shadow-xs',
    high: 'bg-amber-50 text-amber-700 border-transparent ring-1 ring-amber-200',
    normal: 'bg-zinc-100 text-zinc-600 border-transparent',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
    zinc: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    outline: 'bg-transparent text-zinc-700 border-zinc-300',
  }

  const dotColorStyles = {
    urgent: 'bg-white',
    high: 'bg-amber-500',
    normal: 'bg-zinc-400',
    indigo: 'bg-indigo-600',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    zinc: 'bg-zinc-400',
    outline: 'bg-zinc-500',
  }

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1.5 font-semibold tracking-wide uppercase',
    md: 'text-xs px-3 py-1 gap-2 font-semibold tracking-wide uppercase',
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
