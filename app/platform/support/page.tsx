'use client'

import React, { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getPlatformCompaniesAction,
  getPlatformSupportSessionsAction,
} from '@/actions/platform-data.actions'
import {
  startTenantSupportSessionAction,
  revokeSupportSessionAction,
} from '@/actions/platform.actions'
import {
  PlatformTenantCompany,
  SupportAccessLevel,
  PlatformSupportSessionRecord,
} from '@/types/platform.types'

export default function PlatformSupportPage() {
  const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
  const [supportSessions, setSupportSessions] = useState<PlatformSupportSessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [initiating, setInitiating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Dialog State
  const [showModal, setShowModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<PlatformTenantCompany | null>(null)
  const [supportReason, setSupportReason] = useState('')
  const [accessLevel, setAccessLevel] = useState<SupportAccessLevel>('read_only')
  const [actionError, setActionError] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const router = useRouter()

  const showToast = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [compRes, sessionsRes] = await Promise.all([
        getPlatformCompaniesAction({ pageSize: 100 }),
        getPlatformSupportSessionsAction(),
      ])

      if (compRes.success && compRes.data) {
        const compList = Array.isArray(compRes.data) ? compRes.data : compRes.data?.companies || []
        setCompanies(compList)
      }

      if (sessionsRes.success && sessionsRes.data) {
        setSupportSessions(sessionsRes.data)
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) {
      setActionError('Please select a target tenant organization.')
      return
    }
    if (!supportReason.trim() || supportReason.trim().length < 5) {
      setActionError('Please provide a descriptive reason for accessing tenant data (minimum 5 characters).')
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
        accessLevel
      )

      if (res.success && 'redirectUrl' in res && res.redirectUrl) {
        setShowModal(false)
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

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId)
    try {
      const res = await revokeSupportSessionAction(sessionId)
      if (res.success) {
        showToast('Support session revoked successfully.')
        await loadData()
      } else {
        showToast(res.error || 'Failed to revoke support session.')
      }
    } catch {
      showToast('An unexpected error occurred while revoking.')
    } finally {
      setRevokingId(null)
    }
  }

  const activeSessions = supportSessions.filter((s) => s.status === 'active' && new Date(s.expires_at) > new Date())
  const historySessions = supportSessions.filter((s) => s.status !== 'active' || new Date(s.expires_at) <= new Date())

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Audited Impersonation &amp; Assistance
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <ShieldAlert className="h-7 w-7 text-amber-400" />
            Tenant Support Access Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Explicit, time-bound, and database-authoritative support sessions into client tenant accounts. Every action is cryptographically isolated and immutably audited.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setSelectedCompany(null)
              setSupportReason('')
              setAccessLevel('read_only')
              setActionError(null)
              setShowModal(true)
            }}
            className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs h-9 shadow-lg shadow-amber-600/20"
          >
            <Key className="h-3.5 w-3.5 mr-1.5" />
            Initiate Support Session
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadData()}
            className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="p-3.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Active Sessions Banner/Section */}
      {activeSessions.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-950/20 backdrop-blur-md p-5 rounded-2xl ring-1 ring-amber-500/30">
          <div className="flex items-center justify-between mb-3 border-b border-amber-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
              <h3 className="font-bold text-amber-300 text-sm">
                Active Support Session Running ({activeSessions.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-amber-400/80">
              Zero-Trust Audit Log Active
            </span>
          </div>

          <div className="space-y-3">
            {activeSessions.map((sess) => (
              <div
                key={sess.id}
                className="bg-slate-950/80 border border-amber-900/40 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">
                      {sess.company_name || 'Tenant Organization'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      /{sess.company_slug}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 capitalize">
                      {sess.access_level.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    <span className="text-slate-500 font-medium">Reason:</span> {sess.reason}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-400" />
                      Expires: {new Date(sess.expires_at).toLocaleTimeString()}
                    </span>
                    <span className="text-slate-500">
                      Authorized by: {sess.admin_name || sess.admin_email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link href={`/${sess.company_slug}/dashboard`}>
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 px-3"
                    >
                      Enter Tenant Portal
                      <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={revokingId === sess.id}
                    onClick={() => handleRevokeSession(sess.id)}
                    className="h-8 px-3 text-xs border-rose-900/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {revokingId === sess.id ? 'Revoking...' : 'Terminate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tenant Directory with Quick Support Launch */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="font-bold text-white text-sm">Tenant Portfolio Quick Access</h3>
            <p className="text-xs text-slate-400">Select any client organization to launch an authorized support session.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              placeholder="Filter tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCompanies.slice(0, 12).map((comp) => (
            <div
              key={comp.id}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-bold text-white text-xs truncate">{comp.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">/{comp.slug}</p>
                <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase">
                  {comp.plan}
                </span>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedCompany(comp)
                  setSupportReason('')
                  setAccessLevel('read_only')
                  setActionError(null)
                  setShowModal(true)
                }}
                className="h-7 text-[11px] border-slate-800 bg-slate-900 text-amber-400 hover:bg-amber-950/40 hover:text-amber-300 hover:border-amber-800/50 shrink-0 px-2.5"
              >
                <Key className="h-3 w-3 mr-1" />
                Support
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Support Sessions History */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" />
            <h3 className="font-bold text-white text-sm">Support Access Audit History</h3>
          </div>
          <Link href="/platform/audit">
            <span className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium">
              View Root Audit Logs &rarr;
            </span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Tenant Organization</th>
                <th className="py-2.5 px-3">Authorized By</th>
                <th className="py-2.5 px-3">Access Level</th>
                <th className="py-2.5 px-3">Justification / Reason</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {historySessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No historical support sessions recorded.
                  </td>
                </tr>
              ) : (
                historySessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-white">{sess.company_name}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">/{sess.company_slug}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {sess.admin_name || sess.admin_email}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300 capitalize">
                        {sess.access_level.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate" title={sess.reason}>
                      {sess.reason}
                    </td>
                    <td className="py-2.5 px-3">
                      {sess.status === 'revoked' ? (
                        <span className="text-rose-400 font-medium">Revoked</span>
                      ) : (
                        <span className="text-slate-500 font-medium">Expired</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {new Date(sess.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* INITIATE SUPPORT SESSION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Launch Audited Support Session</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleStartSession} className="space-y-4 text-xs">
              {/* Target Tenant Organization */}
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Target Tenant Organization</label>
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
                      {c.name} ({c.slug}) — Plan: {c.plan.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Access Level Selector */}
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Support Access Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      level: 'read_only' as SupportAccessLevel,
                      label: 'Read Only',
                      desc: 'Audit & diagnostics view',
                      icon: Eye,
                    },
                    {
                      level: 'operational_support' as SupportAccessLevel,
                      label: 'Operational',
                      desc: 'Order & job assistance',
                      icon: Wrench,
                    },
                    {
                      level: 'administrative_support' as SupportAccessLevel,
                      label: 'Admin Level',
                      desc: 'Settings & config fixes',
                      icon: Sliders,
                    },
                  ].map((item) => {
                    const Icon = item.icon
                    const isSelected = accessLevel === item.level
                    return (
                      <button
                        key={item.level}
                        type="button"
                        onClick={() => setAccessLevel(item.level)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/30'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <Icon className="h-4 w-4 mb-1" />
                        <div className="font-bold text-xs">{item.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Mandatory Justification / Ticket Reason <span className="text-amber-400">*</span>
                </label>
                <Input
                  value={supportReason}
                  onChange={(e) => setSupportReason(e.target.value)}
                  placeholder="e.g. Investigating Mushak 6.3 challan sequence issue per Ticket #4829"
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 rounded-xl text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  This reason is permanently logged to the root compliance audit trail and visible to the tenant owner.
                </p>
              </div>

              {/* TTL Warning */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  Auto-Expiration: 60 Minutes
                </div>
                <p>
                  Support tokens automatically expire after 1 hour. A prominent yellow banner will be displayed throughout the session.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-white text-xs h-9"
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
    </div>
  )
}
