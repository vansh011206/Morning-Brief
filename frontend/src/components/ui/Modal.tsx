import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { IconButton } from './IconButton'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-xl border border-zinc-200/80 z-10 overflow-hidden transform transition-all duration-200',
          sizeStyles[size]
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between p-5 border-b border-zinc-100">
            <div>
              {title && (
                <h3 className="text-base font-display font-semibold text-zinc-900">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-zinc-500 mt-1">{description}</p>
              )}
            </div>
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Close dialog"
              onClick={onClose}
              icon={<X className="w-4 h-4 text-zinc-500" />}
            />
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
