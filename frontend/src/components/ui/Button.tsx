import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'amber'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold select-none transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]'

    const variantStyles = {
      primary:
        'bg-zinc-900 text-white shadow-lg hover:bg-black hover:shadow-xl hover:-translate-y-px active:scale-[0.98]',
      secondary:
        'bg-white border border-zinc-200 text-zinc-700 shadow-xs hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-sm',
      outline:
        'border border-zinc-200 bg-white text-zinc-700 shadow-xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900',
      ghost:
        'bg-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200/70',
      danger:
        'bg-gradient-to-b from-rose-600 to-rose-700 text-white shadow-sm hover:from-rose-700 hover:to-rose-800',
      amber:
        'bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-amber hover:from-amber-600 hover:to-amber-700',
    }

    const sizeStyles = {
      sm: 'h-8 px-3.5 text-xs gap-1.5 rounded-full',
      md: 'h-10 px-5 text-[14px] gap-2 rounded-full',
      lg: 'h-12 px-6 text-base gap-2.5 rounded-full',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : (
          leftIcon && <span className="inline-flex items-center shrink-0">{leftIcon}</span>
        )}
        <span className="inline-flex items-center gap-2.5">{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex items-center shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
