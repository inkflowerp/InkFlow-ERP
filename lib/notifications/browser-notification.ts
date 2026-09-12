// ==============================================================================
// PrintERP SaaS - Universal Browser Push & Web Notification Manager
// Wraps native Web Notification API with permission handling, icons,
// click-to-route action handling, audio chimes, and fallback support.
// ==============================================================================

import { playNotificationSound, NotificationSoundType } from './sound-manager'

export type BrowserPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported'

const PREF_STORAGE_KEY = 'printerp_browser_notifications_enabled'

/**
 * Checks whether the browser supports the Notification API
 */
export function isBrowserNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'Notification' in window
}

/**
 * Gets current browser notification permission status
 */
export function getBrowserNotificationPermission(): BrowserPermissionStatus {
  if (!isBrowserNotificationSupported()) return 'unsupported'
  try {
    return Notification.permission
  } catch {
    return 'unsupported'
  }
}

/**
 * Checks whether browser push notifications are enabled by user preference
 */
export function isBrowserNotificationEnabled(): boolean {
  if (typeof window === 'undefined') return false
  if (getBrowserNotificationPermission() !== 'granted') return false
  try {
    const pref = localStorage.getItem(PREF_STORAGE_KEY)
    return pref === null ? true : pref === 'true'
  } catch {
    return true
  }
}

/**
 * Sets user preference for browser push notifications
 */
export function setBrowserNotificationEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PREF_STORAGE_KEY, String(enabled))
    window.dispatchEvent(
      new CustomEvent('printerp_browser_notif_pref_changed', { detail: { enabled } })
    )
  } catch {}
}

/**
 * Requests browser permission to show system push notifications
 */
export async function requestBrowserNotificationPermission(): Promise<BrowserPermissionStatus> {
  if (!isBrowserNotificationSupported()) return 'unsupported'

  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setBrowserNotificationEnabled(true)
    }
    return permission
  } catch (err) {
    console.warn('[BrowserNotification] Permission request error:', err)
    return 'denied'
  }
}

export interface ShowBrowserNotificationOptions {
  title: string
  body?: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  soundType?: NotificationSoundType
  playSound?: boolean
  autoCloseMs?: number
  data?: Record<string, any>
  onClick?: (event: Event) => void
}

/**
 * Shows a native OS/browser push notification if permission is granted
 */
export async function showBrowserNotification(
  options: ShowBrowserNotificationOptions
): Promise<Notification | null> {
  if (typeof window === 'undefined' || !isBrowserNotificationSupported()) return null

  // Play audio chime if requested
  if (options.playSound !== false) {
    playNotificationSound(options.soundType || 'system')
  }

  // Check if browser permission is granted and user preference is enabled
  if (Notification.permission !== 'granted' || !isBrowserNotificationEnabled()) {
    return null
  }

  try {
    const defaultIcon = '/icons/icon-192x192.png'
    const defaultBadge = '/icons/icon-96x96.png'

    const notif = new Notification(options.title, {
      body: options.body,
      icon: options.icon || defaultIcon,
      badge: options.badge || defaultBadge,
      tag: options.tag || `printerp-${Date.now()}`,
      silent: true, // We handle synthesized polyphonic Web Audio ourselves
      data: {
        url: options.url,
        ...options.data,
      },
    })

    notif.onclick = (event) => {
      try {
        window.focus()
      } catch {}

      if (options.onClick) {
        options.onClick(event)
      } else if (options.url) {
        // Direct navigation if url provided
        window.location.href = options.url
      }
      notif.close()
    }

    // Auto close after delay (default 6 seconds)
    const closeDelay = options.autoCloseMs ?? 6000
    if (closeDelay > 0) {
      setTimeout(() => {
        try {
          notif.close()
        } catch {}
      }, closeDelay)
    }

    return notif
  } catch (err) {
    console.warn('[BrowserNotification] Dispatch error:', err)
    return null
  }
}
