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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPlatformTenantUsersAction, getPlatformCompaniesAction } from '@/actions/platform-data.actions'
import { PlatformTenantUserItem, PlatformTenantCompany } from '@/types/platform.types'

export default function PlatformTenantUsersPage() {
  const [users, setUsers] = useState<PlatformTenantUserItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
  const [loading, setLoading] = useState(true)

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadData()
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

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
              className="h-9 text-xs border-indigo-500/30 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60"
            >
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Manage Platform Admins
            </Button>
          </Link>
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
            <Shield className="h-4 w-4 text-cyan-400" />
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
              placeholder="Search user name, email, phone, or company..."
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
                <option value="suspended">Suspended Only</option>
              </select>
            </div>

            <Button
              type="submit"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 px-4"
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
                    <p className="font-semibold text-slate-400">No users found</p>
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
                          <p className="font-bold text-white text-xs">{u.full_name || 'Unnamed User'}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-slate-500" />
                              {u.email}
                            </span>
                            {u.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-500" />
                                {u.phone}
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
                      <p className="text-[10px] text-slate-500 mt-0.5">/{u.company_slug}</p>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300 capitalize">
                        {u.primary_role ? u.primary_role.replace(/_/g, ' ') : 'Member'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {u.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/50 border border-emerald-800 text-emerald-300">
                          <UserCheck className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/50 border border-rose-800 text-rose-300">
                          <UserX className="h-3 w-3" />
                          {u.status}
                        </span>
                      )}
                    </td>


                    {/* Created */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(u.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <Link href={`/platform/tenants/${u.company_id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/80 px-2"
                        >
                          View Tenant
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
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
                className="h-8 w-8 p-0 border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40"
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
                className="h-8 w-8 p-0 border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
