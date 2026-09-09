'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Building2,
  RefreshCw,
  Check,
  Filter,
  Info,
  ExternalLink,
  Trash2,
  Clock,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPlatformNotificationsAction } from '@/actions/platform-data.actions'
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/actions/platform.actions'
import { PlatformNotificationItem } from '@/types/platform.types'

export default function PlatformNotificationsPage() {
  const [notifications, setNotifications] = useState<PlatformNotificationItem[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const res = await getPlatformNotificationsAction()
      if (res.success && res.data) {
        setNotifications(res.data)
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handleMarkRead = async (id: string) => {
    setActionInProgress(id)
    try {
      const res = await markNotificationReadAction(id)
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        )
      }
    } catch {
      // Ignore
    } finally {
      setActionInProgress(null)
    }
  }

  const handleMarkAllRead = async () => {
    setActionInProgress('all')
    try {
      const res = await markAllNotificationsReadAction()
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        showToast('All notifications marked as read.')
      }
    } catch {
      // Ignore
    } finally {
      setActionInProgress(null)
    }
  }

  const filtered = notifications.filter((n) => {
    if (showUnreadOnly && n.is_read) return false
    if (filterType !== 'all' && n.type !== filterType) return false
    return true
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            Alerts &amp; Operational Telemetry
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Bell className="h-7 w-7 text-indigo-400" />
            Platform Notifications Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time administrative alerts, security incidents, tenant quota warnings, and subscription life-cycle events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={actionInProgress !== null}
              onClick={handleMarkAllRead}
              className="h-9 text-xs border-indigo-500/30 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Mark All Read ({unreadCount})
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={loadNotifications}
            className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Toast Banner */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: 'all', label: 'All Alerts' },
            { key: 'security', label: 'Security' },
            { key: 'tenant_suspension', label: 'Tenant Lifecycle' },
            { key: 'usage_warning', label: 'Quota Warnings' },
            { key: 'system', label: 'System Health' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterType(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer self-end sm:self-center">
          <input
            type="checkbox"
            checked={showUnreadOnly}
            onChange={(e) => setShowUnreadOnly(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
          />
          <span>Unread only ({unreadCount})</span>
        </label>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/40 p-12 text-center">
            <Bell className="h-10 w-10 mx-auto mb-3 text-slate-600" />
            <p className="font-bold text-slate-300 text-sm">No notifications to display</p>
            <p className="text-xs text-slate-500 mt-1">All platform events are up to date.</p>
          </Card>
        ) : (
          filtered.map((item) => {
            const isCritical = item.severity === 'critical'
            const isWarning = item.severity === 'warning'

            return (
              <Card
                key={item.id}
                className={`border p-4 rounded-2xl transition-all ${
                  !item.is_read
                    ? 'bg-slate-900/90 border-indigo-500/30 ring-1 ring-indigo-500/20'
                    : 'bg-slate-950/40 border-slate-800/80 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isCritical
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : isWarning
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {isCritical ? (
                        <ShieldAlert className="h-4 w-4" />
                      ) : isWarning ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Info className="h-4 w-4" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-white">{item.title}</h4>
                        {!item.is_read && (
                          <span className="h-2 w-2 rounded-full bg-indigo-400" />
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            isCritical
                              ? 'bg-rose-950/50 text-rose-300 border-rose-800'
                              : isWarning
                              ? 'bg-amber-950/50 text-amber-300 border-amber-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                        {item.message}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                        {item.company_id && (
                          <Link
                            href={`/platform/tenants/${item.company_id}`}
                            className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                          >
                            <Building2 className="h-3 w-3" />
                            Tenant Profile
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {!item.is_read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={actionInProgress === item.id}
                      onClick={() => handleMarkRead(item.id)}
                      className="h-8 px-2.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 shrink-0 self-end sm:self-start"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Mark Read
                    </Button>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
