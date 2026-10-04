'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Bell,
  AlertTriangle,
  Building2,
  ShieldAlert,
  ShieldCheck,
  Check,
  CheckCircle2,
  ArrowRight,
  Info,
  MessageSquare,
  CreditCard,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { usePlatformNotifications } from '@/hooks/use-platform-notifications'
import { formatTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'

export function PlatformNotificationsPopover() {
  const { tBilingual } = useI18n()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'support' | 'tenant' | 'billing' | 'system'>('all')

  const {
    notifications,
    unreadCount,
    totalCount,
    loading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
  } = usePlatformNotifications({ pageSize: 30 })

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications
    return notifications.filter((n) => {
      const type = n.type || 'system'
      if (activeTab === 'support') return type === 'support' || type.includes('support')
      if (activeTab === 'tenant') return type === 'tenant' || type === 'tenant_lifecycle'
      if (activeTab === 'billing') return type === 'billing'
      if (activeTab === 'system') {
        return (
          type === 'system' ||
          type === 'security' ||
          type === 'backup' ||
          type === 'maintenance' ||
          !['support', 'tenant', 'tenant_lifecycle', 'billing'].includes(type)
        )
      }
      return true
    })
  }, [notifications, activeTab])

  const getTypeIcon = (type: string, severity: string) => {
    if (severity === 'critical') return <ShieldAlert className="h-4 w-4 text-destructive" />
    if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-warning" />

    switch (type) {
      case 'support':
        return <MessageSquare className="h-4 w-4 text-primary" />
      case 'tenant':
      case 'tenant_lifecycle':
        return <Building2 className="h-4 w-4 text-primary" />
      case 'billing':
        return <CreditCard className="h-4 w-4 text-success" />
      case 'security':
        return <ShieldCheck className="h-4 w-4 text-primary" />
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open)
          if (!open) refetch()
        }}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        title={tBilingual('Alerts', 'বিজ্ঞপ্তি')}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse ring-2 ring-background" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-popover border border-border rounded-xl shadow-xs z-50 overflow-hidden text-xs animate-in fade-in-0 zoom-in-95 duration-150 font-sans">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm">
                  {tBilingual('Alerts', 'বিজ্ঞপ্তি')}
                </span>
                {unreadCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20">
                    {unreadCount} {tBilingual('new', 'নতুন')}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border">
                    {totalCount} {tBilingual('total', 'মোট')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title={tBilingual('Refresh', 'রিফ্রেশ')}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead()}
                    className="text-xs font-semibold text-primary hover:underline transition-colors cursor-pointer"
                  >
                    {tBilingual('Mark all read', 'সব পড়া হয়েছে')}
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Sub-Tabs */}
            <div className="flex items-center gap-1 p-1.5 bg-muted/40 border-b border-border overflow-x-auto scrollbar-none text-xs">
              {[
                { id: 'all', label: tBilingual('All', 'সব') },
                { id: 'support', label: tBilingual('Support', 'সহায়তা') },
                { id: 'tenant', label: tBilingual('Clients', 'ক্লায়েন্ট') },
                { id: 'billing', label: tBilingual('Bills', 'বিল') },
                { id: 'system', label: tBilingual('System', 'সিস্টেম') },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer',
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="max-h-84 overflow-y-auto divide-y divide-border">
              {loading && notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-primary border-t-transparent animate-spin" />
                  <span>{tBilingual('Loading...', 'লোড হচ্ছে...')}</span>
                </div>
              ) : error ? (
                <div className="p-6 text-center text-muted-foreground space-y-2">
                  <AlertTriangle className="h-6 w-6 text-warning mx-auto opacity-80" />
                  <div className="font-semibold text-destructive text-xs">
                    {tBilingual('Could not load', 'লোড করা যায়নি')}
                  </div>
                  <p className="text-xs text-muted-foreground">{error}</p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-2 px-3 py-1 bg-muted hover:bg-muted/80 text-foreground text-xs rounded-md cursor-pointer border border-border font-medium"
                  >
                    {tBilingual('Retry', 'আবার চেষ্টা করুন')}
                  </button>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto opacity-80" />
                  <div className="font-semibold text-foreground text-xs">
                    {tBilingual('No alerts', 'কোনো বিজ্ঞপ্তি নেই')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tBilingual('Nothing here right now.', 'এই বিভাগে কিছু নেই।')}
                  </p>
                </div>
              ) : (
                filteredNotifications.slice(0, 15).map((notif) => {
                  const targetUrl =
                    notif.action_url ||
                    (notif.type === 'support'
                      ? '/platform/support'
                      : notif.company_id
                      ? `/platform/tenants`
                      : '/platform/notifications')

                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        'p-3.5 transition-colors flex items-start justify-between gap-3 group',
                        notif.is_read
                          ? 'bg-transparent opacity-80 hover:opacity-100 hover:bg-muted/40'
                          : 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
                      )}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="mt-0.5 shrink-0 p-1 rounded-md bg-muted border border-border">
                          {getTypeIcon(notif.type, notif.severity)}
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <Link
                            href={targetUrl}
                            onClick={() => setOpen(false)}
                            className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 flex items-center gap-1"
                          >
                            <span className="truncate">{notif.title}</span>
                            <ArrowRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                          </Link>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{notif.message}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 tabular-nums">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              {formatTime(notif.created_at)}
                            </span>
                            {notif.company_name && (
                              <span className="text-foreground font-semibold truncate bg-muted px-1.5 py-0.5 rounded border border-border">
                                {notif.company_name}
                              </span>
                            )}
                            <span className="uppercase text-xs font-semibold text-muted-foreground px-1 py-0.5 rounded bg-muted border border-border">
                              {notif.type}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!notif.is_read && (
                        <button
                          type="button"
                          onClick={() => markAsRead(notif.id)}
                          className="text-muted-foreground hover:text-foreground p-1 shrink-0 cursor-pointer"
                          title={tBilingual('Mark as read', 'পড়া হয়েছে')}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-card border-t border-border flex items-center justify-between px-4">
              <Link
                href="/platform/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-primary hover:underline transition-colors flex items-center gap-1"
              >
                <span>{tBilingual('All Alerts', 'সব বিজ্ঞপ্তি')}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href="/platform/audit"
                onClick={() => setOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {tBilingual('Activity Log →', 'কাজের ইতিহাস →')}
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
