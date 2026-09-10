'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  Megaphone,
  Download,
  Search,
  Send,
  X,
  HeartPulse,
  CreditCard,
  Layers,
  Sparkles,
  Users,
  Shield,
  Activity,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getPlatformNotificationsAction,
  broadcastPlatformNotificationAction,
  deletePlatformNotificationAction,
  clearAllReadPlatformNotificationsAction,
} from '@/actions/platform-data.actions'
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/actions/platform.actions'
import { PlatformNotificationItem } from '@/types/platform.types'

export default function PlatformNotificationsPage() {
  const [notifications, setNotifications] = useState<PlatformNotificationItem[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Broadcast Modal State
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false)
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    severity: 'info' as 'info' | 'warning' | 'critical',
    type: 'broadcast',
    target_audience: 'all_tenants' as 'all_tenants' | 'all_admins' | 'specific_tenant',
    company_id: '',
    action_url: '',
  })
  const [broadcasting, setBroadcasting] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const res = await getPlatformNotificationsAction()
      if (res.success && res.data) {
        setNotifications(res.data)
      } else if (res.error) {
        showToast(res.error, 'error')
      }
    } catch {
      showToast('Failed to load notifications.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  // Mark Single Notification as Read
  const handleMarkRead = async (id: string) => {
    setActionInProgress(id)
    try {
      const res = await markNotificationReadAction(id)
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        )
        showToast('Notification marked as read.')
      }
    } catch {
      showToast('Failed to mark notification read.', 'error')
    } finally {
      setActionInProgress(null)
    }
  }

  // Mark All Notifications as Read
  const handleMarkAllRead = async () => {
    setActionInProgress('all')
    try {
      const res = await markAllNotificationsReadAction()
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        showToast('All notifications marked as read.')
      }
    } catch {
      showToast('Failed to mark notifications read.', 'error')
    } finally {
      setActionInProgress(null)
    }
  }

  // Delete Single Notification
  const handleDeleteNotification = async (id: string) => {
    setActionInProgress(`del-${id}`)
    try {
      const res = await deletePlatformNotificationAction(id)
      if (res.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        showToast('Notification dismissed.')
      } else {
        showToast(res.error || 'Failed to delete notification.', 'error')
      }
    } catch {
      showToast('Failed to delete notification.', 'error')
    } finally {
      setActionInProgress(null)
    }
  }

  // Clear All Read Notifications
  const handleClearAllRead = async () => {
    const readCount = notifications.filter((n) => n.is_read).length
    if (readCount === 0) {
      showToast('No read notifications to clear.')
      return
    }

    if (!confirm(`Are you sure you want to clear ${readCount} read notifications?`)) {
      return
    }

    setActionInProgress('clear-read')
    try {
      const res = await clearAllReadPlatformNotificationsAction()
      if (res.success) {
        setNotifications((prev) => prev.filter((n) => !n.is_read))
        showToast(`Cleared ${readCount} read notifications.`)
      } else {
        showToast(res.error || 'Failed to clear notifications.', 'error')
      }
    } catch {
      showToast('Failed to clear read notifications.', 'error')
    } finally {
      setActionInProgress(null)
    }
  }

  // Broadcast Notice Submit
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      showToast('Please enter both a title and a message.', 'error')
      return
    }

    setBroadcasting(true)
    try {
      const res = await broadcastPlatformNotificationAction({
        title: broadcastForm.title,
        message: broadcastForm.message,
        severity: broadcastForm.severity,
        type: broadcastForm.type,
        target_audience: broadcastForm.target_audience,
        company_id: broadcastForm.company_id || undefined,
        action_url: broadcastForm.action_url || undefined,
      })

      if (res.success && res.data) {
        setNotifications((prev) => [res.data!, ...prev])
        setBroadcastModalOpen(false)
        setBroadcastForm({
          title: '',
          message: '',
          severity: 'info',
          type: 'broadcast',
          target_audience: 'all_tenants',
          company_id: '',
          action_url: '',
        })
        showToast('Administrative notice broadcasted successfully.')
      } else {
        showToast(res.error || 'Failed to broadcast notification.', 'error')
      }
    } catch {
      showToast('An unexpected error occurred.', 'error')
    } finally {
      setBroadcasting(false)
    }
  }

  // CSV Export
  const handleExportCSV = () => {
    if (notifications.length === 0) {
      showToast('No notifications to export.')
      return
    }

    const headers = [
      'ID',
      'Title',
      'Message',
      'Severity',
      'Type',
      'Target Audience',
      'Tenant Company',
      'Action URL',
      'Status',
      'Created At',
    ]

    const rows = filteredNotifications.map((n) => [
      `"${n.id}"`,
      `"${(n.title || '').replace(/"/g, '""')}"`,
      `"${(n.message || '').replace(/"/g, '""')}"`,
      `"${n.severity}"`,
      `"${n.type}"`,
      `"${n.target_audience || 'all'}"`,
      `"${(n.company_name || n.company_id || 'N/A').replace(/"/g, '""')}"`,
      `"${n.action_url || ''}"`,
      `"${n.is_read ? 'Read' : 'Unread'}"`,
      `"${new Date(n.created_at).toISOString()}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `platform_notifications_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Notifications telemetry exported to CSV.')
  }

  // Filtered & Searched Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (showUnreadOnly && n.is_read) return false
      if (filterSeverity !== 'all' && n.severity !== filterSeverity) return false

      if (filterType !== 'all') {
        if (filterType === 'security' && n.type !== 'security') return false
        if (filterType === 'tenant_lifecycle' && !['tenant_suspension', 'tenant_lifecycle'].includes(n.type)) return false
        if (filterType === 'usage_warning' && !['usage_warning', 'quota'].includes(n.type)) return false
        if (filterType === 'system' && !['system', 'health', 'job'].includes(n.type)) return false
        if (filterType === 'billing' && !['billing', 'subscription'].includes(n.type)) return false
        if (filterType === 'broadcast' && n.type !== 'broadcast') return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = (n.title || '').toLowerCase().includes(q)
        const msgMatch = (n.message || '').toLowerCase().includes(q)
        const typeMatch = (n.type || '').toLowerCase().includes(q)
        const compMatch = (n.company_name || '').toLowerCase().includes(q)
        if (!titleMatch && !msgMatch && !typeMatch && !compMatch) return false
      }

      return true
    })
  }, [notifications, showUnreadOnly, filterSeverity, filterType, searchQuery])

  // KPIs
  const totalCount = notifications.length
  const unreadCount = notifications.filter((n) => !n.is_read).length
  const criticalCount = notifications.filter((n) => n.severity === 'critical').length
  const warningCount = notifications.filter((n) => n.severity === 'warning').length
  const broadcastCount = notifications.filter((n) => n.type === 'broadcast').length

  const getRelativeTime = (dateStr: string) => {
    try {
      const now = Date.now()
      const past = new Date(dateStr).getTime()
      const diffSec = Math.floor((now - past) / 1000)
      if (diffSec < 60) return `${diffSec}s ago`
      const diffMin = Math.floor(diffSec / 60)
      if (diffMin < 60) return `${diffMin}m ago`
      const diffHrs = Math.floor(diffMin / 60)
      if (diffHrs < 24) return `${diffHrs}h ago`
      const diffDays = Math.floor(diffHrs / 24)
      return `${diffDays}d ago`
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            Alerts, Incidents &amp; Communications
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Bell className="h-7 w-7 text-indigo-400" />
            Platform Notifications Center
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                {unreadCount} Unread
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time security telemetry, tenant quota thresholds, health degradation alerts, and administrative broadcasts.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => setBroadcastModalOpen(true)}
            className="h-9 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 border border-indigo-500/40"
          >
            <Megaphone className="h-3.5 w-3.5 mr-1.5" />
            Broadcast Notice
          </Button>

          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={actionInProgress !== null}
              onClick={handleMarkAllRead}
              className="h-9 text-xs border-indigo-500/30 bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60 hover:text-white"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Mark All Read ({unreadCount})
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            disabled={actionInProgress !== null || notifications.every((n) => !n.is_read)}
            onClick={handleClearAllRead}
            className="h-9 text-xs border-slate-800 bg-slate-900/80 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 hover:border-rose-900/50"
            title="Clear all read notifications"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear Read
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="h-9 text-xs border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white"
            title="Export notifications as CSV"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={loadNotifications}
            className="h-9 text-xs border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white"
            title="Refresh Feed"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2.5 animate-in fade-in-0 border ${
            toastMessage.type === 'error'
              ? 'bg-rose-950/80 text-rose-300 border-rose-800'
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Executive Metric Cards (4 KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-slate-800/80 bg-slate-900/60 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Alerts</span>
            <div className="h-8 w-8 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-300 border border-slate-700/60">
              <Bell className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">{totalCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Aggregated operational events</div>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/60 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Unread Alerts</span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-300 mt-2">{unreadCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Require operator acknowledgment</div>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/60 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Warnings &amp; Quotas</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-300 mt-2">{warningCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Storage, job retry &amp; billing notices</div>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/60 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Broadcasts</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Megaphone className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-300 mt-2">{broadcastCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">System announcements &amp; advisories</div>
        </Card>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { key: 'all', label: 'All Alerts' },
              { key: 'security', label: 'Security' },
              { key: 'tenant_lifecycle', label: 'Tenant Lifecycle' },
              { key: 'usage_warning', label: 'Quota Warnings' },
              { key: 'system', label: 'System Health' },
              { key: 'billing', label: 'Billing' },
              { key: 'broadcast', label: 'Broadcasts' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterType(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  filterType === tab.key
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Severity & Unread Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warning Only</option>
              <option value="info">Info Only</option>
            </select>

            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span>Unread only</span>
            </label>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search notifications by title, details, tenant company, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-950/80 border-slate-800 focus:border-indigo-500 text-slate-200"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Notification Stream Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
            Loading live platform notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/40 p-12 text-center rounded-2xl">
            <Bell className="h-10 w-10 mx-auto mb-3 text-slate-600 opacity-60" />
            <p className="font-bold text-slate-200 text-sm">No notifications found</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery || filterType !== 'all' || filterSeverity !== 'all' || showUnreadOnly
                ? 'Try adjusting your filters or search query.'
                : 'All platform systems and tenant environments are operating normally.'}
            </p>
          </Card>
        ) : (
          filteredNotifications.map((item) => {
            const isCritical = item.severity === 'critical'
            const isWarning = item.severity === 'warning'
            const isBroadcast = item.type === 'broadcast'
            const isSecurity = item.type === 'security'
            const isHealth = ['system', 'health', 'job'].includes(item.type)

            const targetUrl =
              item.action_url ||
              (item.company_id
                ? `/platform/tenants/${item.company_id}`
                : isSecurity
                ? '/platform/security'
                : isHealth
                ? '/platform/health'
                : undefined)

            return (
              <Card
                key={item.id}
                className={`border p-4 sm:p-5 rounded-2xl transition-all ${
                  !item.is_read
                    ? 'bg-slate-900/95 border-indigo-500/40 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-950/20'
                    : 'bg-slate-950/40 border-slate-800/80 opacity-85 hover:opacity-100 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Severity / Category Icon */}
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        isCritical
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : isWarning
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : isBroadcast
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                          : isHealth
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isCritical ? (
                        <ShieldAlert className="h-5 w-5" />
                      ) : isWarning ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : isBroadcast ? (
                        <Megaphone className="h-5 w-5" />
                      ) : isHealth ? (
                        <HeartPulse className="h-5 w-5" />
                      ) : (
                        <Info className="h-5 w-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                          {!item.is_read && (
                            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                          )}
                          <span>{item.title}</span>
                        </h4>

                        {/* Severity Pill */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            isCritical
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                              : isWarning
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {item.severity}
                        </span>

                        {/* Category Tag */}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700">
                          {item.type}
                        </span>

                        {/* Target Audience Tag */}
                        {item.target_audience && (
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 flex items-center gap-1">
                            <Users className="h-2.5 w-2.5" />
                            {item.target_audience === 'all_tenants'
                              ? 'All Tenants'
                              : item.target_audience === 'all_admins'
                              ? 'Admin Team'
                              : 'Single Tenant'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                        {item.message}
                      </p>

                      {/* Meta Footer */}
                      <div className="flex items-center gap-3 sm:gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <span>{getRelativeTime(item.created_at)}</span>
                          <span className="text-slate-600">({new Date(item.created_at).toLocaleString()})</span>
                        </span>

                        {item.company_name && (
                          <Link
                            href={`/platform/tenants/${item.company_id || ''}`}
                            className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                          >
                            <Building2 className="h-3 w-3" />
                            {item.company_name}
                          </Link>
                        )}

                        {targetUrl && (
                          <Link
                            href={targetUrl}
                            className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 group"
                          >
                            <span>Investigate Event</span>
                            <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions on Item */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                    {!item.is_read ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionInProgress === item.id}
                        onClick={() => handleMarkRead(item.id)}
                        className="h-8 px-2.5 text-xs border-indigo-500/30 bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/80 hover:text-white"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Mark Read
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic px-2">Acknowledged</span>
                    )}

                    <button
                      type="button"
                      disabled={actionInProgress === `del-${item.id}`}
                      onClick={() => handleDeleteNotification(item.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
                      title="Dismiss notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Broadcast Modal */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Broadcast Announcement</h3>
                  <p className="text-xs text-slate-400">Send an administrative notice across tenant dashboards.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBroadcastModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notice Title <span className="text-rose-400">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g., Scheduled Maintenance / System Upgrade Notice"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Severity</label>
                  <select
                    value={broadcastForm.severity}
                    onChange={(e) =>
                      setBroadcastForm({
                        ...broadcastForm,
                        severity: e.target.value as 'info' | 'warning' | 'critical',
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="info">Info (Blue/General)</option>
                    <option value="warning">Warning (Amber/Advisory)</option>
                    <option value="critical">Critical (Red/Emergency)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Audience</label>
                  <select
                    value={broadcastForm.target_audience}
                    onChange={(e) =>
                      setBroadcastForm({
                        ...broadcastForm,
                        target_audience: e.target.value as 'all_tenants' | 'all_admins' | 'specific_tenant',
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all_tenants">All Tenant Environments</option>
                    <option value="all_admins">Platform Administrators Only</option>
                    <option value="specific_tenant">Specific Tenant ID</option>
                  </select>
                </div>
              </div>

              {broadcastForm.target_audience === 'specific_tenant' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tenant Company ID</label>
                  <Input
                    placeholder="Enter UUID of target company"
                    value={broadcastForm.company_id}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, company_id: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Content <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter detailed notice message, instructions, or maintenance window..."
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Action Link URL <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <Input
                  placeholder="e.g., /platform/health or https://status.inkflow.io"
                  value={broadcastForm.action_url}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, action_url: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={broadcasting}
                  className="h-9 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30"
                >
                  {broadcasting ? (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {broadcasting ? 'Broadcasting...' : 'Broadcast Notice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
