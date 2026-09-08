'use client'

import React, { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPlatformCompaniesAction } from '@/actions/platform-data.actions'
import {
  startTenantSupportSessionAction,
  revokeSupportSessionAction,
} from '@/actions/platform.actions'
import { PlatformTenantCompany, SupportAccessLevel } from '@/types/platform.types'
import { useRouter } from 'next/navigation'

export default function PlatformSupportPage() {
  const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [initiating, setInitiating] = useState(false)
  const [search, setSearch] = useState('')

  // Dialog State
  const [showModal, setShowModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<PlatformTenantCompany | null>(null)
  const [supportReason, setSupportReason] = useState('')
  const [accessLevel, setAccessLevel] = useState<SupportAccessLevel>('read_only')
  const [actionError, setActionError] = useState<string | null>(null)
  const router = useRouter()

  const loadData = async () => {
    setLoading(true)
    try {
      const compRes = await getPlatformCompaniesAction({ pageSize: 100 })
      if (compRes.success && compRes.data) {
        setCompanies(compRes.data.companies)
      }

      // Check current support cookie
      const match = document.cookie.match(new RegExp('(^| )printerp_support_tenant=([^;]+)'))
      if (match) {
        try {
          const parsed = JSON.parse(decodeURIComponent(match[2]))
          setActiveSessions([parsed])
        } catch {
          // Ignored
        }
      } else {
        setActiveSessions([])
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany || !supportReason.trim() || supportReason.trim().length < 5) {
      setActionError('Please provide a descriptive reason for accessing tenant data (min 5 characters).')
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

      if (res.success && 'redirectUrl' in res) {
        setShowModal(false)
        router.push(res.redirectUrl)
      } else if (!res.success && 'error' in res) {
        setActionError(res.error)
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to initiate support session')
    } finally {
      setInitiating(false)
    }
  }

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      c.owner_email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
            <ShieldAlert className="h-4 w-4" />
            Governance & Privacy Control Plane
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            Secure Support Access
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Time-limited, purpose-bound, audited administrative entry into tenant workspaces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={loadData}
            variant="outline"
            className="border-slate-800 text-slate-300 hover:text-white bg-slate-900 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Principles Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Short-Lived (Max 2h)</h4>
              <p className="text-xs text-slate-400 mt-1">
                Support tokens automatically expire. Never permanent or indefinite.
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Least Privilege by Default</h4>
              <p className="text-xs text-slate-400 mt-1">
                Read-only default scope. Financial modifications and raw access are restricted.
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">100% Audited</h4>
              <p className="text-xs text-slate-400 mt-1">
                Every session start, exit, and mutation is logged in PostgreSQL audit trail.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Support Sessions */}
      {activeSessions.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-950/40 via-orange-950/20 to-slate-900 border-amber-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                <CardTitle className="text-base text-amber-200">Active Support Session Detected</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeSessions.map((sess, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-amber-500/20">
                <div>
                  <div className="text-sm font-bold text-white">{sess.targetCompanyName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Reason: <span className="text-amber-100">{sess.reason || 'General investigation'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => router.push(`/${sess.targetCompanySlug}/dashboard`)}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Enter Tenant App
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tenant Selection Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg text-white">Select Tenant for Support Access</CardTitle>
              <CardDescription className="text-slate-400 text-xs mt-1">
                Choose a business to request a temporary, audited support session.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search tenant name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-xs text-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm animate-pulse">
              Loading tenants catalog...
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No businesses matching your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Business</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Owner Contact</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCompanies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-white">{c.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">/{c.slug}</div>
                      </td>
                      <td className="p-3">
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          {c.plan}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                            c.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : c.status === 'trial'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-300">{c.owner_name}</div>
                        <div className="text-[11px] text-slate-500">{c.owner_phone}</div>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          onClick={() => {
                            setSelectedCompany(c)
                            setSupportReason('')
                            setActionError(null)
                            setShowModal(true)
                          }}
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer"
                        >
                          <Key className="h-3.5 w-3.5 mr-1.5" />
                          Request Support
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Support Initiation Modal */}
      {showModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Temporary Support Session</h3>
                <p className="text-xs text-slate-400">
                  Target Tenant: <strong className="text-white">{selectedCompany.name}</strong>
                </p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleStartSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Support Access Level
                </label>
                <select
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value as SupportAccessLevel)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                >
                  <option value="read_only">Read-Only (Recommended: view data, tickets & logs)</option>
                  <option value="config_only">Config Only (Settings, templates & printers)</option>
                  <option value="full_support">Full Support (Workflow troubleshooting)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mandatory Support Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={supportReason}
                  onChange={(e) => setSupportReason(e.target.value)}
                  placeholder="e.g., Investigating customer quotation PDF layout issue reported in ticket #842"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  This reason is permanently recorded in the immutable platform audit log.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  Session Parameters:
                </div>
                <div>• Session Lifetime: 2 hours maximum TTL</div>
                <div>• Visible orange support banner displayed on all screens</div>
                <div>• Exit anytime via &quot;Exit Support Mode&quot; button</div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="border-slate-800 text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={initiating}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                >
                  {initiating ? 'Authorizing Session...' : 'Authorize & Enter Workspace'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
