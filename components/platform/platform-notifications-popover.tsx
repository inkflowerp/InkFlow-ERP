'use client'

import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { getPlatformNotificationsAction } from '@/actions/platform-data.actions'
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/actions/platform.actions'
import { PlatformNotificationItem } from '@/types/platform.types'
import { formatTime } from '@/lib/formatters'

export function PlatformNotificationsPopover() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<PlatformNotificationItem[]>([])
  const [loading, setLoading] = useState(false)

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

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsReadAction()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {}
  }

  const handleToggleRead = async (id: string, currentRead: boolean) => {
    try {
      if (!currentRead) {
        await markNotificationReadAction(id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        )
      }
    } catch {}
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open)
          if (!open) loadNotifications()
        }}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        title="Platform Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse ring-2 ring-slate-900" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">Platform Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
              {loading && notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">Loading alerts...</div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto opacity-80" />
                  <div className="font-semibold text-white text-xs">All Caught Up</div>
                  <p className="text-[11px] text-slate-500">
                    No active alerts or notifications. Platform operations are nominal.
                  </p>
                </div>
              ) : (
                notifications.slice(0, 8).map((notif) => {
                  const isCritical = notif.severity === 'critical'
                  const isWarning = notif.severity === 'warning'
                  const targetUrl = notif.action_url || (notif.company_id ? `/platform/tenants/${notif.company_id}` : '/platform/notifications')

                  return (
                    <div
                      key={notif.id}
                      className={`p-3.5 transition-colors flex items-start justify-between gap-3 ${
                        notif.is_read ? 'bg-transparent opacity-75' : 'bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="mt-0.5 shrink-0">
                          {isCritical ? (
                            <ShieldAlert className="h-4 w-4 text-rose-400" />
                          ) : isWarning ? (
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                          ) : (
                            <Info className="h-4 w-4 text-indigo-400" />
                          )}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <Link
                            href={targetUrl}
                            onClick={() => setOpen(false)}
                            className="font-bold text-white hover:text-indigo-300 transition-colors line-clamp-1 flex items-center gap-1 group"
                          >
                            <span className="truncate">{notif.title}</span>
                            <ArrowRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <p className="text-[11px] text-slate-400 line-clamp-2">{notif.message}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                            <span>{formatTime(notif.created_at)}</span>
                            {notif.company_name && (
                              <span className="text-indigo-400 font-medium truncate">
                                • {notif.company_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {!notif.is_read && (
                        <button
                          type="button"
                          onClick={() => handleToggleRead(notif.id, notif.is_read)}
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
            <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 text-center flex items-center justify-between px-4">
              <Link
                href="/platform/notifications"
                onClick={() => setOpen(false)}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Open Notification Center →
              </Link>
              <Link
                href="/platform/audit"
                onClick={() => setOpen(false)}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Audit Log
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
