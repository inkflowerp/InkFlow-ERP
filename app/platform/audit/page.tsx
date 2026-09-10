'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  FileClock,
  Search,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Eye,
  X,
  Calendar,
  Building2,
  Terminal,
  User,
  Globe,
  ArrowDownToLine,
  Filter,
  Check,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Laptop,
  AlertCircle,
  FileSpreadsheet,
  FileCode,
  Layers,
  Sparkles,
  Lock,
  Flame,
  ArrowRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getPlatformAuditLogsAction,
  getPlatformAuditMetricsAction,
  getPlatformCompaniesAction,
} from '@/actions/platform-data.actions'
import {
  PlatformAuditLogItem,
  PlatformAuditMetrics,
  PlatformAuditFilters,
  PlatformTenantCompany,
} from '@/types/platform.types'

export default function PlatformAuditPage() {
  const [logs, setLogs] = useState<PlatformAuditLogItem[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [metrics, setMetrics] = useState<PlatformAuditMetrics | null>(null)
  const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filter States
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [actionCategory, setActionCategory] = useState<string>('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
  const [targetCompanyFilter, setTargetCompanyFilter] = useState<string>('all')
  const [timeRangePreset, setTimeRangePreset] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  // Pagination States
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(50)

  // Inspection Modal State
  const [selectedLog, setSelectedLog] = useState<PlatformAuditLogItem | null>(null)
  const [copiedId, setCopiedId] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)

  // Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to page 1 on search change
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  // Load Companies List (for target company selector)
  useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await getPlatformCompaniesAction({ pageSize: 200 })
        if (res.success && res.data) {
          setCompanies(res.data.companies || [])
        }
      } catch (err) {
        console.error('Failed to load companies for filter:', err)
      }
    }
    loadCompanies()
  }, [])

  // Load Metrics
  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true)
    try {
      const res = await getPlatformAuditMetricsAction()
      if (res.success && res.data) {
        setMetrics(res.data)
      }
    } catch (err) {
      console.error('Failed to load audit metrics:', err)
    } finally {
      setMetricsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  // Calculate Start/End Date from Presets
  const computedDateRange = useMemo(() => {
    if (timeRangePreset === 'all') return { startDate: undefined, endDate: undefined }
    if (timeRangePreset === 'today') {
      const start = new Date()
      start.setUTCHours(0, 0, 0, 0)
      return { startDate: start.toISOString(), endDate: undefined }
    }
    if (timeRangePreset === '7d') {
      const start = new Date()
      start.setDate(start.getDate() - 7)
      return { startDate: start.toISOString(), endDate: undefined }
    }
    if (timeRangePreset === '30d') {
      const start = new Date()
      start.setDate(start.getDate() - 30)
      return { startDate: start.toISOString(), endDate: undefined }
    }
    if (timeRangePreset === 'custom') {
      const start = customStartDate ? new Date(customStartDate).toISOString() : undefined
      const end = customEndDate ? new Date(customEndDate + 'T23:59:59.999Z').toISOString() : undefined
      return { startDate: start, endDate: end }
    }
    return { startDate: undefined, endDate: undefined }
  }, [timeRangePreset, customStartDate, customEndDate])

  // Load Audit Logs from Server
  const loadLogs = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const filters: PlatformAuditFilters = {
        action: actionCategory !== 'all' ? actionCategory : undefined,
        entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
        targetCompanyId: targetCompanyFilter !== 'all' ? targetCompanyFilter : undefined,
        startDate: computedDateRange.startDate,
        endDate: computedDateRange.endDate,
        search: debouncedSearch.trim() || undefined,
        page,
        pageSize,
      }

      const res = await getPlatformAuditLogsAction(filters)
      if (res.success && res.data) {
        setLogs(res.data.logs)
        setTotalCount(res.data.total)
      } else {
        setErrorMsg(res.error || 'Failed to fetch platform audit log records')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while loading audit records')
    } finally {
      setLoading(false)
    }
  }, [
    actionCategory,
    entityTypeFilter,
    targetCompanyFilter,
    computedDateRange,
    debouncedSearch,
    page,
    pageSize,
  ])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setActionCategory('all')
    setEntityTypeFilter('all')
    setTargetCompanyFilter('all')
    setTimeRangePreset('all')
    setCustomStartDate('')
    setCustomEndDate('')
    setPage(1)
  }

  const isFiltered =
    debouncedSearch !== '' ||
    actionCategory !== 'all' ||
    entityTypeFilter !== 'all' ||
    targetCompanyFilter !== 'all' ||
    timeRangePreset !== 'all'

  // Total Pages for Pagination
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // Helpers for Initials & Dates
  const getInitials = (name?: string | null, email?: string | null) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/).filter(Boolean)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return parts[0].slice(0, 2).toUpperCase()
    }
    if (email && email.trim()) {
      return email.trim().slice(0, 2).toUpperCase()
    }
    return 'SA'
  }

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return isoString
    }
  }

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    } catch {
      return ''
    }
  }

  // Relative Time Formatter
  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffDay > 30) return formatDate(isoString)
    if (diffDay > 0) return `${diffDay}d ago`
    if (diffHour > 0) return `${diffHour}h ago`
    if (diffMin > 0) return `${diffMin}m ago`
    return 'Just now'
  }

  // Export as JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `platform_audit_trail_export_${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  // Export as CSV
  const handleExportCSV = () => {
    const headers = [
      'Event ID',
      'Timestamp (UTC)',
      'Actor Name',
      'Actor Email',
      'Actor Role',
      'Action',
      'Entity Type',
      'Entity ID',
      'Target Company',
      'IP Address',
      'User Agent',
      'Reason',
      'Details JSON',
    ]

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '""'
      const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
      return `"${str.replace(/"/g, '""')}"`
    }

    const rows = logs.map((l) => [
      escapeCSV(l.id),
      escapeCSV(l.created_at),
      escapeCSV(l.actor_name || ''),
      escapeCSV(l.actor_email),
      escapeCSV(l.actor_role || ''),
      escapeCSV(l.action),
      escapeCSV(l.entity_type),
      escapeCSV(l.entity_id || ''),
      escapeCSV(l.target_company_name || 'Platform Core'),
      escapeCSV(l.ip_address || '127.0.0.1'),
      escapeCSV(l.user_agent || 'System Daemon'),
      escapeCSV(l.reason || ''),
      escapeCSV(l.details || {}),
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', encodedUri)
    downloadAnchor.setAttribute('download', `platform_audit_trail_export_${Date.now()}.csv`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  // Copy ID helper
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  // Copy JSON helper
  const handleCopyJson = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2))
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 2000)
  }

  // Action badge color styling helper
  const getActionBadgeStyle = (action: string) => {
    const lower = action.toLowerCase()
    if (
      lower.includes('suspend') ||
      lower.includes('delete') ||
      lower.includes('archive') ||
      lower.includes('revoke') ||
      lower.includes('logout') ||
      lower.includes('terminate')
    ) {
      return {
        bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        dot: 'bg-rose-400',
      }
    }
    if (
      lower.includes('activate') ||
      lower.includes('reactivate') ||
      lower.includes('create') ||
      lower.includes('login') ||
      lower.includes('enable')
    ) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400',
      }
    }
    if (lower.includes('plan') || lower.includes('billing') || lower.includes('subscription')) {
      return {
        bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        dot: 'bg-purple-400',
      }
    }
    if (lower.includes('flag') || lower.includes('feature')) {
      return {
        bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        dot: 'bg-cyan-400',
      }
    }
    if (lower.includes('support') || lower.includes('impersonate') || lower.includes('assist')) {
      return {
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dot: 'bg-amber-400',
      }
    }
    if (lower.includes('rbac') || lower.includes('permission') || lower.includes('role')) {
      return {
        bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
        dot: 'bg-indigo-400',
      }
    }
    return {
      bg: 'bg-slate-800 text-slate-300 border-slate-700',
      dot: 'bg-slate-400',
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-inner">
              <FileClock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                <span>Platform Audit Logs</span>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                  Zero-Trust Immutable
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Cryptographically traceable compliance records capturing all superadmin operations, tenant lifecycle transitions, plan modifications, and security interventions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
            Export CSV
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportJSON}
            disabled={logs.length === 0}
            className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <FileCode className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
            Export JSON
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              loadLogs()
              loadMetrics()
            }}
            disabled={loading}
            className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Trail */}
        <Card className="bg-slate-900/90 border-slate-800/80 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Total Audit Events
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {metricsLoading ? (
                  <span className="text-slate-600 animate-pulse">...</span>
                ) : (
                  (metrics?.total_logs ?? totalCount).toLocaleString()
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-semibold text-emerald-400">+{metrics?.logs_today ?? 0}</span> today
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Security & Auth */}
        <Card className="bg-slate-900/90 border-slate-800/80 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Auth & Security
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {metricsLoading ? (
                  <span className="text-slate-600 animate-pulse">...</span>
                ) : (
                  (metrics?.security_events_count ?? 0).toLocaleString()
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Lock className="h-3 w-3 text-emerald-400" />
                <span>Logins, MFA, Passwords</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Tenant Governance */}
        <Card className="bg-slate-900/90 border-slate-800/80 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-purple-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Tenant & Plan Actions
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {metricsLoading ? (
                  <span className="text-slate-600 animate-pulse">...</span>
                ) : (
                  (metrics?.tenant_events_count ?? 0).toLocaleString()
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Building2 className="h-3 w-3 text-purple-400" />
                <span>Lifecycle & Tier Changes</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Superadmins */}
        <Card className="bg-slate-900/90 border-slate-800/80 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Privileged Actors
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {metricsLoading ? (
                  <span className="text-slate-600 animate-pulse">...</span>
                ) : (
                  (metrics?.unique_actors_count ?? 1).toLocaleString()
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <User className="h-3 w-3 text-cyan-400" />
                <span>Root Administrators</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filter & Search Panel */}
      <Card className="bg-slate-900/80 border-slate-800 rounded-2xl shadow-xl">
        <CardContent className="p-4 space-y-3.5">
          {/* Top Row: Search & Preset Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search action, actor name/email, entity ID, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Action Domain Filter */}
            <div className="md:col-span-2">
              <select
                value={actionCategory}
                onChange={(e) => {
                  setActionCategory(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-indigo-500"
              >
                <option value="all">All Action Domains</option>
                <option value="login">🔐 Logins & Access</option>
                <option value="logout">🚪 Logout Events</option>
                <option value="company">🏢 Tenant Lifecycle</option>
                <option value="plan">💎 Subscription Plans</option>
                <option value="feature_flag">🚩 Feature Flags</option>
                <option value="rbac_template">🛡️ RBAC & Permissions</option>
                <option value="support">🎧 Support Impersonation</option>
                <option value="profile">👤 Owner Profile Changes</option>
                <option value="system">⚙️ System Operations</option>
              </select>
            </div>

            {/* Entity Type Filter */}
            <div className="md:col-span-2">
              <select
                value={entityTypeFilter}
                onChange={(e) => {
                  setEntityTypeFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-indigo-500"
              >
                <option value="all">All Entity Types</option>
                <option value="company">Company / Tenant</option>
                <option value="subscription_plan">Subscription Plan</option>
                <option value="platform_auth">Platform Auth</option>
                <option value="platform_user">Platform User</option>
                <option value="platform_feature_flag">Feature Flag</option>
                <option value="platform_role_template">Role Template</option>
                <option value="platform_support_session">Support Session</option>
                <option value="platform_incident">Incident</option>
                <option value="system_job">System Job</option>
              </select>
            </div>

            {/* Target Company Selector */}
            <div className="md:col-span-2">
              <select
                value={targetCompanyFilter}
                onChange={(e) => {
                  setTargetCompanyFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-indigo-500"
              >
                <option value="all">All Target Tenants</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range Preset */}
            <div className="md:col-span-2">
              <select
                value={timeRangePreset}
                onChange={(e) => {
                  setTimeRangePreset(e.target.value as any)
                  setPage(1)
                }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-indigo-500"
              >
                <option value="all">All Time Range</option>
                <option value="today">Today (24 Hours)</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="custom">Custom Date Range...</option>
              </select>
            </div>
          </div>

          {/* Custom Date Range Row (only shown if custom is selected) */}
          {timeRangePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/60 animate-in fade-in-0">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>From:</span>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value)
                    setPage(1)
                  }}
                  className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200 rounded-lg w-36"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>To:</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value)
                    setPage(1)
                  }}
                  className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200 rounded-lg w-36"
                />
              </div>

              {(customStartDate || customEndDate) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCustomStartDate('')
                    setCustomEndDate('')
                  }}
                  className="h-8 text-xs text-slate-400 hover:text-white"
                >
                  Clear Range
                </Button>
              )}
            </div>
          )}

          {/* Active Filter Indicators & Reset Action */}
          {isFiltered && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 text-slate-400">
                <span className="font-semibold text-slate-300">Active Filters:</span>
                {debouncedSearch && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1">
                    Search: &quot;{debouncedSearch}&quot;
                    <button onClick={() => setSearch('')} className="hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {actionCategory !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1">
                    Domain: {actionCategory}
                    <button onClick={() => setActionCategory('all')} className="hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {entityTypeFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                    Entity: {entityTypeFilter}
                    <button onClick={() => setEntityTypeFilter('all')} className="hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {targetCompanyFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                    Tenant: {companies.find((c) => c.id === targetCompanyFilter)?.name || targetCompanyFilter}
                    <button onClick={() => setTargetCompanyFilter('all')} className="hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {timeRangePreset !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                    Time: {timeRangePreset}
                    <button onClick={() => setTimeRangePreset('all')} className="hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleResetFilters}
                className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Error Banner (if any) */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start justify-between gap-3 text-rose-300 text-xs animate-in fade-in-0">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-rose-200">Failed to Load Compliance Records</div>
              <p className="mt-0.5 text-rose-300/90">{errorMsg}</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={loadLogs}
            className="h-8 text-xs bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800"
          >
            Retry Query
          </Button>
        </div>
      )}

      {/* 5. Audit Logs Table & Stream */}
      <Card className="bg-slate-900 border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <span>Compliance Log Stream</span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {totalCount.toLocaleString()} {totalCount === 1 ? 'Record' : 'Records'} Total
                </span>
                {isFiltered && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                    Filtered
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Timestamped PostgreSQL audit records with cryptographic actor isolation, IP tracking, and change deltas.
              </CardDescription>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-hidden"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 min-w-[210px]">Timestamp & Origin</th>
                <th className="py-3.5 px-4 min-w-[230px]">Superadmin Actor</th>
                <th className="py-3.5 px-4 min-w-[170px]">Privileged Action</th>
                <th className="py-3.5 px-4 min-w-[190px]">Target Scope / Entity</th>
                <th className="py-3.5 px-4 min-w-[200px]">Audit Justification</th>
                <th className="py-3.5 px-4 text-right min-w-[100px]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span className="text-sm font-medium text-slate-400">
                      Querying PostgreSQL immutable audit ledger...
                    </span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                        <FileClock className="h-6 w-6" />
                      </div>
                      <div className="text-base font-bold text-white">No Compliance Records Found</div>
                      <p className="text-xs text-slate-400">
                        No platform audit events match the selected search terms, entity types, or date boundaries.
                      </p>
                      {isFiltered && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleResetFilters}
                          className="text-xs border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const style = getActionBadgeStyle(log.action)
                  return (
                    <tr key={log.id} className="hover:bg-slate-850/60 transition-colors group">
                      {/* 1. Timestamp & Origin */}
                      <td className="py-3.5 px-4 align-top min-w-[210px]">
                        <div className="font-semibold text-white flex items-center gap-1.5 whitespace-nowrap">
                          <span>{formatDate(log.created_at)}</span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {formatTime(log.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-nowrap">
                          <span className="text-[10px] font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1 whitespace-nowrap shrink-0 shadow-xs">
                            <Clock className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                            <span>{formatRelativeTime(log.created_at)}</span>
                          </span>
                          <span
                            className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1 whitespace-nowrap shrink-0 shadow-xs"
                            title={`Origin IP: ${log.ip_address || '127.0.0.1'}`}
                          >
                            <Globe className="h-2.5 w-2.5 text-indigo-400 shrink-0" />
                            <span>{log.ip_address || '127.0.0.1'}</span>
                          </span>
                        </div>
                      </td>

                      {/* 2. Superadmin Actor */}
                      <td className="py-3.5 px-4 align-top min-w-[230px]">
                        <div className="flex items-start gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-md border border-indigo-500/30">
                            {getInitials(log.actor_name, log.actor_email)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className="font-bold text-white text-xs leading-snug truncate max-w-[170px]"
                              title={log.actor_name || 'Platform Administrator'}
                            >
                              {log.actor_name || 'Platform Administrator'}
                            </div>
                            <div
                              className="text-[11px] font-mono text-slate-400 truncate max-w-[170px] mt-0.5 leading-tight"
                              title={log.actor_email}
                            >
                              {log.actor_email}
                            </div>
                            <div className="mt-1 flex items-center gap-1">
                              {log.actor_role === 'platform_owner' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-bold tracking-wide uppercase font-mono">
                                  <ShieldCheck className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                                  Platform Owner
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[9px] font-bold tracking-wide uppercase font-mono">
                                  <ShieldCheck className="h-2.5 w-2.5 text-indigo-400 shrink-0" />
                                  Superadmin
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Action Badge */}
                      <td className="py-3.5 px-4 align-top min-w-[170px]">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${style.bg}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            {log.action}
                          </span>
                        </div>
                      </td>

                      {/* 4. Target Organization / Scope */}
                      <td className="py-3.5 px-4 align-top min-w-[190px]">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {log.target_company_id ? (
                            <Link
                              href={`/platform/companies/${log.target_company_id}`}
                              className="text-slate-200 hover:text-indigo-400 transition-colors flex items-center gap-1"
                            >
                              <Building2 className="h-3 w-3 text-indigo-400 shrink-0" />
                              <span className="truncate max-w-[150px]">
                                {log.target_company_name || log.target_company_id.slice(0, 8)}
                              </span>
                            </Link>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Terminal className="h-3 w-3 text-slate-500 shrink-0" />
                              Platform Core System
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[170px]">
                          {log.entity_type} {log.entity_id ? `• ${log.entity_id.slice(0, 8)}...` : ''}
                        </div>
                      </td>

                      {/* 5. Audit Justification */}
                      <td className="py-3.5 px-4 align-top min-w-[200px] max-w-[240px]">
                        {log.reason ? (
                          <div
                            className="text-slate-300 text-xs italic line-clamp-2 bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800"
                            title={log.reason}
                          >
                            &quot;{log.reason}&quot;
                          </div>
                        ) : log.details?.reason ? (
                          <div
                            className="text-slate-300 text-xs italic line-clamp-2 bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800"
                            title={log.details.reason}
                          >
                            &quot;{log.details.reason}&quot;
                          </div>
                        ) : (
                          <span className="text-slate-600 font-mono text-[11px]">System Stamped</span>
                        )}
                      </td>

                      {/* 6. Inspect Button */}
                      <td className="py-3.5 px-4 text-right align-top min-w-[100px]">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedLog(log)}
                          className="h-8 px-2.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 hover:bg-indigo-900/50 border border-indigo-800/40 rounded-lg group-hover:border-indigo-600/60 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          <span>Inspect</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>

        {/* Table Footer with Pagination Controls */}
        {!loading && logs.length > 0 && (
          <div className="border-t border-slate-800 px-4 py-3 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <span className="font-bold text-white">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-white">{Math.min(page * pageSize, totalCount)}</span> of{' '}
              <span className="font-bold text-white">{totalCount.toLocaleString()}</span> entries
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="h-8 w-8 p-0 border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40"
                title="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 w-8 p-0 border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40"
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-slate-200">
                Page {page} of {totalPages}
              </span>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 w-8 p-0 border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40"
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="h-8 w-8 p-0 border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40"
                title="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 7. DETAIL MODAL: AUDIT EVENT INSPECTOR */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <FileClock className="h-5 w-5" />
              </div>
              <div className="flex-1 pr-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Audit Event Inspection</h3>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      getActionBadgeStyle(selectedLog.action).bg
                    }`}
                  >
                    {selectedLog.action}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-slate-400 truncate max-w-[280px]">
                    UUID: {selectedLog.id}
                  </span>
                  <button
                    onClick={() => handleCopyId(selectedLog.id)}
                    className="text-slate-500 hover:text-slate-300 flex items-center gap-0.5 text-[10px]"
                    title="Copy Event ID"
                  >
                    {copiedId ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 font-medium">Superadmin Actor:</span>
                  <div className="font-bold text-white mt-0.5 truncate" title={selectedLog.actor_name || selectedLog.actor_email}>
                    {selectedLog.actor_name || 'Platform Administrator'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                    {selectedLog.actor_email}
                  </div>
                  <div className="mt-1">
                    {selectedLog.actor_role === 'platform_owner' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-bold tracking-wide uppercase font-mono">
                        Platform Owner
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[9px] font-bold tracking-wide uppercase font-mono">
                        Superadmin
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Target Scope:</span>
                  <div className="font-bold text-white mt-0.5">
                    {selectedLog.target_company_name || 'Platform Core System'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Entity Type / ID:</span>
                  <div className="font-mono text-cyan-400 mt-0.5 truncate">
                    {selectedLog.entity_type} {selectedLog.entity_id ? `(${selectedLog.entity_id})` : ''}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Network IP:</span>
                  <div className="font-mono text-slate-300 mt-0.5 flex items-center gap-1">
                    <Globe className="h-3 w-3 text-slate-500" />
                    {selectedLog.ip_address || '127.0.0.1'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Timestamp (UTC):</span>
                  <div className="font-mono text-slate-300 mt-0.5 text-[11px]">
                    {new Date(selectedLog.created_at).toLocaleString()}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">User Agent / Client:</span>
                  <div className="font-mono text-slate-400 mt-0.5 text-[10px] truncate" title={selectedLog.user_agent || 'System'}>
                    {selectedLog.user_agent || 'System Daemon'}
                  </div>
                </div>
              </div>

              {/* Justification Box (if reason is present) */}
              {(selectedLog.reason || selectedLog.details?.reason) && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Audit Justification Reason</span>
                  </div>
                  <p className="text-xs text-amber-200 font-medium">
                    &quot;{selectedLog.reason || selectedLog.details?.reason}&quot;
                  </p>
                </div>
              )}

              {/* State Comparison Delta (if previous_state or new_state exist) */}
              {(selectedLog.previous_state || selectedLog.new_state) && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-orange-400" />
                    <span>State Mutation Delta (Before vs After)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Previous State */}
                    <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3 space-y-1">
                      <div className="text-[11px] font-bold text-rose-400">Previous State:</div>
                      <pre className="text-[11px] font-mono text-rose-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.previous_state || {}, null, 2)}
                      </pre>
                    </div>

                    {/* New State */}
                    <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3 space-y-1">
                      <div className="text-[11px] font-bold text-emerald-400">New State:</div>
                      <pre className="text-[11px] font-mono text-emerald-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.new_state || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Full JSON Payload */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold">Complete Event JSON Payload:</span>
                  <button
                    onClick={() => handleCopyJson(selectedLog)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 max-h-52 overflow-y-auto shadow-inner">
                  <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {selectedLog.target_company_id ? (
                <Link
                  href={`/platform/companies/${selectedLog.target_company_id}`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  <span>Go to Tenant Console</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="text-[11px] text-slate-500 font-mono">Immutable cryptographic seal</span>
              )}

              <Button
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="bg-slate-800 hover:bg-slate-700 text-xs text-white"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
