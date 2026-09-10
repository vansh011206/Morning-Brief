import React from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore, type ToastType } from '../../store/useToastStore'
import { cn } from '../../utils/cn'

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose shrink-0" />
      default:
        return <Info className="w-5 h-5 text-primary shrink-0" />
    }
  }

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-200 bg-white'
      case 'warning':
        return 'border-amber-200 bg-white'
      case 'error':
        return 'border-rose-200 bg-white'
      default:
        return 'border-primary-200 bg-white'
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all transform duration-200 translate-y-0',
            getBorderColor(toast.type)
          )}
        >
          {getIcon(toast.type)}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-zinc-900 leading-tight">
              {toast.title}
            </h4>
            {toast.description && (
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {toast.description}
              </p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-zinc-400 hover:text-zinc-600 p-0.5 rounded transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
