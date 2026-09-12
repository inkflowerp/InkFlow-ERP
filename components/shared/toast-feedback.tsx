'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { playNotificationSound, NotificationSoundType } from '@/lib/notifications/sound-manager'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  titleBn?: string
  message?: string
  messageBn?: string
  duration?: number
  silent?: boolean
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

      // Play soft chime if not silenced
      if (!toast.silent) {
        const soundMap: Record<ToastType, NotificationSoundType> = {
          success: 'success',
          error: 'error',
          warning: 'warning',
          info: 'system',
        }
        playNotificationSound(soundMap[toast.type] || 'system')
      }

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

  // Listen to external custom events from non-React code or notification bus
  useEffect(() => {
    const handleCustomToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastItem>
      if (customEvent.detail) {
        showToast(customEvent.detail)
      }
    }

    window.addEventListener('printerp_toast_dispatch', handleCustomToast)
    return () => {
      window.removeEventListener('printerp_toast_dispatch', handleCustomToast)
    }
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Floating Toast Viewport - Top-tier Z-Index */}
      <div
        aria-live="polite"
        className="fixed bottom-20 md:bottom-5 right-4 left-4 sm:left-auto z-[99999] flex flex-col gap-2 max-w-sm pointer-events-none p-2 sm:p-0 pb-[env(safe-area-inset-bottom)]"
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
            success: 'bg-slate-900/95 border-emerald-500/40 text-emerald-200 shadow-emerald-950/30',
            error: 'bg-slate-900/95 border-rose-500/40 text-rose-200 shadow-rose-950/30',
            warning: 'bg-slate-900/95 border-amber-500/40 text-amber-200 shadow-amber-950/30',
            info: 'bg-slate-900/95 border-indigo-500/40 text-indigo-200 shadow-indigo-950/30',
          }

          return (
            <div
              key={toast.id}
              role="alert"
              className={cn(
                'pointer-events-auto p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start justify-between gap-3 text-xs animate-in slide-in-from-bottom-2 fade-in-0 transition-all',
                styleMap[toast.type]
              )}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {iconMap[toast.type]}
                <div className="space-y-0.5 min-w-0">
                  <div className="font-bold text-white bangla-text truncate">{displayTitle}</div>
                  {displayMessage && (
                    <div className="text-[11px] text-slate-300 bangla-text leading-relaxed">
                      {displayMessage}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-2 shrink-0 rounded-lg hover:bg-slate-800/80 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1.5 -mt-1 transition-colors"
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

/**
 * Non-React helper to trigger a toast from any scope
 */
export function dispatchToast(toast: Omit<ToastItem, 'id'>) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('printerp_toast_dispatch', {
      detail: toast,
    })
  )
}
