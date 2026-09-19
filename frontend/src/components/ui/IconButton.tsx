import React from 'react'
import { cn } from '../../utils/cn'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon: React.ReactNode
  'aria-label': string
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'ghost',
      size = 'md',
      icon,
      'aria-label': ariaLabel,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]'

    const variantStyles = {
      primary:
        'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-indigo hover:from-indigo-700 hover:to-indigo-800 hover:shadow-lg',
      secondary:
        'bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 border border-zinc-200 shadow-xs',
      outline:
        'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 shadow-xs',
      ghost:
        'bg-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900',
      danger:
        'bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200',
    }

    const sizeStyles = {
      sm: 'w-8 h-8 text-xs p-1.5',
      md: 'w-10 h-10 text-sm p-2',
      lg: 'w-11 h-11 text-base p-2.5',
    }

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {icon}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
