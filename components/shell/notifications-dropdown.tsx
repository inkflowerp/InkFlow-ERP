'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Bell,
  Clock,
  Truck,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShoppingBag,
  ExternalLink,
  CheckCheck,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useDataStore } from '@/hooks/use-data-store'
import { useOutsideClick } from '@/hooks/use-outside-click'
import { useTableSubscription } from '@/components/providers/realtime-provider'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import {
  getInAppNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/actions/notification.actions'

interface NotificationItem {
  id: string
  roles?: string[]
  title: string
  title_bn?: string
  titleBn?: string
  message?: string
  description?: string
  descriptionBn?: string
  message_bn?: string
  created_at?: string
  time?: string
  type: string
  read?: boolean
  is_read?: boolean
  action_url?: string
}

export function NotificationsDropdown() {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useOutsideClick<HTMLDivElement>(() => setIsOpen(false), isOpen)
  const dialogRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { company, currentRole } = useTenant()
  const { isOwner, isDesigner, isOperator, isAccountant, isDelivery } = usePermissions()
  const { tBilingual } = useI18n()

  const pathSlug = pathname ? pathname.split('/')[1] : null
  const slug =
    (pathSlug &&
    pathSlug !== 'platform-admin' &&
    pathSlug !== 'login' &&
    pathSlug !== 'onboarding'
      ? pathSlug
      : company?.slug) || 'app'

  const { data: rawNotifications = [], set: setNotifications } = useDataStore<any[]>(
    STORAGE_KEYS.IN_APP_NOTIFICATIONS,
    []
  )

  // Fetch initial notifications from database on mount or tenant change
  useEffect(() => {
    if (company?.id) {
      getInAppNotificationsAction(company.id)
        .then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            setNotifications(res.data)
          }
        })
        .catch(() => {})
    }
  }, [company?.id, setNotifications])

  // Realtime Phase 6 Push Subscription: In-app notifications table
  useTableSubscription('in_app_notifications', (event) => {
    if (event.eventType === 'INSERT' && event.record) {
      const newNotif = event.record as any
      setNotifications((prev: any[]) => {
        const existing = prev || []
        if (existing.some((n) => n.id === newNotif.id)) return existing
        return [newNotif, ...existing]
      })
    } else if (event.eventType === 'UPDATE' && event.record) {
      const updated = event.record as any
      setNotifications((prev: any[]) =>
        (prev || []).map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
      )
    } else if (event.eventType === 'DELETE' && event.oldRecord) {
      const deletedId = (event.oldRecord as any).id
      setNotifications((prev: any[]) => (prev || []).filter((n) => n.id !== deletedId))
    }
  })

  // Keyboard accessibility: Escape to close dropdown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    },
    []
  )

  const roleKey = isOwner
    ? 'owner'
    : isDesigner
    ? 'designer'
    : isOperator
    ? 'operator'
    : isAccountant
    ? 'accountant'
    : isDelivery
    ? 'installer'
    : currentRole || 'owner'

  // User/role-scoped notification list
  const notifications: NotificationItem[] = useMemo(() => {
    return (Array.isArray(rawNotifications) ? rawNotifications : []).filter(
      (n) => !n.roles || n.roles.includes(roleKey) || isOwner
    )
  }, [rawNotifications, roleKey, isOwner])

  const unreadCount = notifications.filter((n) => !(n.is_read || n.read)).length

  // Date Grouping (Today, Yesterday, Earlier)
  const groupedNotifications = useMemo(() => {
    const today: NotificationItem[] = []
    const yesterday: NotificationItem[] = []
    const earlier: NotificationItem[] = []

    const now = new Date()
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterdayMidnight = todayMidnight - 24 * 60 * 60 * 1000

    for (const item of notifications) {
      const dateVal = item.created_at ? new Date(item.created_at).getTime() : 0
      if (dateVal >= todayMidnight) {
        today.push(item)
      } else if (dateVal >= yesterdayMidnight) {
        yesterday.push(item)
      } else {
        earlier.push(item)
      }
    }

    return { today, yesterday, earlier }
  }, [notifications])

  const markAllAsRead = async () => {
    const updated = (Array.isArray(rawNotifications) ? rawNotifications : []).map((n) => ({
      ...n,
      is_read: true,
      read: true,
    }))
    setNotifications(updated)

    if (company?.id) {
      try {
        await markAllNotificationsReadAction(company.id)
      } catch {}
    }
  }

  const markSingleAsRead = async (item: NotificationItem) => {
    const updated = (Array.isArray(rawNotifications) ? rawNotifications : []).map((n) =>
      n.id === item.id ? { ...n, is_read: true, read: true } : n
    )
    setNotifications(updated)

    if (company?.id) {
      try {
        await markNotificationReadAction(item.id, company.id)
      } catch {}
    }

    if (item.action_url) {
      setIsOpen(false)
      const rawUrl = item.action_url
      const targetUrl = rawUrl.startsWith('/')
        ? rawUrl.startsWith(`/${slug}`)
          ? rawUrl
          : `/${slug}${rawUrl}`
        : `/${slug}/${rawUrl}`
      router.push(targetUrl)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'delivery':
      case 'delivery_scheduled':
        return <Truck className="h-4 w-4 text-primary" />
      case 'quote':
      case 'quotation_approved':
      case 'invoice_request':
        return <FileText className="h-4 w-4 text-primary" />
      case 'new_order':
      case 'order':
        return <ShoppingBag className="h-4 w-4 text-primary" />
      case 'payment':
      case 'payment_received':
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case 'low_stock':
      case 'production_delay':
        return <AlertTriangle className="h-4 w-4 text-warning" />
      case 'invoice_overdue':
      case 'production_problem':
      case 'attendance_exception':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const formatRelativeTime = (iso?: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
      if (diffSec < 60) return tBilingual('Just now', 'এইমাত্র')
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  const renderGroup = (titleEn: string, titleBn: string, items: NotificationItem[]) => {
    if (items.length === 0) return null

    return (
      <div className="py-1">
        <div className="px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
          {tBilingual(titleEn, titleBn)} ({items.length})
        </div>
        <div className="divide-y divide-border">
          {items.map((n) => {
            const isItemRead = Boolean(n.is_read || n.read)
            const title = tBilingual(n.title, n.title_bn || n.titleBn || n.title)
            const desc = tBilingual(
              n.message || n.description || '',
              n.message_bn || n.descriptionBn || n.message || n.description || ''
            )
            const timeStr = formatRelativeTime(n.created_at) || n.time || ''

            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => markSingleAsRead(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    markSingleAsRead(n)
                  }
                }}
                className={cn(
                  'flex items-start gap-3 p-3.5 transition-colors hover:bg-muted cursor-pointer focus:outline-hidden focus-visible:bg-muted',
                  !isItemRead && 'bg-primary/5'
                )}
                aria-label={`${title}: ${desc}`}
              >
                <div className="rounded-lg bg-card border border-border p-2 shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {title}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {timeStr && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {timeStr}
                        </span>
                      )}
                      {!isItemRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {desc}
                  </p>
                  {n.action_url && (
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-1">
                      {tBilingual('View details', 'বিস্তারিত দেখুন')}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer shadow-xs transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        title={tBilingual('Notifications', 'বিজ্ঞপ্তি')}
        aria-label={
          unreadCount > 0
            ? `${tBilingual('Notifications', 'বিজ্ঞপ্তি')}, ${unreadCount} ${tBilingual('unread', 'অপঠিত')}`
            : tBilingual('Notifications', 'বিজ্ঞপ্তি')
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-label={tBilingual('Notifications', 'বিজ্ঞপ্তি')}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="absolute right-0 mt-2 w-80 md:w-96 rounded-xl border border-border bg-card shadow-xs z-50 animate-in fade-in-0 zoom-in-95 focus:outline-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-3.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground bangla-text">
                {tBilingual('Notifications', 'বিজ্ঞপ্তি')}
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary bangla-text">
                  {unreadCount} {tBilingual('new', 'নতুন')}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium cursor-pointer bangla-text focus:outline-hidden focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {tBilingual('Mark all read', 'সব পড়া হয়েছে')}
              </button>
            )}
          </div>

          {/* Grouped Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <Bell className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                <p className="font-medium text-foreground">
                  {tBilingual("You're all caught up", 'কোনো নতুন নোটিফিকেশন নেই')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tBilingual(
                    'Realtime notifications for orders, invoices, and production will appear here.',
                    'অর্ডার, ইনভয়েস এবং প্রোডাকশন সংক্রান্ত তাৎক্ষণিক বিজ্ঞপ্তি এখানে প্রদর্শিত হবে।'
                  )}
                </p>
              </div>
            ) : (
              <>
                {renderGroup('Today', 'আজ', groupedNotifications.today)}
                {renderGroup('Yesterday', 'গতকাল', groupedNotifications.yesterday)}
                {renderGroup('Earlier', 'পূর্বে', groupedNotifications.earlier)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
