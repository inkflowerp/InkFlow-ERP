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
 MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate, formatTime, formatDateTime } from '@/lib/formatters'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
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
import { PlatformSupportConsole } from '@/components/support/platform-support-console'
import { getPlatformSessionUserAction } from '@/actions/platform-auth.actions'
import { PlatformUserRecord } from '@/lib/auth/types'
import { getTenantLink } from '@/lib/tenant/tenant-url'
import { useI18n } from '@/lib/i18n'

export default function PlatformSupportPage() {
  const { tBilingual } = useI18n()
 const [supportView, setSupportView] = useState<'chat' | 'sessions'>('chat')
 const [adminUser, setAdminUser] = useState<PlatformUserRecord | null>(null)
 const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
 const [supportSessions, setSupportSessions] = useState<PlatformSupportSessionRecord[]>([])
 const [stats, setStats] = useState<PlatformSupportOverviewStats | null>(null)
 const [loading, setLoading] = useState(true)
 const [initiating, setInitiating] = useState(false)
 const [extendingId, setExtendingId] = useState<string | null>(null)
 const [revokingId, setRevokingId] = useState<string | null>(null)
 const [, setCopiedId] = useState<string | null>(null)

 // Revoke session confirm modal state
 const [sessionToRevoke, setSessionToRevoke] = useState<{ id: string; companyName?: string } | null>(null)
 const [isRevokeConfirmOpen, setIsRevokeConfirmOpen] = useState(false)

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
 const [compRes, sessionsRes, statsRes, userRes] = await Promise.all([
 getPlatformCompaniesAction({ pageSize: 200 }),
 getPlatformSupportSessionsAction(),
 getPlatformSupportOverviewStatsAction(),
 getPlatformSessionUserAction(),
 ])

 if (userRes) {
 setAdminUser(userRes)
 }

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
 if (res.redirectUrl.startsWith('http://') || res.redirectUrl.startsWith('https://')) {
 window.location.href = res.redirectUrl
 } else {
 router.push(res.redirectUrl)
 }
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
 const handleRevokeSession = (sessionId: string, companyName?: string) => {
 setSessionToRevoke({ id: sessionId, companyName })
 setIsRevokeConfirmOpen(true)
 }

 const confirmRevokeSession = async () => {
 if (!sessionToRevoke) return
 setRevokingId(sessionToRevoke.id)
 try {
 const res = await revokeSupportSessionAction(sessionToRevoke.id, 'Terminated from Platform Support Dashboard')
 if (res.success) {
 showToast('Support session revoked immediately. Zero-trust isolation enforced.')
 setIsRevokeConfirmOpen(false)
 setSessionToRevoke(null)
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
 const url = getTenantLink(slug, '/dashboard')
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
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-primary/10 text-primary border border-primary/20">
 <Eye className="h-3 w-3 text-primary" />
 READ ONLY
 </span>
 )
 case 'config_only':
 return (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-warning-surface text-warning border border-warning/30">
 <Sliders className="h-3 w-3 text-warning" />
 CONFIG ONLY
 </span>
 )
 case 'full_support':
 return (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-primary/10 text-primary border border-primary/20">
 <Wrench className="h-3 w-3 text-primary" />
 FULL SUPPORT
 </span>
 )
 default:
 return (
 <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-muted text-muted-foreground">
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
 <div
 className={cn(
 'mx-auto transition-all',
 supportView === 'chat'
 ? 'w-full flex-1 min-h-0 flex flex-col space-y-2.5 overflow-hidden'
 : 'max-w-7xl space-y-6 pb-12'
 )}
 >
 {/* Toast Notification */}
 {notification && (
 <div
 className={`fixed top-4 right-4 z-50 p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-xs animate-in slide-in-from-top-2 duration-200 border ${
 notification.type === 'success'
 ? 'bg-success-surface text-success border-success/30 shadow-xs'
 : 'bg-destructive/10 text-destructive border-destructive/30 shadow-xs'
 }`}
 >
 {notification.type === 'success' ? (
 <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
 ) : (
 <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
 )}
 <span>{notification.message}</span>
 </div>
 )}

 {/* Top Navigation Subtabs */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2.5 shrink-0">
 <div>
 <div className="flex items-center gap-2 text-2xs font-bold text-primary uppercase tracking-wider mb-0.5">
 <ShieldCheck className="h-3.5 w-3.5 text-primary" />
 Support Operations &amp; Live Triage
 </div>
 <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
 <ShieldAlert className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
 Platform Support Center
 </h1>
 </div>

 {/* View Mode Switcher Tabs */}
 <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card border border-border shrink-0">
 <button
 type="button"
 onClick={() => setSupportView('chat')}
 className={cn(
 'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
 supportView === 'chat'
 ? 'bg-primary text-primary-foreground shadow-xs'
 : 'text-muted-foreground hover:text-foreground hover:bg-muted'
 )}
 >
 <MessageSquare className="w-3.5 h-3.5" />
 <span>Live Chat &amp; Tickets</span>
 </button>
 <button
 type="button"
 onClick={() => setSupportView('sessions')}
 className={cn(
 'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
 supportView === 'sessions'
 ? 'bg-warning text-foreground shadow-xs'
 : 'text-muted-foreground hover:text-foreground hover:bg-muted'
 )}
 >
 <Key className="w-3.5 h-3.5" />
 <span>{tBilingual('Support Sessions', 'সাপোর্ট সেশন')}</span>
 {activeSessions.length > 0 && (
 <span className="px-1.5 py-0.2 rounded-full text-2xs font-bold bg-warning-surface text-warning border border-warning/30">
 {activeSessions.length}
 </span>
 )}
 </button>
 </div>
 </div>

 {/* VIEW 1: LIVE SUPPORT CONSOLE */}
 {supportView === 'chat' && (
 <div className="flex-1 min-h-0 overflow-hidden">
 <PlatformSupportConsole
 currentAdminId={adminUser?.id}
 currentAdminName={adminUser?.full_name}
 onOpenImpersonationModal={(companyId, companyName) => {
 const target = companies.find((c) => c.id === companyId)
 if (target) {
 setSelectedCompany(target)
 setSupportReason('')
 setAccessLevel('read_only')
 setDurationMinutes(120)
 setActionError(null)
 setShowInitiateModal(true)
 setSupportView('sessions')
 }
 }}
 />
 </div>
 )}

 {/* VIEW 2: SUPPORT IMPERSONATION SESSIONS */}
 {supportView === 'sessions' && (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <p className="text-xs sm:text-sm text-muted-foreground">
 Time-bound, cryptographically signed support access into tenant ERP workspaces. Every action is logged to the immutable platform audit ledger.
 </p>

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
 className="bg-warning hover:bg-warning text-foreground font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
 >
 <Key className="h-3.5 w-3.5 mr-1.5" />
 Initiate Support Session
 </Button>

 <Button
 size="sm"
 onClick={handleExportCsv}
 className="bg-muted hover:bg-muted text-foreground border border-border text-xs h-9 px-3 rounded-xl"
 >
 <Download className="h-3.5 w-3.5 mr-1.5 text-primary" />
 Export CSV
 </Button>

 <Link href="/platform/audit">
 <Button
 size="sm"
 className="bg-muted hover:bg-muted text-foreground border border-border text-xs h-9 px-3 rounded-xl"
 >
 <History className="h-3.5 w-3.5 mr-1.5 text-primary" />
 Audit Logs
 </Button>
 </Link>

 <Button
 size="sm"
 onClick={() => loadData()}
 disabled={loading}
 className="bg-muted hover:bg-muted text-foreground border border-border text-xs h-9 px-3 rounded-xl"
 >
 <RefreshCw className={`h-3.5 w-3.5 mr-1.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 </div>
 </div>

 {/* Executive Overview Metric Cards */}
 <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
 {/* Active Support Sessions */}
 <Card className="border-border bg-card backdrop-blur-md p-4 rounded-2xl relative overflow-hidden">
 <div className="flex items-center justify-between">
 <div className="text-xs font-semibold text-muted-foreground">Live Active Sessions</div>
 <div className="p-2 rounded-xl bg-warning-surface border border-warning/30 text-warning">
 <Activity className="h-4 w-4" />
 </div>
 </div>
 <div className="mt-2 flex items-baseline gap-2">
 <span className="text-2xl font-black text-foreground">{activeSessions.length}</span>
 {activeSessions.length > 0 ? (
 <span className="inline-flex items-center gap-1 text-2xs font-bold text-warning bg-warning-surface px-2 py-0.5 rounded-md border border-warning/30">
 <span className="h-1.5 w-1.5 rounded-full bg-warning animate-ping" />
 Active Now
 </span>
 ) : (
 <span className="text-2xs font-medium text-muted-foreground">Zero-Trust Idle</span>
 )}
 </div>
 <p className="text-2xs text-muted-foreground mt-1">{tBilingual('Active support sessions', 'চলমান সাপোর্ট সেশন')}</p>
 </Card>

 {/* Total Sessions Conducted */}
 <Card className="border-border bg-card backdrop-blur-md p-4 rounded-2xl">
 <div className="flex items-center justify-between">
 <div className="text-xs font-semibold text-muted-foreground">Total Audited Sessions</div>
 <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
 <History className="h-4 w-4" />
 </div>
 </div>
 <div className="mt-2 flex items-baseline gap-2">
 <span className="text-2xl font-black text-foreground">
 {stats?.total_sessions ?? supportSessions.length}
 </span>
 <span className="text-2xs font-semibold text-primary">Lifetime</span>
 </div>
 <p className="text-2xs text-muted-foreground mt-1">All historical support authorizations</p>
 </Card>

 {/* Access Level Distribution */}
 <Card className="border-border bg-card backdrop-blur-md p-4 rounded-2xl">
 <div className="flex items-center justify-between">
 <div className="text-xs font-semibold text-muted-foreground">Access Tier Breakdown</div>
 <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
 <SlidersHorizontal className="h-4 w-4" />
 </div>
 </div>
 <div className="mt-2 flex items-center gap-2 text-xs font-bold">
 <span className="text-primary">{stats?.read_only_count ?? 0} Read</span>
 <span className="text-muted-foreground">&bull;</span>
 <span className="text-warning">{stats?.config_only_count ?? 0} Config</span>
 <span className="text-muted-foreground">&bull;</span>
 <span className="text-primary">{stats?.full_support_count ?? 0} Full</span>
 </div>
 <p className="text-2xs text-muted-foreground mt-1">Least-privilege permission policy</p>
 </Card>

 {/* Audit Compliance Status */}
 <Card className="border-border bg-card backdrop-blur-md p-4 rounded-2xl">
 <div className="flex items-center justify-between">
 <div className="text-xs font-semibold text-muted-foreground">Compliance &amp; Security</div>
 <div className="p-2 rounded-xl bg-success-surface border border-success/30 text-success">
 <ShieldCheck className="h-4 w-4" />
 </div>
 </div>
 <div className="mt-2 flex items-baseline gap-2">
 <span className="text-2xl font-black text-success">100%</span>
 <span className="text-2xs font-bold text-success bg-success-surface px-2 py-0.5 rounded-md border border-success/30">
 Audited
 </span>
 </div>
 <p className="text-2xs text-muted-foreground mt-1">SHA-256 signed session tokens</p>
 </Card>
 </div>

 {/* ACTIVE LIVE SUPPORT SESSIONS SECTION */}
 {activeSessions.length > 0 ? (
 <Card className="border-warning/30 bg-card backdrop-blur-md p-5 rounded-2xl ring-1 ring-amber-500/30 space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-warning/30 pb-3">
 <div className="flex items-center gap-2.5">
 <span className="relative flex h-3 w-3">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
 <span className="relative inline-flex rounded-full h-3 w-3 bg-warning" />
 </span>
 <div>
 <h3 className="font-black text-foreground text-base tracking-tight flex items-center gap-2">
 Active Support Sessions Running
 <span className="px-2 py-0.2 rounded-full text-xs font-bold bg-warning text-foreground">
 {activeSessions.length} LIVE
 </span>
 </h3>
 <p className="text-xs text-warning/80">
 {tBilingual('Active session: All actions inside the client account are recorded.', 'চলমান সেশন: ক্লায়েন্ট অ্যাকাউন্টের সব কাজ রেকর্ড হচ্ছে।')}
 </p>
 </div>
 </div>

 <span className="text-2xs tabular-nums text-warning/80 self-start sm:self-auto bg-warning-surface border border-warning/30 px-2.5 py-1 rounded-lg">
 Auto-Audit Active
 </span>
 </div>

 <div className="grid grid-cols-1 gap-3">
 {activeSessions.map((sess) => {
 const timeLeft = formatTimeRemaining(sess.expires_at)
 return (
 <div
 key={sess.id}
 className="bg-card border border-warning/30 hover:border-warning/30 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
 >
 <div className="space-y-1.5 flex-1">
 <div className="flex items-center gap-2.5 flex-wrap">
 <span className="font-black text-foreground text-sm">
 {sess.company_name || 'Tenant Organization'}
 </span>
 <span className="text-2xs tabular-nums px-2 py-0.5 rounded-md bg-warning/20 text-warning border border-warning/30">
 /{sess.company_slug}
 </span>
 {getAccessLevelBadge(sess.access_level)}
 <span className="inline-flex items-center gap-1 text-2xs font-bold text-warning bg-warning-surface px-2.5 py-0.5 rounded-full border border-warning/30">
 <Timer className="h-3 w-3 text-warning" />
 {timeLeft}
 </span>
 </div>

 <p className="text-xs text-foreground">
 <span className="text-muted-foreground font-semibold">Reason / Ticket:</span>{' '}
 <span className="italic text-foreground font-medium">&quot;{sess.reason}&quot;</span>
 </p>

 <div className="flex items-center gap-4 text-2xs text-muted-foreground flex-wrap">
 <span className="flex items-center gap-1">
 <Clock className="h-3 w-3 text-warning" />
 Expires: {formatTime(sess.expires_at)} ({formatDate(sess.expires_at)})
 </span>
 <span className="flex items-center gap-1">
 <UserCheck className="h-3 w-3 text-primary" />
 Authorized by: <strong className="text-foreground">{sess.admin_name || sess.admin_email}</strong>
 </span>
 </div>
 </div>

 <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
 <Link href={sess.company_slug ? getTenantLink(sess.company_slug, '/dashboard') : '#'}>
 <Button
 size="sm"
 className="bg-warning hover:bg-warning text-foreground font-bold text-xs h-8 px-3 rounded-lg shadow-xs"
 >
 {tBilingual('Open Shop', 'দোকান খুলুন')}
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
 className="bg-primary/10 hover:bg-primary/90 text-primary border border-primary/20 text-xs h-8 px-2.5 rounded-lg"
 >
 <Clock className="h-3.5 w-3.5 mr-1 text-primary" />
 +60m
 </Button>

 <Button
 size="sm"
 onClick={() => handleCopyLink(sess.company_slug || '', sess.id)}
 className="bg-card hover:bg-muted text-muted-foreground border border-border text-xs h-8 px-2.5 rounded-lg"
 >
 <Copy className="h-3.5 w-3.5 text-muted-foreground" />
 </Button>

 <Button
 size="sm"
 disabled={revokingId === sess.id}
 onClick={() => handleRevokeSession(sess.id, sess.company_name)}
 className="bg-destructive/10 hover:bg-destructive/90 text-destructive border border-destructive/30 text-xs h-8 px-3 rounded-lg"
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
 <Card className="border-border bg-card p-4 rounded-2xl flex items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="p-2.5 rounded-xl bg-muted border border-border text-muted-foreground">
 <Shield className="h-5 w-5" />
 </div>
 <div>
 <h4 className="text-xs font-bold text-foreground">No Live Support Sessions Active</h4>
 <p className="text-2xs text-muted-foreground">
 {tBilingual('Start a session to help a client with their account.', 'ক্লায়েন্টকে সাহায্য করতে সেশন শুরু করুন।')}
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
 className="bg-muted hover:bg-muted text-warning border border-border text-xs h-8 px-3 rounded-lg shrink-0 font-semibold"
 >
 <Key className="h-3 w-3 mr-1.5 text-warning" />
 New Session
 </Button>
 </Card>
 )}

 {/* TENANT PORTFOLIO DIRECTORY & DIRECT SUPPORT LAUNCHER */}
 <Card className="border-border bg-card backdrop-blur-sm p-5 rounded-2xl space-y-4">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3">
 <div>
 <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
 <Building2 className="h-4 w-4 text-warning" />
 {tBilingual('All Clients', 'সব ক্লায়েন্ট')}
 </h3>
 <p className="text-xs text-muted-foreground mt-0.5">
 Select any client organization to launch an authorized support session with custom permissions.
 </p>
 </div>

 <div className="flex items-center gap-2 flex-wrap">
 {/* Plan Filter Tabs */}
 <div className="flex items-center bg-card p-1 rounded-xl border border-border">
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
 className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all ${
 tenantPlanFilter === tab.id
 ? 'bg-warning text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* Tenant Search Bar */}
 <div className="relative w-full sm:w-60">
 <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
 <Input
 placeholder={tBilingual('Search client name...', 'ক্লায়েন্টের নাম খুঁজুন...')}
 value={tenantSearch}
 onChange={(e) => setTenantSearch(e.target.value)}
 className="pl-8 h-8 text-xs bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl"
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
 ? 'bg-warning-surface border-warning/30 shadow-xs'
 : 'bg-card border-border hover:border-border'
 }`}
 >
 <div className="space-y-1">
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0">
 <p className="font-bold text-foreground text-xs truncate">{comp.name}</p>
 <p className="text-2xs text-muted-foreground tabular-nums">/{comp.slug}</p>
 </div>
 <span className="shrink-0 text-2xs font-bold px-2 py-0.5 rounded-md bg-card text-warning border border-border uppercase">
 {comp.plan || 'starter'}
 </span>
 </div>

 <p className="text-2xs text-muted-foreground truncate">
 {comp.owner_email || comp.owner_phone || 'Standard Tenant'}
 </p>
 </div>

 <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
 <span className="text-2xs text-muted-foreground">
 Status: <strong className="text-success capitalize">{comp.status || 'active'}</strong>
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
 className={`h-7 text-2xs font-bold px-2.5 rounded-lg shrink-0 ${
 hasActiveSession
 ? 'bg-warning text-foreground hover:bg-warning'
 : 'bg-card hover:bg-warning-surface text-warning border border-border hover:border-warning/30'
 }`}
 >
 <Key className="h-3 w-3 mr-1 text-warning" />
 {hasActiveSession ? 'Manage Session' : 'Launch Support'}
 </Button>
 </div>
 </div>
 )
 })}
 </div>

 {filteredCompanies.length > 15 && (
 <div className="text-center pt-2 text-xs text-muted-foreground">
 Showing top 15 of {filteredCompanies.length} tenants. Use search filter above for specific organizations.
 </div>
 )}
 </Card>

 {/* SUPPORT ACCESS AUDIT HISTORY & LEDGER TABLE */}
 <Card className="border-border bg-card backdrop-blur-sm p-5 rounded-2xl space-y-4">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3">
 <div className="flex items-center gap-2">
 <History className="h-4 w-4 text-primary" />
 <div>
 <h3 className="font-bold text-foreground text-sm">Support Access Audit Ledger</h3>
 <p className="text-xs text-muted-foreground">Zero-trust immutable audit logs of all support sessions.</p>
 </div>
 </div>

 <div className="flex items-center gap-2 flex-wrap">
 {/* Status Filter */}
 <select
 value={historyStatusFilter}
 onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
 className="bg-card border border-border text-foreground rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-warning/30 h-8"
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
 className="bg-card border border-border text-foreground rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-warning/30 h-8"
 >
 <option value="ALL">All Access Levels</option>
 <option value="read_only">Read Only</option>
 <option value="config_only">Config Only</option>
 <option value="full_support">Full Support</option>
 </select>

 {/* Search */}
 <div className="relative w-full sm:w-52">
 <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
 <Input
 placeholder="Search audit ledger..."
 value={historySearch}
 onChange={(e) => setHistorySearch(e.target.value)}
 className="pl-8 h-8 text-xs bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl"
 />
 </div>
 </div>
 </div>

 {/* History Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-card text-muted-foreground font-semibold border-b border-border">
 <tr>
 <th className="py-3 px-3.5">{tBilingual('Client', 'ক্লায়েন্ট')}</th>
 <th className="py-3 px-3.5">Authorized Administrator</th>
 <th className="py-3 px-3.5">Access Level</th>
 <th className="py-3 px-3.5">Reason / Justification</th>
 <th className="py-3 px-3.5">Status</th>
 <th className="py-3 px-3.5">Created At</th>
 <th className="py-3 px-3.5 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/60 text-muted-foreground">
 {filteredHistory.length === 0 ? (
 <tr>
 <td colSpan={7} className="py-8 text-center text-muted-foreground">
 No support session records matching the selected filters.
 </td>
 </tr>
 ) : (
 filteredHistory.map((sess) => {
 const isExp = sess.status === 'expired' || (sess.status === 'active' && new Date(sess.expires_at).getTime() <= now)
 const isRevoked = sess.status === 'revoked'
 const isActive = sess.status === 'active' && !isExp && !isRevoked

 return (
 <tr key={sess.id} className="hover:bg-muted transition-colors">
 <td className="py-3 px-3.5">
 <span className="font-bold text-foreground block">{sess.company_name || 'Unknown Tenant'}</span>
 <span className="text-2xs text-muted-foreground tabular-nums">/{sess.company_slug}</span>
 </td>

 <td className="py-3 px-3.5">
 <span className="font-semibold text-foreground block">{sess.admin_name || 'Platform Admin'}</span>
 <span className="text-2xs text-muted-foreground">{sess.admin_email}</span>
 </td>

 <td className="py-3 px-3.5">
 {getAccessLevelBadge(sess.access_level)}
 </td>

 <td className="py-3 px-3.5 max-w-xs truncate" title={sess.reason}>
 <span className="text-foreground italic font-medium">&quot;{sess.reason}&quot;</span>
 </td>

 <td className="py-3 px-3.5">
 {isActive ? (
 <span className="inline-flex items-center gap-1 text-2xs font-bold text-warning bg-warning-surface px-2 py-0.5 rounded-full border border-warning/30">
 <span className="h-1.5 w-1.5 rounded-full bg-warning animate-ping" />
 Active ({formatTimeRemaining(sess.expires_at)})
 </span>
 ) : isRevoked ? (
 <span className="inline-flex items-center gap-1 text-2xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/30">
 Revoked
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-2xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
 Expired
 </span>
 )}
 </td>

 <td className="py-3 px-3.5 text-muted-foreground">
 <div>{formatDate(sess.created_at)}</div>
 <div className="text-2xs text-muted-foreground">
 {formatTime(sess.created_at)}
 </div>
 </td>

 <td className="py-3 px-3.5 text-right">
 {isActive ? (
 <div className="flex items-center justify-end gap-1.5">
 <Link href={sess.company_slug ? getTenantLink(sess.company_slug, '/dashboard') : '#'}>
 <Button
 size="sm"
 className="h-7 text-2xs font-bold px-2 bg-warning hover:bg-warning text-foreground rounded-lg"
 >
 Enter
 </Button>
 </Link>
 <Button
 size="sm"
 onClick={() => handleRevokeSession(sess.id, sess.company_name)}
 className="h-7 text-2xs font-bold px-2 bg-destructive/10 hover:bg-destructive/90 text-destructive border border-destructive/30 rounded-lg"
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
 className="h-7 text-2xs font-semibold px-2 bg-card hover:bg-muted text-muted-foreground border border-border rounded-lg"
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
 </div>
 )}

 {/* INITIATE SUPPORT SESSION MODAL */}
 {showInitiateModal && (
 <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
 <Card className="w-full max-w-lg bg-card border-border shadow-xs p-6 rounded-2xl space-y-4">
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="flex items-center gap-2">
 <ShieldAlert className="h-5 w-5 text-warning" />
 <h3 className="font-bold text-foreground text-base">Launch Audited Support Session</h3>
 </div>
 <button
 type="button"
 onClick={() => setShowInitiateModal(false)}
 className="text-muted-foreground hover:text-foreground"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 {actionError && (
 <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl text-xs flex items-center gap-2">
 <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
 <span>{actionError}</span>
 </div>
 )}

 <form onSubmit={handleStartSession} className="space-y-4 text-xs">
 {/* Target Tenant Organization */}
 <div>
 <label className="text-muted-foreground font-semibold block mb-1">
 {tBilingual('Select Client', 'ক্লায়েন্ট বাছুন')} <span className="text-warning">*</span>
 </label>
 <select
 value={selectedCompany?.id || ''}
 onChange={(e) => {
 const comp = companies.find((c) => c.id === e.target.value) || null
 setSelectedCompany(comp)
 }}
 className="w-full bg-card border border-border text-foreground rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-warning/30"
 >
 <option value="">{tBilingual('-- Select Client --', '-- ক্লায়েন্ট বাছুন --')}</option>
 {companies.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name} ({c.slug}) — Plan: {(c.plan || 'starter').toUpperCase()}
 </option>
 ))}
 </select>
 </div>

 {/* Access Level Selector */}
 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Support Access Level</label>
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
 ? 'bg-warning/10 border-warning/30 text-warning ring-1 ring-amber-500/30'
 : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-border'
 }`}
 >
 <Icon className="h-4 w-4 mb-1 text-warning" />
 <div className="font-bold text-xs">{item.label}</div>
 <div className="text-2xs text-muted-foreground mt-0.5">{item.desc}</div>
 </button>
 )
 })}
 </div>
 </div>

 {/* Session Duration Selector */}
 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Session Duration (TTL)</label>
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
 className={`p-2 rounded-xl border text-center font-bold text-2xs transition-all ${
 durationMinutes === dur.minutes
 ? 'bg-warning text-foreground border-warning/30 shadow-md'
 : 'bg-card border-border text-muted-foreground hover:text-foreground'
 }`}
 >
 {dur.label}
 </button>
 ))}
 </div>
 </div>

 {/* Mandatory Reason */}
 <div>
 <label className="text-muted-foreground font-semibold block mb-1">
 Mandatory Justification / Ticket Reference <span className="text-warning">*</span>
 </label>
 <Input
 value={supportReason}
 onChange={(e) => setSupportReason(e.target.value)}
 placeholder="e.g. Investigating Mushak 6.3 challan sequence issue per Ticket #4829"
 className="bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl text-xs"
 />
 <p className="text-2xs text-muted-foreground mt-1">
 {tBilingual('This reason is recorded in the activity log.', 'এই কারণটি কাজের ইতিহাসে রেকর্ড থাকবে।')}
 </p>
 </div>

 {/* Compliance Warning */}
 <div className="p-3 bg-card border border-border rounded-xl text-2xs text-muted-foreground space-y-1">
 <div className="flex items-center gap-1.5 font-bold text-warning">
 <ShieldCheck className="h-3.5 w-3.5 text-warning" />
 Zero-Trust Compliance Notice
 </div>
 <p className="text-muted-foreground">
 A high-visibility yellow banner will be displayed throughout your tenant session. All database mutations will be signed with your platform admin credentials.
 </p>
 </div>

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
 <Button
 type="button"
 onClick={() => setShowInitiateModal(false)}
 className="bg-muted hover:bg-muted text-muted-foreground text-xs h-9 px-4 rounded-xl border border-border"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 disabled={initiating || !selectedCompany || !supportReason.trim()}
 className="bg-warning hover:bg-warning text-foreground font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
 >
 {initiating ? tBilingual('Opening...', 'খুলছে...') : tBilingual('Open as Client', 'ক্লায়েন্ট হিসেবে খুলুন')}
 </Button>
 </div>
 </form>
 </Card>
 </div>
 )}

 {/* EXTEND ACTIVE SESSION MODAL */}
 {showExtendModal && extendingSession && (
 <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
 <Card className="w-full max-w-md bg-card border-border shadow-xs p-6 rounded-2xl space-y-4">
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="flex items-center gap-2">
 <Clock className="h-5 w-5 text-primary" />
 <h3 className="font-bold text-foreground text-base">Extend Support Session TTL</h3>
 </div>
 <button
 type="button"
 onClick={() => setShowExtendModal(false)}
 className="text-muted-foreground hover:text-foreground"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="space-y-3 text-xs">
 <p className="text-muted-foreground">
 Extending support session for <strong className="text-foreground">{extendingSession.company_name}</strong>.
 </p>

 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Select Additional Time</label>
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
 ? 'bg-primary text-primary-foreground border-primary/20 shadow-md'
 : 'bg-card border-border text-muted-foreground hover:text-foreground'
 }`}
 >
 {dur.label}
 </button>
 ))}
 </div>
 </div>
 </div>

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
 <Button
 type="button"
 onClick={() => setShowExtendModal(false)}
 className="bg-muted hover:bg-muted text-muted-foreground text-xs h-9 px-4 rounded-xl border border-border"
 >
 Cancel
 </Button>
 <Button
 type="button"
 disabled={extendingId === extendingSession.id}
 onClick={handleExtendSession}
 className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
 >
 {extendingId === extendingSession.id ? 'Extending...' : 'Confirm Extension'}
 </Button>
 </div>
 </Card>
 </div>
 )}

 {/* Revoke Session Confirm Dialog */}
 <ConfirmDialog
 open={isRevokeConfirmOpen}
 onOpenChange={setIsRevokeConfirmOpen}
 title={`Terminate Support Session for ${sessionToRevoke?.companyName || 'Tenant'}?`}
 titleBn={`${sessionToRevoke?.companyName || 'ট্যানান্ট'} এর সাপোর্ট সেশন বন্ধ করবেন?`}
 message="Are you sure you want to terminate this active support delegation session? The platform engineer token will be revoked immediately."
 messageBn="আপনি কি এই সাপোর্ট সেশনটি বাতিল করতে চান? এক্সেস টোকেনটি তাৎক্ষণিকভাবে নিষ্ক্রিয় করা হবে।"
 confirmText="Terminate Session"
 confirmTextBn="সেশন বন্ধ করুন"
 cancelText="Cancel"
 cancelTextBn="বাতিল"
 isDestructive={true}
 isLoading={Boolean(revokingId)}
 onConfirm={confirmRevokeSession}
 />
 </div>
 )
}
