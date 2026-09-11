import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, Clock, Truck, FileText, CheckCircle2, AlertCircle, ShoppingBag } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useDataStore } from '@/hooks/use-data-store'
import { useOutsideClick } from '@/hooks/use-outside-click'
import { STORAGE_KEYS, PrintERPDataStore } from '@/lib/db/data-store'
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
  time?: string
  created_at?: string
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
  const { company, currentRole } = useTenant()
  const { isOwner, isDesigner, isOperator, isAccountant, isDelivery } = usePermissions()
  const { tBilingual } = useI18n()

  const pathSlug = pathname ? pathname.split('/')[1] : null
  const slug = (pathSlug && pathSlug !== 'platform-admin' && pathSlug !== 'login' && pathSlug !== 'onboarding' ? pathSlug : company?.slug) || 'app'

  const { data: rawNotifications = [], set: setNotifications } = useDataStore<any[]>(
    STORAGE_KEYS.IN_APP_NOTIFICATIONS,
    []
  )

  // Fetch initial notifications from database on mount
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
  const notifications: NotificationItem[] = (Array.isArray(rawNotifications) ? rawNotifications : []).filter(
    (n) => !n.roles || n.roles.includes(roleKey) || isOwner
  )

  const unreadCount = notifications.filter((n) => !(n.is_read || n.read)).length

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
      const url = item.action_url.startsWith('/') ? `/${slug}${item.action_url}` : item.action_url
      router.push(url)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'delivery':
      case 'delivery_scheduled':
        return <Truck className="h-4 w-4 text-emerald-600" />
      case 'quote':
      case 'invoice_request':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'new_order':
      case 'order':
        return <ShoppingBag className="h-4 w-4 text-indigo-600" />
      case 'payment':
      case 'payment_received':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      case 'low_stock':
      case 'inventory':
        return <AlertCircle className="h-4 w-4 text-amber-600" />
      default:
        return <Clock className="h-4 w-4 text-slate-600" />
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
        title="Notifications"
        aria-label="Toggle notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 p-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 bangla-text">
                  {tBilingual('Notifications', 'নোটিফিকেশন')}
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300 bangla-text">
                    {unreadCount} {tBilingual('new', 'নতুন')}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer bangla-text"
                >
                  {tBilingual('Mark all read', 'সব পড়া হয়েছে')}
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto dark:divide-slate-800">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  {tBilingual("You're all caught up.", "সব আপডেট রয়েছে। কোনো নতুন নোটিফিকেশন নেই")}
                </div>
              ) : (
                notifications.map((n) => {
                  const isItemRead = Boolean(n.is_read || n.read)
                  const title = tBilingual(n.title, n.title_bn || n.titleBn || n.title)
                  const desc = tBilingual(
                    n.message || n.description || '',
                    n.message_bn || n.descriptionBn || n.message || n.description || ''
                  )
                  const time = n.time || n.created_at || 'Recently'

                  return (
                    <div
                      key={n.id}
                      onClick={() => markSingleAsRead(n)}
                      className={cn(
                        'flex items-start gap-3 p-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer',
                        !isItemRead && 'bg-blue-50/40 dark:bg-blue-950/20'
                      )}
                    >
                      <div className="rounded-full bg-slate-100 p-2 dark:bg-slate-800 shrink-0">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {title}
                          </p>
                          {!isItemRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {desc}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {time}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
      )}
    </div>
  )
}
