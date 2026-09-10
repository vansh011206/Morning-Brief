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
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]'

    const variantStyles = {
      primary:
        'bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary shadow-sm hover:shadow-soft-glow',
      secondary:
        'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 focus-visible:ring-zinc-400 border border-zinc-200/80',
      outline:
        'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 focus-visible:ring-primary',
      ghost:
        'bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-zinc-300',
      danger:
        'bg-rose text-white hover:bg-rose-600 focus-visible:ring-rose-500 shadow-sm',
      amber:
        'bg-amber-sunrise text-white hover:bg-amber-600 focus-visible:ring-amber-500 shadow-sm hover:shadow-amber-glow',
    }

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-4 py-2 gap-2 h-10',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-11',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'
