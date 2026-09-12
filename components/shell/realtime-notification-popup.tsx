'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShoppingBag,
  Truck,
  FileText,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { cn } from '@/lib/utils'
import {
  playNotificationSound,
  isSoundMuted,
  setSoundMuted,
  toggleSoundMuted,
  NotificationSoundType,
} from '@/lib/notifications/sound-manager'
import { showBrowserNotification } from '@/lib/notifications/browser-notification'

export type PopupNotificationType =
  | 'order'
  | 'job'
  | 'payment'
  | 'delivery'
  | 'inventory'
  | 'customer'
  | 'success'
  | 'warning'
  | 'system'

export interface RealtimePopupNotification {
  id: string
  title: string
  titleBn?: string
  message?: string
  messageBn?: string
  type?: PopupNotificationType
  actionUrl?: string
  actionLabel?: string
  actionLabelBn?: string
  timestamp?: number
  durationMs?: number
  silent?: boolean
  meta?: Record<string, any>
}

interface PopupItemProps {
  notification: RealtimePopupNotification
  onDismiss: (id: string) => void
  onAction: (url: string) => void
}

function PopupCard({ notification, onDismiss, onAction }: PopupItemProps) {
  const { tBilingual } = useI18n()
  const duration = notification.durationMs || 6500
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)
  const remainingTimeRef = useRef(duration)

  useEffect(() => {
    if (isPaused) return

    const interval = 50
    const timer = setInterval(() => {
      remainingTimeRef.current -= interval
      const pct = Math.max(0, (remainingTimeRef.current / duration) * 100)
      setProgress(pct)

      if (remainingTimeRef.current <= 0) {
        clearInterval(timer)
        onDismiss(notification.id)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [isPaused, duration, notification.id, onDismiss])

  const handleMouseEnter = () => setIsPaused(true)
  const handleMouseLeave = () => setIsPaused(false)

  const getTheme = () => {
    switch (notification.type) {
      case 'order':
        return {
          icon: <ShoppingBag className="h-5 w-5 text-indigo-400" />,
          badgeBg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
          borderAccent: 'border-l-indigo-500',
          progressBg: 'bg-indigo-500',
          tag: 'Sales Order',
          tagBn: 'সেলস অর্ডার',
        }
      case 'job':
        return {
          icon: <Layers className="h-5 w-5 text-amber-400" />,
          badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          borderAccent: 'border-l-amber-500',
          progressBg: 'bg-amber-500',
          tag: 'Shop Floor',
          tagBn: 'শপ ফ্লোর',
        }
      case 'payment':
        return {
          icon: <DollarSign className="h-5 w-5 text-emerald-400" />,
          badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          borderAccent: 'border-l-emerald-500',
          progressBg: 'bg-emerald-500',
          tag: 'Payment',
          tagBn: 'পেমেন্ট',
        }
      case 'delivery':
        return {
          icon: <Truck className="h-5 w-5 text-cyan-400" />,
          badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
          borderAccent: 'border-l-cyan-500',
          progressBg: 'bg-cyan-500',
          tag: 'Dispatch',
          tagBn: 'ডেলিভারি',
        }
      case 'inventory':
        return {
          icon: <Package className="h-5 w-5 text-purple-400" />,
          badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
          borderAccent: 'border-l-purple-500',
          progressBg: 'bg-purple-500',
          tag: 'Inventory',
          tagBn: 'ইনভেন্টরি',
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-rose-400" />,
          badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          borderAccent: 'border-l-rose-500',
          progressBg: 'bg-rose-500',
          tag: 'Alert',
          tagBn: 'সতর্কতা',
        }
      case 'success':
        return {
          icon: <Sparkles className="h-5 w-5 text-emerald-400" />,
          badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          borderAccent: 'border-l-emerald-500',
          progressBg: 'bg-emerald-500',
          tag: 'Success',
          tagBn: 'সফল',
        }
      default:
        return {
          icon: <Bell className="h-5 w-5 text-blue-400" />,
          badgeBg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
          borderAccent: 'border-l-blue-500',
          progressBg: 'bg-blue-500',
          tag: 'Realtime Sync',
          tagBn: 'লাইভ সিঙ্ক',
        }
    }
  }

  const theme = getTheme()

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="status"
      aria-live="polite"
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-white shadow-2xl border border-slate-700/60 dark:border-slate-800 backdrop-blur-xl transition-all duration-300 transform animate-in fade-in slide-in-from-top-3 border-l-4 pointer-events-auto',
        theme.borderAccent
      )}
    >
      <div className="p-4 flex items-start gap-3.5">
        {/* Icon Avatar */}
        <div className={cn('p-2.5 rounded-xl border shrink-0', theme.badgeBg)}>
          {theme.icon}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold border', theme.badgeBg)}>
                {tBilingual(theme.tag, theme.tagBn)}
              </span>
              <h5 className="text-xs font-bold text-slate-100 truncate bangla-text">
                {tBilingual(notification.title, notification.titleBn)}
              </h5>
            </div>

            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
              {tBilingual('Just now', 'এইমাত্র')}
            </span>
          </div>

          {notification.message && (
            <p className="text-[11px] text-slate-300 bangla-text line-clamp-2 leading-relaxed">
              {tBilingual(notification.message, notification.messageBn)}
            </p>
          )}

          {/* Action Row */}
          {notification.actionUrl && (
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAction(notification.actionUrl!)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all active:scale-95 bangla-text shadow-sm"
              >
                <span>
                  {tBilingual(
                    notification.actionLabel || 'View Details',
                    notification.actionLabelBn || 'বিস্তারিত দেখুন'
                  )}
                </span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => onDismiss(notification.id)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0 opacity-70 group-hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Auto-Dismiss Countdown Bar */}
      <div className="h-1 w-full bg-slate-800/80 overflow-hidden">
        <div
          className={cn('h-full transition-all linear duration-75', theme.progressBg)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export function RealtimeNotificationPopup() {
  const router = useRouter()
  const { company } = useTenant()
  const { tBilingual } = useI18n()
  const [queue, setQueue] = useState<RealtimePopupNotification[]>([])
  const [muted, setMuted] = useState(isSoundMuted())

  // Sync mute state with SoundManager
  useEffect(() => {
    const handleMuteChange = (e: Event) => {
      const custom = e as CustomEvent<{ muted: boolean }>
      if (custom.detail) {
        setMuted(custom.detail.muted)
      } else {
        setMuted(isSoundMuted())
      }
    }
    window.addEventListener('printerp_sound_mute_changed', handleMuteChange)
    return () => window.removeEventListener('printerp_sound_mute_changed', handleMuteChange)
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setQueue([])
  }, [])

  const handleAction = useCallback(
    (actionUrl: string) => {
      const slug = company?.slug || 'app'
      const url = actionUrl.startsWith('/') ? `/${slug}${actionUrl.replace(/^\/[^/]+/, '')}` : actionUrl
      router.push(url)
    },
    [company?.slug, router]
  )

  const handleToggleMute = useCallback(() => {
    const next = toggleSoundMuted()
    setMuted(next)
  }, [])

  useEffect(() => {
    const handleNotificationEvent = (event: Event) => {
      const customEvent = event as CustomEvent<RealtimePopupNotification>
      if (customEvent.detail) {
        const item = customEvent.detail

        // Play audio chime if not silent
        if (!item.silent) {
          const soundType: NotificationSoundType =
            item.type === 'payment'
              ? 'payment'
              : item.type === 'order'
              ? 'order'
              : item.type === 'delivery'
              ? 'delivery'
              : item.type === 'warning'
              ? 'warning'
              : item.type === 'success'
              ? 'success'
              : 'system'

          playNotificationSound(soundType)
        }

        // Add to active queue (capped at max 4 stacked notifications)
        setQueue((prev) => {
          const filtered = prev.filter((existing) => existing.id !== item.id)
          return [item, ...filtered].slice(0, 4)
        })
      }
    }

    window.addEventListener('printerp_popup_notification', handleNotificationEvent)
    return () => {
      window.removeEventListener('printerp_popup_notification', handleNotificationEvent)
    }
  }, [])

  if (queue.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed top-16 sm:top-5 right-4 left-4 sm:left-auto sm:w-[420px] z-[99999] flex flex-col gap-2 pointer-events-none"
    >
      {/* Controls Bar when multiple notifications are stacked */}
      {queue.length > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/95 border border-slate-700/60 backdrop-blur-md text-xs text-slate-300 pointer-events-auto shadow-2xl animate-in fade-in">
          <span className="font-semibold text-[11px] bangla-text">
            {queue.length} {tBilingual('Active Alerts', 'টি নোটিফিকেশন')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={muted ? 'Unmute alerts' : 'Mute alert sounds'}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5 text-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={dismissAll}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors bangla-text"
            >
              {tBilingual('Clear All', 'সব মুছুন')}
            </button>
          </div>
        </div>
      )}

      {/* Stacked Notification Cards */}
      <div className="flex flex-col gap-2.5 pointer-events-auto">
        {queue.map((item) => (
          <PopupCard
            key={item.id}
            notification={item}
            onDismiss={dismissNotification}
            onAction={handleAction}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Universal helper function to trigger a popup notification from anywhere across the client code
 */
export function triggerPopupNotification(notification: Omit<RealtimePopupNotification, 'id'> & { id?: string }) {
  if (typeof window === 'undefined') return
  const id = notification.id || `popup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  const event = new CustomEvent<RealtimePopupNotification>('printerp_popup_notification', {
    detail: { ...notification, id },
  })
  window.dispatchEvent(event)
}

/**
 * Hook for easy popup notification dispatch from any React component
 */
export function usePopupNotification() {
  const show = useCallback((notification: Omit<RealtimePopupNotification, 'id'> & { id?: string }) => {
    triggerPopupNotification(notification)
  }, [])

  return { show, trigger: show }
}
