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
      'inline-flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-95'

    const variantStyles = {
      primary:
        'bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary shadow-sm',
      secondary:
        'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 focus-visible:ring-zinc-400 border border-zinc-200',
      outline:
        'border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:ring-primary',
      ghost:
        'bg-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-zinc-300',
      danger:
        'bg-rose/10 text-rose hover:bg-rose hover:text-white focus-visible:ring-rose-500',
    }

    const sizeStyles = {
      sm: 'w-8 h-8 text-xs p-1.5',
      md: 'w-10 h-10 text-sm p-2',
      lg: 'w-12 h-12 text-base p-2.5',
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
