import React from 'react'
import { cn } from '../../utils/cn'

export interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  online?: boolean
  className?: string
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  name,
  size = 'md',
  online,
  className,
}) => {
  const getInitials = (n?: string) => {
    if (!n) return 'MB'
    const parts = n.trim().split(/\s+/)
    if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() || 'MB'
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
  }

  const sizeStyles = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  }

  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  }

  return (
    <div className={cn('relative inline-flex shrink-0 select-none', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center font-medium bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xs ring-2 ring-white',
          sizeStyles[size]
        )}
      >
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
            online ? 'bg-emerald-500' : 'bg-zinc-400',
            dotSizes[size]
          )}
        />
      )}
    </div>
  )
}
