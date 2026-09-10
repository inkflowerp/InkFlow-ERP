'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ShieldAlert,
  Clock,
  Building2,
  Lock,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  UserCheck,
  Search,
  ExternalLink,
  Key,
  X,
  History,
  Shield,
  Trash2,
  Eye,
  Wrench,
  Sliders,
  Download,
  Sparkles,
  Plus,
  ChevronRight,
  Copy,
  Timer,
  Activity,
  ArrowRight,
  Filter,
  SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getPlatformCompaniesAction,
  getPlatformSupportSessionsAction,
  getPlatformSupportOverviewStatsAction,
} from '@/actions/platform-data.actions'
import {
  startTenantSupportSessionAction,
  extendSupportSessionAction,
  revokeSupportSessionAction,
} from '@/actions/platform.actions'
import {
  PlatformTenantCompany,
  SupportAccessLevel,
  PlatformSupportSessionRecord,
  PlatformSupportOverviewStats,
} from '@/types/platform.types'

export default function PlatformSupportPage() {
  const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
  const [supportSessions, setSupportSessions] = useState<PlatformSupportSessionRecord[]>([])
  const [stats, setStats] = useState<PlatformSupportOverviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [initiating, setInitiating] = useState(false)
  const [extendingId, setExtendingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [, setCopiedId] = useState<string | null>(null)

  // Filters & Search
  const [tenantSearch, setTenantSearch] = useState('')
  const [tenantPlanFilter, setTenantPlanFilter] = useState<'ALL' | 'ENTERPRISE' | 'PRO' | 'STARTER' | 'TRIAL'>('ALL')
  const [historySearch, setHistorySearch] = useState('')
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'>('ALL')
  const [historyLevelFilter, setHistoryLevelFilter] = useState<'ALL' | 'read_only' | 'config_only' | 'full_support'>('ALL')

  // Initiate Modal State
  const [showInitiateModal, setShowInitiateModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<PlatformTenantCompany | null>(null)
  const [supportReason, setSupportReason] = useState('')
  const [accessLevel, setAccessLevel] = useState<SupportAccessLevel>('read_only')
  const [durationMinutes, setDurationMinutes] = useState<number>(120)
  const [actionError, setActionError] = useState<string | null>(null)

  // Extend Modal State
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [extendingSession, setExtendingSession] = useState<PlatformSupportSessionRecord | null>(null)
  const [extendMinutes, setExtendMinutes] = useState<number>(60)

  // Feedback Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const router = useRouter()

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4500)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [compRes, sessionsRes, statsRes] = await Promise.all([
        getPlatformCompaniesAction({ pageSize: 200 }),
        getPlatformSupportSessionsAction(),
        getPlatformSupportOverviewStatsAction(),
      ])

      if (compRes.success && compRes.data) {
        const compList = Array.isArray(compRes.data) ? compRes.data : compRes.data?.companies || []
        setCompanies(compList)
      }

      if (sessionsRes.success && sessionsRes.data) {
        setSupportSessions(sessionsRes.data)
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      }
    } catch {
      showToast('Failed to load support records', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle Initiating Support Session
  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) {
      setActionError('Please select a target tenant organization.')
      return
    }
    if (!supportReason.trim() || supportReason.trim().length < 5) {
      setActionError('Please provide a descriptive reason or ticket reference (min 5 characters).')
      return
    }

    setInitiating(true)
    setActionError(null)

    try {
      const res = await startTenantSupportSessionAction(
        selectedCompany.id,
        selectedCompany.slug,
        selectedCompany.name,
        supportReason.trim(),
        accessLevel,
        durationMinutes
      )

      if (res.success && 'redirectUrl' in res && res.redirectUrl) {
        setShowInitiateModal(false)
        showToast(`Support session initialized for ${selectedCompany.name}`)
        router.push(res.redirectUrl)
      } else if (!res.success && 'error' in res) {
        setActionError(res.error || 'Failed to start support session.')
      }
    } catch (err: any) {
      setActionError(err?.message || 'An unexpected error occurred.')
    } finally {
      setInitiating(false)
    }
  }

  // Handle Extending Active Session
  const handleExtendSession = async () => {
    if (!extendingSession) return
    setExtendingId(extendingSession.id)
    try {
      const res = await extendSupportSessionAction(extendingSession.id, extendMinutes)
      if (res.success) {
        showToast(`Support session extended by ${extendMinutes} minutes`)
        setShowExtendModal(false)
        setExtendingSession(null)
        await loadData()
      } else {
        showToast(res.error || 'Failed to extend support session', 'error')
      }
    } catch (err: any) {
      showToast(err?.message || 'Error extending session', 'error')
    } finally {
      setExtendingId(null)
    }
  }

  // Handle Revoking / Terminating Support Session
  const handleRevokeSession = async (sessionId: string, companyName?: string) => {
    if (!confirm(`Are you sure you want to terminate the active support session for ${companyName || 'this tenant'}?`)) {
      return
    }
    setRevokingId(sessionId)
    try {
      const res = await revokeSupportSessionAction(sessionId, 'Terminated from Platform Support Dashboard')
      if (res.success) {
        showToast('Support session revoked immediately. Zero-trust isolation enforced.')
        await loadData()
      } else {
        showToast(res.error || 'Failed to revoke support session', 'error')
      }
    } catch {
      showToast('An unexpected error occurred while revoking session', 'error')
    } finally {
      setRevokingId(null)
    }
  }

  const handleCopyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/${slug}/dashboard`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    showToast('Tenant dashboard URL copied to clipboard')
    setTimeout(() => setCopiedId(null), 2500)
  }

  // Export CSV of support sessions
  const handleExportCsv = () => {
    if (supportSessions.length === 0) {
      showToast('No session records to export', 'error')
      return
    }

    const headers = [
      'Session ID',
      'Tenant Organization',
      'Tenant Slug',
      'Authorized By Admin',
      'Admin Email',
      'Access Level',
      'Reason / Justification',
      'Status',
      'Started At',
      'Expires At',
      'Revoked At',
      'Created At',
    ]

    const rows = supportSessions.map((s) => [
      s.id,
      `"${(s.company_name || '').replace(/"/g, '""')}"`,
      s.company_slug || '',
      `"${(s.admin_name || '').replace(/"/g, '""')}"`,
      s.admin_email || '',
      s.access_level,
      `"${(s.reason || '').replace(/"/g, '""')}"`,
      s.status,
      s.started_at,
      s.expires_at,
      s.revoked_at || '',
      s.created_at,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `platform_support_sessions_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Support sessions ledger exported successfully')
  }

  // Filtered Lists
  const now = Date.now()
  const activeSessions = useMemo(() => {
    return supportSessions.filter((s) => s.status === 'active' && new Date(s.expires_at).getTime() > now)
  }, [supportSessions, now])

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        c.slug.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        (c.plan || '').toLowerCase().includes(tenantSearch.toLowerCase())

      if (!matchSearch) return false

      if (tenantPlanFilter === 'ENTERPRISE') return c.plan === 'enterprise'
      if (tenantPlanFilter === 'PRO') return c.plan === 'growth' || c.plan === 'business'
      if (tenantPlanFilter === 'STARTER') return c.plan === 'starter'
      if (tenantPlanFilter === 'TRIAL') return c.plan === 'trial' || c.plan === 'custom'
      return true
    })
  }, [companies, tenantSearch, tenantPlanFilter])

  const filteredHistory = useMemo(() => {
    return supportSessions.filter((s) => {
      const isExp = s.status === 'expired' || (s.status === 'active' && new Date(s.expires_at).getTime() <= now)
      const effectiveStatus = s.status === 'revoked' ? 'REVOKED' : isExp ? 'EXPIRED' : 'ACTIVE'

      if (historyStatusFilter !== 'ALL' && effectiveStatus !== historyStatusFilter) return false
      if (historyLevelFilter !== 'ALL' && s.access_level !== historyLevelFilter) return false

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase()
        const matchName = (s.company_name || '').toLowerCase().includes(q)
        const matchSlug = (s.company_slug || '').toLowerCase().includes(q)
        const matchAdmin = (s.admin_name || '').toLowerCase().includes(q) || (s.admin_email || '').toLowerCase().includes(q)
        const matchReason = (s.reason || '').toLowerCase().includes(q)
        return matchName || matchSlug || matchAdmin || matchReason
      }
      return true
    })
  }, [supportSessions, historyStatusFilter, historyLevelFilter, historySearch, now])

  // Access Level Helpers
  const getAccessLevelBadge = (level: SupportAccessLevel) => {
    switch (level) {
      case 'read_only':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-200 border border-cyan-800/80">
            <Eye className="h-3 w-3 text-cyan-400" />
            READ ONLY
          </span>
        )
      case 'config_only':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-200 border border-amber-800/80">
            <Sliders className="h-3 w-3 text-amber-400" />
            CONFIG ONLY
          </span>
        )
      case 'full_support':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950/80 text-indigo-200 border border-indigo-800/80">
            <Wrench className="h-3 w-3 text-indigo-400" />
            FULL SUPPORT
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
            {level}
          </span>
        )
    }
  }

  // Format Expiration Time Remaining
  const formatTimeRemaining = (expiresAt: string) => {
    const diffMs = new Date(expiresAt).getTime() - Date.now()
    if (diffMs <= 0) return 'Expired'
    const totalMinutes = Math.floor(diffMs / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    }
    return `${minutes}m left`
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-2xl animate-in slide-in-from-top-2 duration-200 border ${
            notification.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-700 shadow-emerald-950/50'
              : 'bg-rose-950 text-rose-200 border-rose-700 shadow-rose-950/50'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            Audited Impersonation &amp; Zero-Trust Access
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <ShieldAlert className="h-7 w-7 text-amber-400" />
            Tenant Support &amp; Impersonation Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Time-bound, cryptographically signed support access into tenant ERP workspaces. Every action is logged to the immutable platform audit ledger.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              setSelectedCompany(null)
              setSupportReason('')
              setAccessLevel('read_only')
              setDurationMinutes(120)
              setActionError(null)
              setShowInitiateModal(true)
            }}
            className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-amber-600/20"
          >
            <Key className="h-3.5 w-3.5 mr-1.5" />
            Initiate Support Session
          </Button>

          <Button
            size="sm"
            onClick={handleExportCsv}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs h-9 px-3 rounded-xl"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
            Export CSV
          </Button>

          <Link href="/platform/audit">
            <Button
              size="sm"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs h-9 px-3 rounded-xl"
            >
              <History className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
              Audit Logs
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={() => loadData()}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs h-9 px-3 rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Executive Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Support Sessions */}
        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-400">Live Active Sessions</div>
            <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{activeSessions.length}</span>
            {activeSessions.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                Active Now
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-500">Zero-Trust Idle</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Currently open client impersonations</p>
        </Card>

        {/* Total Sessions Conducted */}
        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-400">Total Audited Sessions</div>
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800 text-indigo-400">
              <History className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {stats?.total_sessions ?? supportSessions.length}
            </span>
            <span className="text-[11px] font-semibold text-indigo-300">Lifetime</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">All historical support authorizations</p>
        </Card>

        {/* Access Level Distribution */}
        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-400">Access Tier Breakdown</div>
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-400">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-bold">
            <span className="text-cyan-300">{stats?.read_only_count ?? 0} Read</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-amber-300">{stats?.config_only_count ?? 0} Config</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-indigo-300">{stats?.full_support_count ?? 0} Full</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Least-privilege permission policy</p>
        </Card>

        {/* Audit Compliance Status */}
        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-400">Compliance &amp; Security</div>
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-300">100%</span>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800">
              Audited
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">SHA-256 signed session tokens</p>
        </Card>
      </div>

      {/* ACTIVE LIVE SUPPORT SESSIONS SECTION */}
      {activeSessions.length > 0 ? (
        <Card className="border-amber-500/40 bg-gradient-to-b from-amber-950/30 to-slate-950/80 backdrop-blur-md p-5 rounded-2xl ring-1 ring-amber-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
              <div>
                <h3 className="font-black text-white text-base tracking-tight flex items-center gap-2">
                  Active Support Sessions Running
                  <span className="px-2 py-0.2 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
                    {activeSessions.length} LIVE
                  </span>
                </h3>
                <p className="text-xs text-amber-200/80">
                  Zero-trust temporary impersonation in progress. Actions within tenant workspace are strictly recorded.
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono text-amber-300/80 self-start sm:self-auto bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-lg">
              Auto-Audit Active
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {activeSessions.map((sess) => {
              const timeLeft = formatTimeRemaining(sess.expires_at)
              return (
                <div
                  key={sess.id}
                  className="bg-slate-950/90 border border-amber-900/50 hover:border-amber-700/80 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-black text-white text-sm">
                        {sess.company_name || 'Tenant Organization'}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        /{sess.company_slug}
                      </span>
                      {getAccessLevelBadge(sess.access_level)}
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-800">
                        <Timer className="h-3 w-3 text-amber-400" />
                        {timeLeft}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200">
                      <span className="text-slate-400 font-semibold">Reason / Ticket:</span>{' '}
                      <span className="italic text-slate-100 font-medium">"{sess.reason}"</span>
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-400" />
                        Expires: {new Date(sess.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(sess.expires_at).toLocaleDateString()})
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3 text-indigo-400" />
                        Authorized by: <strong className="text-slate-200">{sess.admin_name || sess.admin_email}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                    <Link href={`/${sess.company_slug}/dashboard`}>
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 px-3 rounded-lg shadow-md shadow-amber-500/20"
                      >
                        Enter Tenant Portal
                        <ExternalLink className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      onClick={() => {
                        setExtendingSession(sess)
                        setExtendMinutes(60)
                        setShowExtendModal(true)
                      }}
                      className="bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-800 text-xs h-8 px-2.5 rounded-lg"
                    >
                      <Clock className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                      +60m
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleCopyLink(sess.company_slug || '', sess.id)}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs h-8 px-2.5 rounded-lg"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                    </Button>

                    <Button
                      size="sm"
                      disabled={revokingId === sess.id}
                      onClick={() => handleRevokeSession(sess.id, sess.company_name)}
                      className="bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 text-xs h-8 px-3 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {revokingId === sess.id ? 'Revoking...' : 'Terminate'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ) : (
        <Card className="border-slate-800 bg-slate-900/50 p-4 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">No Live Support Sessions Active</h4>
              <p className="text-[11px] text-slate-400">
                All tenant accounts are in strict isolation mode. Initiate a session below to assist a client.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedCompany(null)
              setSupportReason('')
              setAccessLevel('read_only')
              setDurationMinutes(120)
              setActionError(null)
              setShowInitiateModal(true)
            }}
            className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs h-8 px-3 rounded-lg shrink-0 font-semibold"
          >
            <Key className="h-3 w-3 mr-1.5 text-amber-400" />
            New Session
          </Button>
        </Card>
      )}

      {/* TENANT PORTFOLIO DIRECTORY & DIRECT SUPPORT LAUNCHER */}
      <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm p-5 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-400" />
              Tenant Organization Directory &amp; Support Launcher
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any client organization to launch an authorized support session with custom permissions.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Plan Filter Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'ALL', label: 'All Plans' },
                { id: 'ENTERPRISE', label: 'Enterprise' },
                { id: 'PRO', label: 'Pro/Growth' },
                { id: 'STARTER', label: 'Starter' },
                { id: 'TRIAL', label: 'Trial' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTenantPlanFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    tenantPlanFilter === tab.id
                      ? 'bg-amber-600 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tenant Search Bar */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Search tenant name or slug..."
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Tenant Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCompanies.slice(0, 15).map((comp) => {
            const hasActiveSession = activeSessions.some((s) => s.company_id === comp.id)
            return (
              <div
                key={comp.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  hasActiveSession
                    ? 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-950/20'
                    : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-white text-xs truncate">{comp.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">/{comp.slug}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 border border-slate-800 uppercase">
                      {comp.plan || 'starter'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 truncate">
                    {comp.owner_email || comp.owner_phone || 'Standard Tenant'}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900">
                  <span className="text-[10px] text-slate-500">
                    Status: <strong className="text-emerald-400 capitalize">{comp.status || 'active'}</strong>
                  </span>

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedCompany(comp)
                      setSupportReason('')
                      setAccessLevel('read_only')
                      setDurationMinutes(120)
                      setActionError(null)
                      setShowInitiateModal(true)
                    }}
                    className={`h-7 text-[11px] font-bold px-2.5 rounded-lg shrink-0 ${
                      hasActiveSession
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'bg-slate-900 hover:bg-amber-950/80 text-amber-300 border border-slate-800 hover:border-amber-700'
                    }`}
                  >
                    <Key className="h-3 w-3 mr-1 text-amber-400" />
                    {hasActiveSession ? 'Manage Session' : 'Launch Support'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {filteredCompanies.length > 15 && (
          <div className="text-center pt-2 text-xs text-slate-400">
            Showing top 15 of {filteredCompanies.length} tenants. Use search filter above for specific organizations.
          </div>
        )}
      </Card>

      {/* SUPPORT ACCESS AUDIT HISTORY & LEDGER TABLE */}
      <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm p-5 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-400" />
            <div>
              <h3 className="font-bold text-white text-sm">Support Access Audit Ledger</h3>
              <p className="text-xs text-slate-400">Zero-trust immutable audit logs of all support sessions.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-amber-500 h-8"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVOKED">Revoked</option>
            </select>

            {/* Level Filter */}
            <select
              value={historyLevelFilter}
              onChange={(e) => setHistoryLevelFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-amber-500 h-8"
            >
              <option value="ALL">All Access Levels</option>
              <option value="read_only">Read Only</option>
              <option value="config_only">Config Only</option>
              <option value="full_support">Full Support</option>
            </select>

            {/* Search */}
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Search audit ledger..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5">Tenant Organization</th>
                <th className="py-3 px-3.5">Authorized Administrator</th>
                <th className="py-3 px-3.5">Access Level</th>
                <th className="py-3 px-3.5">Reason / Justification</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Created At</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No support session records matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((sess) => {
                  const isExp = sess.status === 'expired' || (sess.status === 'active' && new Date(sess.expires_at).getTime() <= now)
                  const isRevoked = sess.status === 'revoked'
                  const isActive = sess.status === 'active' && !isExp && !isRevoked

                  return (
                    <tr key={sess.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-white block">{sess.company_name || 'Unknown Tenant'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">/{sess.company_slug}</span>
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="font-semibold text-slate-200 block">{sess.admin_name || 'Platform Admin'}</span>
                        <span className="text-[10px] text-slate-400">{sess.admin_email}</span>
                      </td>

                      <td className="py-3 px-3.5">
                        {getAccessLevelBadge(sess.access_level)}
                      </td>

                      <td className="py-3 px-3.5 max-w-xs truncate" title={sess.reason}>
                        <span className="text-slate-200 italic font-medium">"{sess.reason}"</span>
                      </td>

                      <td className="py-3 px-3.5">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                            Active ({formatTimeRemaining(sess.expires_at)})
                          </span>
                        ) : isRevoked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-950 px-2 py-0.5 rounded-full border border-rose-800">
                            Revoked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                            Expired
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-slate-400">
                        <div>{new Date(sess.created_at).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(sess.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        {isActive ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/${sess.company_slug}/dashboard`}>
                              <Button
                                size="sm"
                                className="h-7 text-[11px] font-bold px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg"
                              >
                                Enter
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              onClick={() => handleRevokeSession(sess.id, sess.company_name)}
                              className="h-7 text-[11px] font-bold px-2 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-lg"
                            >
                              Revoke
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              const comp = companies.find((c) => c.id === sess.company_id)
                              if (comp) {
                                setSelectedCompany(comp)
                                setSupportReason(`Follow-up on previous session: ${sess.reason}`)
                                setAccessLevel(sess.access_level)
                                setDurationMinutes(120)
                                setActionError(null)
                                setShowInitiateModal(true)
                              }
                            }}
                            className="h-7 text-[11px] font-semibold px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg"
                          >
                            Re-Authorize
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* INITIATE SUPPORT SESSION MODAL */}
      {showInitiateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Launch Audited Support Session</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInitiateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleStartSession} className="space-y-4 text-xs">
              {/* Target Tenant Organization */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Target Tenant Organization <span className="text-amber-400">*</span>
                </label>
                <select
                  value={selectedCompany?.id || ''}
                  onChange={(e) => {
                    const comp = companies.find((c) => c.id === e.target.value) || null
                    setSelectedCompany(comp)
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose Tenant Company --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug}) — Plan: {(c.plan || 'starter').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Access Level Selector */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Support Access Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      level: 'read_only' as SupportAccessLevel,
                      label: 'Read Only',
                      desc: 'Audit & diagnostics view',
                      icon: Eye,
                    },
                    {
                      level: 'config_only' as SupportAccessLevel,
                      label: 'Config Only',
                      desc: 'Settings & setup fixes',
                      icon: Sliders,
                    },
                    {
                      level: 'full_support' as SupportAccessLevel,
                      label: 'Full Support',
                      desc: 'Order & ops troubleshooting',
                      icon: Wrench,
                    },
                  ].map((item) => {
                    const Icon = item.icon
                    const isSelected = accessLevel === item.level
                    return (
                      <button
                        key={item.level}
                        type="button"
                        onClick={() => setAccessLevel(item.level)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/30'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="h-4 w-4 mb-1 text-amber-400" />
                        <div className="font-bold text-xs">{item.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Session Duration Selector */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Session Duration (TTL)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { minutes: 30, label: '30 Mins' },
                    { minutes: 60, label: '1 Hour' },
                    { minutes: 120, label: '2 Hours (Default)' },
                    { minutes: 240, label: '4 Hours' },
                  ].map((dur) => (
                    <button
                      key={dur.minutes}
                      type="button"
                      onClick={() => setDurationMinutes(dur.minutes)}
                      className={`p-2 rounded-xl border text-center font-bold text-[11px] transition-all ${
                        durationMinutes === dur.minutes
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Mandatory Justification / Ticket Reference <span className="text-amber-400">*</span>
                </label>
                <Input
                  value={supportReason}
                  onChange={(e) => setSupportReason(e.target.value)}
                  placeholder="e.g. Investigating Mushak 6.3 challan sequence issue per Ticket #4829"
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 rounded-xl text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This reason is permanently logged to the root compliance audit trail and visible to the tenant owner.
                </p>
              </div>

              {/* Compliance Warning */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                  Zero-Trust Compliance Notice
                </div>
                <p className="text-slate-400">
                  A high-visibility yellow banner will be displayed throughout your tenant session. All database mutations will be signed with your platform admin credentials.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  onClick={() => setShowInitiateModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs h-9 px-4 rounded-xl border border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={initiating || !selectedCompany || !supportReason.trim()}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-amber-600/20"
                >
                  {initiating ? 'Authorizing Session...' : 'Authorize & Enter Tenant'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EXTEND ACTIVE SESSION MODAL */}
      {showExtendModal && extendingSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Extend Support Session TTL</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExtendModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Extending support session for <strong className="text-white">{extendingSession.company_name}</strong>.
              </p>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Select Additional Time</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { minutes: 30, label: '+30 Mins' },
                    { minutes: 60, label: '+60 Mins' },
                    { minutes: 120, label: '+120 Mins' },
                  ].map((dur) => (
                    <button
                      key={dur.minutes}
                      type="button"
                      onClick={() => setExtendMinutes(dur.minutes)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                        extendMinutes === dur.minutes
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                type="button"
                onClick={() => setShowExtendModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs h-9 px-4 rounded-xl border border-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={extendingId === extendingSession.id}
                onClick={handleExtendSession}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-indigo-600/20"
              >
                {extendingId === extendingSession.id ? 'Extending...' : 'Confirm Extension'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
