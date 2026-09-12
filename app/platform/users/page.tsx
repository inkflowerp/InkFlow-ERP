'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  Search,
  Building2,
  Shield,
  UserCheck,
  UserX,
  Clock,
  Filter,
  RefreshCw,
  Mail,
  Phone,
  ArrowUpRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  Crown,
  Headphones,
  AlertTriangle,
  Lock,
  X,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import { getPlatformTenantUsersAction, getPlatformCompaniesAction } from '@/actions/platform-data.actions'
import {
  updateTenantUserStatusAction,
  startTenantSupportSessionAction,
} from '@/actions/platform.actions'
import { PlatformTenantUserItem, PlatformTenantCompany } from '@/types/platform.types'

export default function PlatformTenantUsersPage() {
  const [users, setUsers] = useState<PlatformTenantUserItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'suspended'>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
  const [loading, setLoading] = useState(true)

  // Status Modal State
  const [statusModalUser, setStatusModalUser] = useState<PlatformTenantUserItem | null>(null)
  const [targetStatus, setTargetStatus] = useState<'active' | 'disabled'>('disabled')
  const [statusReason, setStatusReason] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Support Session Trigger State
  const [isStartingSupport, setIsStartingSupport] = useState(false)

  // Notification State
  const [notification, setNotification] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleCopyText = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldKey)
    setTimeout(() => setCopiedField(null), 2500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersRes, compRes] = await Promise.all([
        getPlatformTenantUsersAction({
          search: search.trim() || undefined,
          companyId: companyFilter !== 'all' ? companyFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page,
          pageSize,
        }),
        getPlatformCompaniesAction({ pageSize: 100 }),
      ])

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data.users)
        setTotalCount(usersRes.data.total)
      }

      if (compRes.success && compRes.data) {
        const compList = Array.isArray(compRes.data) ? compRes.data : compRes.data?.companies || []
        setCompanies(compList)
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page, statusFilter, companyFilter])

  const handleOpenStatusModal = (user: PlatformTenantUserItem) => {
    setStatusModalUser(user)
    setTargetStatus(user.status === 'active' ? 'disabled' : 'active')
    setStatusReason('')
  }

  const handleConfirmStatusChange = async () => {
    if (!statusModalUser) return
    setIsUpdatingStatus(true)
    const res = await updateTenantUserStatusAction(statusModalUser.id, targetStatus, statusReason)
    if (res.success) {
      showNotification(`User "${statusModalUser.full_name}" status updated to ${targetStatus.toUpperCase()}.`)
      setStatusModalUser(null)
      setStatusReason('')
      loadData()
    } else {
      showNotification(res.error || 'Failed to update user status')
    }
    setIsUpdatingStatus(false)
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadData()
  }

  const handleStartSupport = async (companyId: string, companySlug: string, companyName: string) => {
    setIsStartingSupport(true)
    const res = await startTenantSupportSessionAction(
      companyId,
      companySlug,
      companyName,
      `Direct platform support initiated from Tenant Users Directory for ${companyName}`,
      'full_support'
    )
    if (res.success && (res as any).redirectUrl) {
      showNotification(`Support session initialized for ${companyName}. Token active for 2 hours.`)
      window.open((res as any).redirectUrl, '_blank')
    } else if (!res.success) {
      showNotification(res.error || 'Failed to start support session')
    }
    setIsStartingSupport(false)
  }

  const getRoleBadge = (role: string) => {
    const r = (role || '').toLowerCase()
    if (r.includes('owner')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/40 text-amber-300">
          <Crown className="h-3 w-3 text-amber-400" />
          Owner
        </span>
      )
    }
    if (r.includes('admin')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 border border-purple-500/40 text-purple-300">
          <Shield className="h-3 w-3 text-purple-400" />
          Admin
        </span>
      )
    }
    if (r.includes('manager')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 border border-blue-500/40 text-blue-300">
          Manager
        </span>
      )
    }
    if (r.includes('operator')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
          Operator
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300 capitalize">
        {role.replace(/_/g, ' ')}
      </span>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            Cross-Tenant Directory
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Users className="h-7 w-7 text-indigo-400" />
            Tenant Users Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time multi-tenant user registry across all active InkFlow client companies. Passwords and sensitive credentials remain cryptographically protected.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/platform/admins">
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs border-indigo-500/30 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Manage Platform Admins
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadData()}
            className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in-0">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Registered Users</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{totalCount.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-1">Across all onboarded tenants</p>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Organizations</span>
            <Building2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{companies.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Tenant companies provisioned</p>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Isolation Policy</span>
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="text-sm font-bold text-cyan-400 mt-2">Database RLS Enforced</p>
          <p className="text-[11px] text-slate-500 mt-1">Tenant boundaries strictly isolated</p>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search user name, email, phone, role, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-950/80 border-slate-800 text-sm text-white placeholder:text-slate-500 focus-visible:ring-indigo-500/30"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={companyFilter}
                onChange={(e) => {
                  setCompanyFilter(e.target.value)
                  setPage(1)
                }}
                className="bg-slate-950/80 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="all">All Tenant Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any)
                  setPage(1)
                }}
                className="bg-slate-950/80 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="disabled">Disabled Only</option>
                <option value="suspended">Suspended Only</option>
              </select>
            </div>

            <Button
              type="submit"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 px-4 cursor-pointer"
            >
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Users Table */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Organization / Tenant</th>
                <th className="py-3.5 px-4">Tenant Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading cross-tenant users directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-400">No tenant users found</p>
                    <p className="text-[11px] text-slate-600 mt-1">Try refining your search or filter parameters.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* User */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                          {u.full_name ? u.full_name[0].toUpperCase() : u.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-white text-xs">{u.full_name || 'Unnamed User'}</p>
                            {u.full_name_bn && (
                              <span className="text-[10px] text-slate-400 font-normal">({u.full_name_bn})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-slate-500" />
                              <span>{u.email}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(u.email, `email-${u.id}`)}
                                className="text-slate-500 hover:text-slate-300 ml-0.5 cursor-pointer"
                                title="Copy Email"
                              >
                                {copiedField === `email-${u.id}` ? (
                                  <Check className="h-2.5 w-2.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5" />
                                )}
                              </button>
                            </span>
                            {u.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-500" />
                                <span>{u.phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(u.phone!, `phone-${u.id}`)}
                                  className="text-slate-500 hover:text-slate-300 ml-0.5 cursor-pointer"
                                  title="Copy Phone"
                                >
                                  {copiedField === `phone-${u.id}` ? (
                                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-2.5 w-2.5" />
                                  )}
                                </button>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="py-3 px-4">
                      <Link
                        href={`/platform/tenants/${u.company_id}`}
                        className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium group"
                      >
                        <Building2 className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400" />
                        <span>{u.company_name}</span>
                        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono">/{u.company_slug}</p>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      {getRoleBadge(u.primary_role)}
                      {u.branch_name && (
                        <p className="text-[10px] text-slate-500 mt-0.5">Branch: {u.branch_name}</p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {u.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/50 border border-emerald-800 text-emerald-300">
                          <UserCheck className="h-3 w-3" />
                          Active
                        </span>
                      ) : u.status === 'disabled' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/50 border border-rose-800 text-rose-300">
                          <UserX className="h-3 w-3" />
                          Disabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/50 border border-amber-800 text-amber-300">
                          <Clock className="h-3 w-3" />
                          {u.status}
                        </span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {formatDate(u.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenStatusModal(u)}
                          className="h-7 text-[11px] border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 cursor-pointer"
                        >
                          {u.status === 'active' ? 'Disable' : 'Enable'}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isStartingSupport}
                          onClick={() => handleStartSupport(u.company_id, u.company_slug, u.company_name)}
                          className="h-7 text-[11px] border-indigo-900 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 px-2 cursor-pointer"
                          title="Start Platform Support Mode for this tenant"
                        >
                          <Headphones className="h-3 w-3 mr-1" />
                          Support
                        </Button>

                        <Link href={`/platform/tenants/${u.company_id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/80 px-2 cursor-pointer"
                          >
                            Tenant
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
            <div>
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} users
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0 border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-medium text-slate-300">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8 p-0 border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Status Toggle Modal */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${targetStatus === 'disabled' ? 'text-rose-400' : 'text-emerald-400'}`} />
                <h3 className="font-bold text-white text-base">
                  {targetStatus === 'disabled' ? 'Disable Tenant User' : 'Enable Tenant User'}
                </h3>
              </div>
              <button
                onClick={() => setStatusModalUser(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                You are about to modify the membership status for user{' '}
                <strong className="text-white">{statusModalUser.full_name}</strong> ({statusModalUser.email}) in tenant{' '}
                <strong className="text-white">{statusModalUser.company_name}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Target Status</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="active">Active (Full Tenant Access)</option>
                  <option value="disabled">Disabled (Block Tenant Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Status Change</label>
                <Input
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Account locked by admin or requested by tenant owner"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusModalUser(null)}
                className="border-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isUpdatingStatus}
                onClick={handleConfirmStatusChange}
                className={`text-white text-xs font-bold cursor-pointer ${
                  targetStatus === 'disabled'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {isUpdatingStatus ? 'Updating...' : `Confirm ${targetStatus === 'disabled' ? 'Disable' : 'Enable'}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
