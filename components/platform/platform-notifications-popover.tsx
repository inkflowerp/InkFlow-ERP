'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  AlertTriangle,
  CreditCard,
  Building2,
  HeartPulse,
  ShieldCheck,
  Check,
  CheckCircle2,
  X,
  ArrowRight,
} from 'lucide-react'

interface NotificationItem {
  id: string
  category: 'critical' | 'security' | 'subscription' | 'tenant' | 'system'
  title: string
  description: string
  timestamp: string
  actionUrl: string
  isRead: boolean
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = []

export function PlatformNotificationsPopover() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })))
  }

  const toggleRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse ring-2 ring-slate-900" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">Platform Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold border border-red-500/30">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto opacity-80" />
                  <div className="font-semibold text-white text-xs">All Caught Up</div>
                  <p className="text-[11px] text-slate-500">
                    No active alerts or notifications. Platform operations are nominal.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isCritical = notif.category === 'critical'
                  const isSystem = notif.category === 'system'
                  const isSub = notif.category === 'subscription'

                  return (
                    <div
                      key={notif.id}
                      className={`p-3.5 transition-colors flex items-start justify-between gap-3 ${
                        notif.isRead ? 'bg-transparent opacity-75' : 'bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          {isCritical && <AlertTriangle className="h-4 w-4 text-red-400" />}
                          {isSystem && <HeartPulse className="h-4 w-4 text-amber-400" />}
                          {isSub && <CreditCard className="h-4 w-4 text-indigo-400" />}
                          {!isCritical && !isSystem && !isSub && <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                        </div>
                        <div className="space-y-0.5">
                          <Link
                            href={notif.actionUrl}
                            onClick={() => setOpen(false)}
                            className="font-bold text-white hover:text-indigo-300 transition-colors line-clamp-1 flex items-center gap-1 group"
                          >
                            <span>{notif.title}</span>
                            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <p className="text-[11px] text-slate-400 line-clamp-2">{notif.description}</p>
                          <span className="text-[10px] text-slate-500 font-mono inline-block pt-1">{notif.timestamp}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleRead(notif.id)}
                        className="text-slate-500 hover:text-slate-300 p-1 shrink-0 cursor-pointer"
                        title={notif.isRead ? 'Mark as unread' : 'Mark as read'}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 text-center">
              <Link
                href="/platform/audit"
                onClick={() => setOpen(false)}
                className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
              >
                View Full Platform Audit Log →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
