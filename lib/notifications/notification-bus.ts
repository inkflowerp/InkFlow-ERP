// ==============================================================================
// PrintERP SaaS - Universal Notification Event Bus & Dispatcher
// Seamlessly coordinates in-app popup cards, toast banners, Web Audio chimes,
// native browser push notifications, and cross-tab synchronization.
// ==============================================================================

import { playNotificationSound, NotificationSoundType } from './sound-manager'
import { showBrowserNotification } from './browser-notification'
import type { RealtimePopupNotification, PopupNotificationType } from '@/components/shell/realtime-notification-popup'

export type NotificationDisplayMode = 'popup' | 'toast' | 'both' | 'silent'

export type UnifiedNotificationType =
  | 'order'
  | 'job'
  | 'payment'
  | 'delivery'
  | 'inventory'
  | 'customer'
  | 'attendance'
  | 'success'
  | 'warning'
  | 'error'
  | 'system'
  | 'broadcast'

export interface NotifyPayload {
  id?: string
  title: string
  titleBn?: string
  message?: string
  messageBn?: string
  type?: UnifiedNotificationType
  actionUrl?: string
  actionLabel?: string
  actionLabelBn?: string
  mode?: NotificationDisplayMode
  sound?: boolean | NotificationSoundType
  push?: boolean
  durationMs?: number
  meta?: Record<string, any>
}

// Cross-tab broadcast channel
let broadcastChannel: BroadcastChannel | null = null
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('printerp_notifications_channel')
  } catch {}
}

/**
 * Universal notification dispatch method
 */
export function notify(payload: NotifyPayload): string {
  if (typeof window === 'undefined') return payload.id || ''

  const id = payload.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  const type = payload.type || 'system'
  const mode = payload.mode || 'popup'
  const shouldPlaySound = payload.sound !== false
  const soundType: NotificationSoundType =
    typeof payload.sound === 'string'
      ? payload.sound
      : type === 'attendance'
      ? 'attendance'
      : type === 'payment'
      ? 'payment'
      : type === 'order'
      ? 'order'
      : type === 'delivery'
      ? 'delivery'
      : type === 'error'
      ? 'error'
      : type === 'warning'
      ? 'warning'
      : type === 'broadcast'
      ? 'broadcast'
      : type === 'success'
      ? 'success'
      : 'system'

  // 1. Play Synthesizer Sound
  if (shouldPlaySound && mode !== 'silent') {
    playNotificationSound(soundType)
  }

  // 2. Dispatch In-App Popup Card (High Z-Index)
  if (mode === 'popup' || mode === 'both') {
    const popupPayload: RealtimePopupNotification = {
      id,
      title: payload.title,
      titleBn: payload.titleBn,
      message: payload.message,
      messageBn: payload.messageBn,
      type: (type === 'attendance' ? 'system' : type === 'error' ? 'warning' : type) as PopupNotificationType,
      actionUrl: payload.actionUrl,
      actionLabel: payload.actionLabel,
      actionLabelBn: payload.actionLabelBn,
      durationMs: payload.durationMs || 6500,
      silent: true, // We already handled sound above
      meta: payload.meta,
    }

    window.dispatchEvent(
      new CustomEvent<RealtimePopupNotification>('printerp_popup_notification', {
        detail: popupPayload,
      })
    )
  }

  // 3. Dispatch Toast Banner (High Z-Index)
  if (mode === 'toast' || mode === 'both') {
    const toastType =
      type === 'error'
        ? 'error'
        : type === 'warning'
        ? 'warning'
        : type === 'success' || type === 'payment'
        ? 'success'
        : 'info'

    window.dispatchEvent(
      new CustomEvent('printerp_toast_dispatch', {
        detail: {
          id,
          type: toastType,
          title: payload.title,
          titleBn: payload.titleBn,
          message: payload.message,
          messageBn: payload.messageBn,
          duration: payload.durationMs || 4000,
          silent: true,
        },
      })
    )
  }

  // 4. Dispatch Native OS/Browser Push Notification
  if (payload.push !== false) {
    showBrowserNotification({
      title: payload.title,
      body: payload.message,
      url: payload.actionUrl,
      soundType,
      playSound: false, // We already played sound
      tag: id,
    }).catch(() => {})
  }

  // 5. Cross-tab synchronization
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: 'NOTIFICATION_DISPATCHED',
        payload: { ...payload, id },
      })
    } catch {}
  }

  return id
}

// Fluent helper methods
notify.success = (title: string, message?: string, options?: Partial<NotifyPayload>) =>
  notify({ title, message, type: 'success', sound: 'success', ...options })

notify.error = (title: string, message?: string, options?: Partial<NotifyPayload>) =>
  notify({ title, message, type: 'error', sound: 'error', mode: 'both', ...options })

notify.warning = (title: string, message?: string, options?: Partial<NotifyPayload>) =>
  notify({ title, message, type: 'warning', sound: 'warning', ...options })

notify.info = (title: string, message?: string, options?: Partial<NotifyPayload>) =>
  notify({ title, message, type: 'system', sound: 'system', ...options })

notify.order = (title: string, message?: string, actionUrl?: string, options?: Partial<NotifyPayload>) =>
  notify({ title, message, actionUrl, type: 'order', sound: 'order', mode: 'popup', ...options })

notify.payment = (title: string, message?: string, actionUrl?: string, options?: Partial<NotifyPayload>) =>
  notify({ title, message, actionUrl, type: 'payment', sound: 'payment', mode: 'popup', ...options })

notify.delivery = (title: string, message?: string, actionUrl?: string, options?: Partial<NotifyPayload>) =>
  notify({ title, message, actionUrl, type: 'delivery', sound: 'delivery', mode: 'popup', ...options })

notify.attendance = (title: string, message?: string, options?: Partial<NotifyPayload>) =>
  notify({ title, message, type: 'attendance', sound: 'attendance', mode: 'popup', ...options })

notify.broadcast = (title: string, message?: string, options?: Partial<NotifyPayload>) =>
  notify({ title, message, type: 'broadcast', sound: 'broadcast', mode: 'both', ...options })
