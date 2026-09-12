'use client'

// ==============================================================================
// InkFlow SaaS - Platform Notifications Popover Component
// Live real-time notification stream with Supabase Realtime, category tabs,
// unread badges, instant mark-as-read, and authoritative database counters.
// ==============================================================================

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Bell,
  AlertTriangle,
  Building2,
  HeartPulse,
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
  Sparkles,
  Zap,
} from 'lucide-react'
import { usePlatformNotifications } from '@/hooks/use-platform-notifications'
import { formatTime, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export function PlatformNotificationsPopover() {
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

  // Filtered notifications by tab (with safe fallback for unknown categories under 'all' or 'system')
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications
    return notifications.filter((n) => {
      const type = n.type || 'system'
      if (activeTab === 'support') return type === 'support' || type.includes('support')
      if (activeTab === 'tenant') return type === 'tenant' || type === 'tenant_lifecycle'
      if (activeTab === 'billing') return type === 'billing'
      if (activeTab === 'system') return type === 'system' || type === 'security' || type === 'backup' || type === 'maintenance' || !['support', 'tenant', 'tenant_lifecycle', 'billing'].includes(type)
      return true
    })
  }, [notifications, activeTab])

  const getTypeIcon = (type: string, severity: string) => {
    if (severity === 'critical') return <ShieldAlert className="h-4 w-4 text-rose-400" />
    if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-400" />

    switch (type) {
      case 'support':
        return <MessageSquare className="h-4 w-4 text-indigo-400" />
      case 'tenant':
      case 'tenant_lifecycle':
        return <Building2 className="h-4 w-4 text-blue-400" />
      case 'billing':
        return <CreditCard className="h-4 w-4 text-emerald-400" />
      case 'security':
        return <ShieldCheck className="h-4 w-4 text-purple-400" />
      default:
        return <Info className="h-4 w-4 text-cyan-400" />
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
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        title="Platform Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse ring-2 ring-slate-950" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in-0 zoom-in-95 duration-150 font-sans">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Platform Notifications</span>
                {unreadCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                    {unreadCount} new
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium">
                    {totalCount} total
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Refresh Notifications"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead()}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Sub-Tabs */}
            <div className="flex items-center gap-1 p-1.5 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto scrollbar-none text-[11px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'support', label: 'Support' },
                { id: 'tenant', label: 'Tenants' },
                { id: 'billing', label: 'Billing' },
                { id: 'system', label: 'System' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer',
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="max-h-84 overflow-y-auto divide-y divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-800">
              {loading && notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  <span>Loading platform updates...</span>
                </div>
              ) : error ? (
                <div className="p-6 text-center text-slate-400 space-y-2">
                  <AlertTriangle className="h-6 w-6 text-amber-400 mx-auto opacity-80" />
                  <div className="font-semibold text-rose-300 text-xs">Unable to load notifications</div>
                  <p className="text-[11px] text-slate-500">{error}</p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded-lg cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto opacity-80" />
                  <div className="font-semibold text-white text-xs">No notifications yet.</div>
                  <p className="text-[11px] text-slate-500">
                    No active notifications in this category. Platform operations are nominal.
                  </p>
                </div>
              ) : (
                filteredNotifications.slice(0, 15).map((notif) => {
                  const targetUrl =
                    notif.action_url ||
                    (notif.type === 'support'
                      ? '/platform/support'
                      : notif.company_id
                      ? `/platform/companies`
                      : '/platform/notifications')

                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        'p-3.5 transition-colors flex items-start justify-between gap-3 group',
                        notif.is_read
                          ? 'bg-transparent opacity-80 hover:opacity-100 hover:bg-slate-800/30'
                          : 'bg-indigo-950/20 hover:bg-indigo-950/40 border-l-2 border-indigo-500'
                      )}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="mt-0.5 shrink-0 p-1 rounded-lg bg-slate-950/80 border border-slate-800">
                          {getTypeIcon(notif.type, notif.severity)}
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <Link
                            href={targetUrl}
                            onClick={() => setOpen(false)}
                            className="font-bold text-slate-100 hover:text-indigo-300 transition-colors line-clamp-1 flex items-center gap-1"
                          >
                            <span className="truncate">{notif.title}</span>
                            <ArrowRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                          </Link>
                          <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">{notif.message}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {formatTime(notif.created_at)}
                            </span>
                            {notif.company_name && (
                              <span className="text-indigo-300 font-semibold truncate bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-800/60">
                                {notif.company_name}
                              </span>
                            )}
                            <span className="uppercase text-[9px] font-bold text-slate-400 px-1 py-0.2 rounded bg-slate-800 border border-slate-700">
                              {notif.type}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!notif.is_read && (
                        <button
                          type="button"
                          onClick={() => markAsRead(notif.id)}
                          className="text-slate-500 hover:text-indigo-400 p-1 shrink-0 cursor-pointer"
                          title="Mark as read"
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
            <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between px-4">
              <Link
                href="/platform/notifications"
                onClick={() => setOpen(false)}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                <span>Notification Center</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href="/platform/audit"
                onClick={() => setOpen(false)}
                className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                Audit Trail →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
