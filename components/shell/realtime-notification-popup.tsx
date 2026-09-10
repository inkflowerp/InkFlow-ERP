'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Truck,
  FileText,
  X,
  ExternalLink,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { cn } from '@/lib/utils'

export interface RealtimePopupNotification {
  id: string
  title: string
  titleBn?: string
  message?: string
  messageBn?: string
  type?: 'order' | 'job' | 'payment' | 'delivery' | 'system'
  actionUrl?: string
  timestamp?: number
}

export function RealtimeNotificationPopup() {
  const router = useRouter()
  const { tBilingual } = useI18n()
  const { company } = useTenant()
  const [activePopup, setActivePopup] = useState<RealtimePopupNotification | null>(null)

  const dismissPopup = useCallback(() => {
    setActivePopup(null)
  }, [])

  useEffect(() => {
    const handleNotificationEvent = (event: Event) => {
      const customEvent = event as CustomEvent<RealtimePopupNotification>
      if (customEvent.detail) {
        setActivePopup(customEvent.detail)

        // Auto-dismiss after 6 seconds
        const timer = setTimeout(() => {
          setActivePopup((current) => (current?.id === customEvent.detail.id ? null : current))
        }, 6000)

        return () => clearTimeout(timer)
      }
    }

    window.addEventListener('printerp_popup_notification', handleNotificationEvent)
    return () => {
      window.removeEventListener('printerp_popup_notification', handleNotificationEvent)
    }
  }, [])

  if (!activePopup) return null

  const getIcon = () => {
    switch (activePopup.type) {
      case 'order':
        return <ShoppingBag className="h-5 w-5 text-indigo-400 shrink-0" />
      case 'job':
        return <FileText className="h-5 w-5 text-amber-400 shrink-0" />
      case 'payment':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
      case 'delivery':
        return <Truck className="h-5 w-5 text-cyan-400 shrink-0" />
      default:
        return <Bell className="h-5 w-5 text-indigo-400 shrink-0" />
    }
  }

  const handleAction = () => {
    if (activePopup.actionUrl) {
      router.push(activePopup.actionUrl)
    }
    dismissPopup()
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-16 sm:top-5 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="bg-slate-900/95 text-white border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl p-4 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-xs font-bold text-white bangla-text truncate">
              {tBilingual(activePopup.title, activePopup.titleBn)}
            </h5>
            <span className="text-[10px] text-slate-400 shrink-0">
              {tBilingual('Just now', 'এইমাত্র')}
            </span>
          </div>

          {activePopup.message && (
            <p className="text-[11px] text-slate-300 bangla-text line-clamp-2 leading-relaxed">
              {tBilingual(activePopup.message, activePopup.messageBn)}
            </p>
          )}

          {activePopup.actionUrl && (
            <div className="pt-1.5">
              <button
                onClick={handleAction}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors bangla-text"
              >
                {tBilingual('View Details', 'বিস্তারিত দেখুন')}
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={dismissPopup}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Helper function to trigger a popup notification from anywhere in client code
 */
export function triggerPopupNotification(notification: Omit<RealtimePopupNotification, 'id'>) {
  if (typeof window === 'undefined') return
  const id = `popup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
  const event = new CustomEvent<RealtimePopupNotification>('printerp_popup_notification', {
    detail: { ...notification, id },
  })
  window.dispatchEvent(event)
}
