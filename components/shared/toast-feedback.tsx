'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  titleBn?: string
  message?: string
  messageBn?: string
  duration?: number
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const { tBilingual } = useI18n()

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      const newItem: ToastItem = { ...toast, id }
      setToasts((prev) => [...prev, newItem])

      const duration = toast.duration ?? 4000
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Floating Toast Viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-20 md:bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 max-w-sm pointer-events-none p-2 sm:p-0 pb-[env(safe-area-inset-bottom)]"
      >
        {toasts.map((toast) => {
          const displayTitle = tBilingual(toast.title, toast.titleBn)
          const displayMessage = toast.message
            ? tBilingual(toast.message, toast.messageBn)
            : undefined

          const iconMap = {
            success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />,
            error: <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />,
            warning: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
            info: <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />,
          }

          const styleMap = {
            success: 'bg-slate-900 border-emerald-500/30 text-emerald-200',
            error: 'bg-slate-900 border-rose-500/30 text-rose-200',
            warning: 'bg-slate-900 border-amber-500/30 text-amber-200',
            info: 'bg-slate-900 border-indigo-500/30 text-indigo-200',
          }

          return (
            <div
              key={toast.id}
              role="alert"
              className={cn(
                'pointer-events-auto p-3.5 rounded-2xl border shadow-xl backdrop-blur-md flex items-start justify-between gap-3 text-xs animate-in slide-in-from-bottom-2 fade-in-0',
                styleMap[toast.type]
              )}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {iconMap[toast.type]}
                <div className="space-y-0.5 min-w-0">
                  <div className="font-bold text-white bangla-text truncate">{displayTitle}</div>
                  {displayMessage && (
                    <div className="text-[11px] text-slate-400 bangla-text leading-relaxed">
                      {displayMessage}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-2 shrink-0 rounded-lg hover:bg-slate-800/60 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1.5 -mt-1"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
