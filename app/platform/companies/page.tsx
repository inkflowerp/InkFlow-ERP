'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  Gauge,
  UserCheck,
  RefreshCw,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  HardDrive,
  Users,
  Store,
  Layers,
  FileCheck2,
  MoreVertical,
  Shield,
  Download,
  Ban,
  Activity,
  ArrowRight,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import {
  PlatformTenantCompany,
  CompanyUsageMetrics,
  PlatformCompanyStatus,
  PlatformPlanCode,
  TenantHealthStatus,
} from '@/types/platform.types'
import { SubscriptionPlanRecord } from '@/types/subscription.types'
import { getPlatformCompaniesAction, getPlatformPlansAction } from '@/actions/platform-data.actions'
import {
  updateCompanyStatusAction,
  changeCompanyPlanAction,
  startTenantSupportSessionAction,
  exportTenantDataAction,
  createBusinessAction,
  deleteBusinessAction,
  deleteAllBusinessesAction,
} from '@/actions/platform.actions'

export default function PlatformCompaniesPage() {
  const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [healthFilter, setHealthFilter] = useState<string>('all')
  const [divisionFilter, setDivisionFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Create Business Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Status Change Modal
  const [statusModalCompany, setStatusModalCompany] = useState<PlatformTenantCompany | null>(null)
  const [targetStatus, setTargetStatus] = useState<PlatformCompanyStatus>('active')
  const [statusReason, setStatusReason] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Plan Change Modal
  const [planModalCompany, setPlanModalCompany] = useState<PlatformTenantCompany | null>(null)
  const [targetPlan, setTargetPlan] = useState<PlatformPlanCode>('business')
  const [planReason, setPlanReason] = useState('')
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false)

  // Support Mode Modal
  const [supportModalCompany, setSupportModalCompany] = useState<PlatformTenantCompany | null>(null)
  const [supportReason, setSupportReason] = useState('')
  const [isStartingSupport, setIsStartingSupport] = useState(false)

  // Export Modal
  const [exportCompany, setExportCompany] = useState<PlatformTenantCompany | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Delete Single Company Modal
  const [deleteModalCompany, setDeleteModalCompany] = useState<PlatformTenantCompany | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeletingCompany, setIsDeletingCompany] = useState(false)

  // Purge All Companies Modal
  const [showPurgeAllModal, setShowPurgeAllModal] = useState(false)
  const [purgeReason, setPurgeReason] = useState('')
  const [isPurgingAll, setIsPurgingAll] = useState(false)

  // Active Dropdown Row Menu ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadCompanies = async () => {
    setLoading(true)
    const [compRes, plansRes] = await Promise.all([
      getPlatformCompaniesAction({
        search: search || undefined,
        status: statusFilter !== 'all' ? (statusFilter as PlatformCompanyStatus) : undefined,
        plan: planFilter !== 'all' ? (planFilter as PlatformPlanCode) : undefined,
      }),
      getPlatformPlansAction(),
    ])
    if (compRes.success && compRes.data) {
      setCompanies(Array.isArray(compRes.data) ? compRes.data : (compRes.data?.companies || []))
    }
    if (plansRes.success && plansRes.data) {
      setPlans(plansRes.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadCompanies()
  }, [search, statusFilter, planFilter, healthFilter, divisionFilter])

  const handleConfirmStatusChange = async () => {
    if (!statusModalCompany) return
    setIsUpdatingStatus(true)
    const res = await updateCompanyStatusAction(statusModalCompany.id, targetStatus, statusReason)
    if (res.success) {
      showNotification(`Tenant "${statusModalCompany.name}" status updated to ${targetStatus.toUpperCase()}.`)
      setStatusModalCompany(null)
      setStatusReason('')
      loadCompanies()
    } else {
      showNotification(res.error || 'Failed to update company status', 'error')
    }
    setIsUpdatingStatus(false)
  }

  const handleConfirmDeleteCompany = async () => {
    if (!deleteModalCompany) return
    setIsDeletingCompany(true)
    const res = await deleteBusinessAction(deleteModalCompany.id, deleteReason)
    if (res.success) {
      showNotification(`Tenant "${deleteModalCompany.name}" and all associated workspace data have been deleted.`)
      setDeleteModalCompany(null)
      setDeleteReason('')
      loadCompanies()
    } else {
      showNotification(res.error || 'Failed to delete company', 'error')
    }
    setIsDeletingCompany(false)
  }

  const handleConfirmPurgeAll = async () => {
    setIsPurgingAll(true)
    const res = await deleteAllBusinessesAction(purgeReason)
    if (res.success) {
      showNotification(`All registered businesses and their data have been completely removed from the platform.`)
      setShowPurgeAllModal(false)
      setPurgeReason('')
      loadCompanies()
    } else {
      showNotification(res.error || 'Failed to purge all businesses', 'error')
    }
    setIsPurgingAll(false)
  }

  const handleConfirmPlanChange = async () => {
    if (!planModalCompany || !planReason.trim()) return
    setIsUpdatingPlan(true)
    const res = await changeCompanyPlanAction(planModalCompany.id, targetPlan, planReason)
    if (res.success) {
      showNotification(`Tenant "${planModalCompany.name}" plan changed to ${targetPlan.toUpperCase()}.`)
      setPlanModalCompany(null)
      setPlanReason('')
      loadCompanies()
    } else {
      showNotification(res.error || 'Failed to change company plan', 'error')
    }
    setIsUpdatingPlan(false)
  }

  const handleConfirmSupportAccess = async () => {
    if (!supportModalCompany || !supportReason.trim()) return
    setIsStartingSupport(true)
    const res = await startTenantSupportSessionAction(
      supportModalCompany.id,
      supportModalCompany.slug,
      supportModalCompany.name,
      supportReason
    )
    if (res.success) {
      window.location.href = res.redirectUrl
    } else {
      showNotification(res.error || 'Failed to initiate support session', 'error')
      setIsStartingSupport(false)
    }
  }

  const handleConfirmExport = async () => {
    if (!exportCompany) return
    setIsExporting(true)
    const res = await exportTenantDataAction(exportCompany.id, [
      'customers',
      'quotations',
      'orders',
      'invoices',
      'payments',
      'inventory',
      'audit_logs',
    ])
    if (res.success) {
      showNotification(`Controlled tenant export generated. Token expires in 24 hours.`)
      setExportCompany(null)
    } else {
      showNotification('Failed to generate tenant export', 'error')
    }
    setIsExporting(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            Tenant Directory &amp; Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Building2 className="h-7 w-7 text-indigo-400" />
            Company Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Oversee printing press tenants across Bangladesh, inspect live usage, manage subscriptions, or enter support mode.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {companies.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPurgeReason('')
                setShowPurgeAllModal(true)
              }}
              className="border-red-800/80 bg-red-950/40 text-red-300 hover:bg-red-900/50 hover:text-white text-xs h-9 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5 text-red-400" />
              Purge All Businesses
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => {
              setCreateError(null)
              setShowCreateModal(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 shadow-md cursor-pointer"
          >
            + Create Business
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={loadCompanies}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in-0 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-200'
              : 'bg-red-950/70 border border-red-800 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search & Multi-Facet Filters */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search company, বাংলা নাম, owner, phone, email, district..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 bg-slate-950 border border-slate-800 rounded-xl px-2.5 text-xs text-slate-300 font-semibold"
            >
              <option value="all">Status: All</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="past_due">Past Due</option>
              <option value="suspended">Suspended</option>
            </select>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="h-9 bg-slate-950 border border-slate-800 rounded-xl px-2.5 text-xs text-slate-300 font-semibold"
            >
              <option value="all">Plan: All</option>
              <option value="trial">Trial</option>
              <option value="starter">Starter</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>

            {/* Health Filter */}
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="h-9 bg-slate-950 border border-slate-800 rounded-xl px-2.5 text-xs text-slate-300 font-semibold"
            >
              <option value="all">Health: All</option>
              <option value="healthy">Healthy</option>
              <option value="at_risk">At Risk</option>
              <option value="critical">Critical</option>
            </select>

            {/* Division Filter */}
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="h-9 bg-slate-950 border border-slate-800 rounded-xl px-2.5 text-xs text-slate-300 font-semibold"
            >
              <option value="all">Division: All BD</option>
              <option value="Dhaka">Dhaka</option>
              <option value="Chattogram">Chattogram</option>
              <option value="Sylhet">Sylhet</option>
              <option value="Rajshahi">Rajshahi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Companies List (Desktop Table / Mobile Cards) */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-white font-bold">
              Tenants Directory ({companies.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Showing matching printing organizations.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading companies...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-200 text-sm">No printing businesses registered yet.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {search || statusFilter !== 'all' || planFilter !== 'all'
                    ? 'No companies match your search filters. Try resetting the filters.'
                    : 'Platform is clean and production ready. New businesses will appear here upon tenant registration.'}
                </p>
              </div>
              {!search && statusFilter === 'all' && (
                <Button
                  size="sm"
                  onClick={() => {
                    setCreateError(null)
                    setShowCreateModal(true)
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-8 shadow-md cursor-pointer"
                >
                  + Register First Business
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Company &amp; Location</th>
                      <th className="py-3 px-4">Owner Contact</th>
                      <th className="py-3 px-4">Plan &amp; Rate</th>
                      <th className="py-3 px-4">Status &amp; Health</th>
                      <th className="py-3 px-4">Usage (Users/Storage)</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {companies.map((comp) => {
                      const isSuspended = comp.status === 'suspended'
                      const isAtRisk = comp.health === 'at_risk'
                      const isCritical = comp.health === 'critical'

                      return (
                        <tr key={comp.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <Link
                              href={`/platform/companies/${comp.id}`}
                              className="font-bold text-white hover:text-indigo-400 transition-colors block text-sm"
                            >
                              {comp.name}
                            </Link>
                            {comp.name_bn && (
                              <div className="text-[11px] text-slate-400 font-medium">{comp.name_bn}</div>
                            )}
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 text-slate-500" />
                              <span>{comp.hub}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-300">{comp.owner_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{comp.owner_phone}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="capitalize font-bold text-white px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px]">
                                {comp.plan}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-emerald-400 font-bold mt-0.5">
                              <CurrencyDisplay amount={comp.monthly_fee} /> / mo
                            </div>
                          </td>

                          <td className="py-3.5 px-4 space-y-1">
                            <div>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                  comp.status === 'active'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : comp.status === 'trial'
                                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                    : comp.status === 'past_due'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                                }`}
                              >
                                {comp.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-[10px] flex items-center gap-1 font-semibold">
                              <span className={`h-1.5 w-1.5 rounded-full ${isCritical ? 'bg-red-400' : isAtRisk ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                              <span className={`${isCritical ? 'text-red-400' : isAtRisk ? 'text-amber-400' : 'text-emerald-400'} uppercase font-mono`}>
                                {comp.health.replace('_', ' ')}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-300">
                              Users: <strong className="text-white font-mono">{comp.users_count}</strong> / {comp.users_limit}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Storage: <strong className="text-white font-mono">{comp.storage_used_gb.toFixed(1)} GB</strong> / {comp.storage_limit_gb} GB
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-400">
                            <div className="font-semibold text-slate-300">{comp.last_meaningful_activity.action}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{comp.last_activity}</div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 relative">
                              <Link
                                href={`/platform/companies/${comp.id}`}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold transition-all text-xs"
                              >
                                Open
                              </Link>

                              <button
                                type="button"
                                onClick={() => setActiveMenuId(activeMenuId === comp.id ? null : comp.id)}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {/* More Dropdown */}
                              {activeMenuId === comp.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                                  <div className="absolute right-0 top-8 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-1.5 text-xs text-left divide-y divide-slate-800">
                                    <div className="py-0.5 space-y-0.5">
                                      <Link
                                        href={`/platform/companies/${comp.id}`}
                                        onClick={() => setActiveMenuId(null)}
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                                      >
                                        <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                                        <span>Company 360</span>
                                      </Link>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null)
                                          setPlanModalCompany(comp)
                                          setTargetPlan(comp.plan)
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-left"
                                      >
                                        <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                                        <span>Change Plan</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null)
                                          setSupportModalCompany(comp)
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 text-left font-semibold"
                                      >
                                        <Shield className="h-3.5 w-3.5 text-amber-400" />
                                        <span>Support Mode</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null)
                                          setExportCompany(comp)
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-left"
                                      >
                                        <Download className="h-3.5 w-3.5 text-cyan-400" />
                                        <span>Export Data</span>
                                      </button>
                                    </div>

                                    <div className="pt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null)
                                          setStatusModalCompany(comp)
                                          setTargetStatus(isSuspended ? 'active' : 'suspended')
                                        }}
                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left font-semibold ${
                                          isSuspended
                                            ? 'text-emerald-400 hover:bg-emerald-950/40'
                                            : 'text-red-400 hover:bg-red-950/40'
                                        }`}
                                      >
                                        <Ban className="h-3.5 w-3.5" />
                                        <span>{isSuspended ? 'Reactivate Tenant' : 'Suspend Tenant'}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null)
                                          setDeleteReason('')
                                          setDeleteModalCompany(comp)
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left font-semibold text-red-400 hover:bg-red-950/60 hover:text-red-300"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                        <span>Delete Business</span>
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="block md:hidden divide-y divide-slate-800">
                {companies.map((comp) => (
                  <div key={comp.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/platform/companies/${comp.id}`}
                          className="font-bold text-white text-base hover:text-indigo-400"
                        >
                          {comp.name}
                        </Link>
                        <div className="text-xs text-slate-400">{comp.hub}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {comp.plan}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <div>Owner: <span className="text-white">{comp.owner_name}</span></div>
                      <div>Phone: <span className="font-mono text-white">{comp.owner_phone}</span></div>
                      <div>Users: <span className="text-white">{comp.users_count}/{comp.users_limit}</span></div>
                      <div>Storage: <span className="text-white">{comp.storage_used_gb} GB</span></div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <div className="text-[11px] text-slate-400">
                        {comp.last_meaningful_activity.action} ({comp.last_activity})
                      </div>
                      <Link
                        href={`/platform/companies/${comp.id}`}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold"
                      >
                        Open 360 →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Change Plan Dialog */}
      {planModalCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-400" />
                <span>Change Plan: {planModalCompany.name}</span>
              </div>
              <button onClick={() => setPlanModalCompany(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400">Current Plan: <strong className="text-white uppercase font-mono">{planModalCompany.plan}</strong> (৳{planModalCompany.monthly_fee}/mo)</div>
                <div className="text-slate-400">Current Limits: {planModalCompany.users_limit} users • {planModalCompany.branches_limit} branches • {planModalCompany.storage_limit_gb} GB</div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Plan</label>
                <select
                  value={targetPlan}
                  onChange={(e) => setTargetPlan(e.target.value as PlatformPlanCode)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-semibold"
                >
                  <option value="trial">Trial Plan (৳0/mo • 5 users • 1 branch • 2 GB)</option>
                  <option value="starter">Starter Press (৳1,999/mo • 3 users • 1 branch • 1 GB)</option>
                  <option value="business">Business Signage (৳4,999/mo • 10 users • 3 branches • 10 GB)</option>
                  <option value="enterprise">Enterprise Factory (৳9,999/mo • Unlimited • 100 GB)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Reason for Plan Change <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={planReason}
                  onChange={(e) => setPlanReason(e.target.value)}
                  placeholder="e.g. Tenant requested branch expansion and added 4 sales operators..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-600 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlanModalCompany(null)}
                className="border-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!planReason.trim() || isUpdatingPlan}
                onClick={handleConfirmPlanChange}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                {isUpdatingPlan ? 'Applying Plan...' : 'Confirm Plan Change'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Support Mode Dialog */}
      {supportModalCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>Enter Support Mode</span>
              </div>
              <button onClick={() => setSupportModalCompany(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200 text-xs space-y-1">
                <div className="font-bold">Privileged Tenant Support Access</div>
                <p className="text-[11px] opacity-90">
                  You are about to access <strong>{supportModalCompany.name}</strong> as an authorized platform technician. All operations are logged in the immutable audit ledger.
                </p>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Investigation Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={supportReason}
                  onChange={(e) => setSupportReason(e.target.value)}
                  placeholder="e.g. Investigating customer-reported Mushak 6.3 VAT rounding issue on Order #8812..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-600 text-xs"
                />
              </div>

              <div className="text-[11px] text-slate-500">
                Session duration: <strong>2 hours max</strong>. You can exit anytime via the persistent top support banner.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSupportModalCompany(null)}
                className="border-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!supportReason.trim() || isStartingSupport}
                onClick={handleConfirmSupportAccess}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30"
              >
                {isStartingSupport ? 'Entering...' : 'Authorize Support Session'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend / Reactivate Status Dialog */}
      {statusModalCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <Ban className="h-4 w-4 text-red-400" />
                <span>{targetStatus === 'suspended' ? 'Suspend Tenant Company' : 'Update Company Status'}</span>
              </div>
              <button onClick={() => setStatusModalCompany(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                You are changing the status for <strong>{statusModalCompany.name}</strong> from{' '}
                <span className="font-mono text-white uppercase">{statusModalCompany.status}</span> to{' '}
                <span className="font-mono text-white uppercase">{targetStatus}</span>.
              </p>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Reason</label>
                <textarea
                  rows={2}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Optional reason for audit records..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-600 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusModalCompany(null)}
                className="border-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isUpdatingStatus}
                onClick={handleConfirmStatusChange}
                className={`${targetStatus === 'suspended' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold text-xs`}
              >
                {isUpdatingStatus ? 'Updating...' : `Confirm ${targetStatus === 'suspended' ? 'Suspension' : 'Activation'}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {exportCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <Download className="h-4 w-4 text-cyan-400" />
                <span>Export Tenant Data: {exportCompany.name}</span>
              </div>
              <button onClick={() => setExportCompany(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Generate a controlled JSON archive of all tenant records (Customers, Products, Quotations, Orders, Invoices, Payments, Inventory, Audit Trail).
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportCompany(null)}
                className="border-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isExporting}
                onClick={handleConfirmExport}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md"
              >
                {isExporting ? 'Generating...' : 'Download Export Archive'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Business Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <Building2 className="h-5 w-5 text-indigo-400" />
                <span>Create New Business Tenant</span>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {createError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setIsCreatingBusiness(true)
                setCreateError(null)
                const form = e.currentTarget
                const formData = new FormData(form)

                try {
                  const res = await createBusinessAction(formData)
                  if (res.success) {
                    showNotification(`Tenant "${formData.get('name')}" successfully provisioned.`)
                    setShowCreateModal(false)
                    loadCompanies()
                  } else {
                    setCreateError(res.error || 'Failed to create business.')
                  }
                } catch (err: any) {
                  setCreateError(err.message || 'An error occurred')
                } finally {
                  setIsCreatingBusiness(false)
                }
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Business Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    name="name"
                    required
                    placeholder="e.g. Meghna Offset Printers"
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Slug (URL Identifier) <span className="text-red-400">*</span>
                  </label>
                  <Input
                    name="slug"
                    required
                    placeholder="meghna-offset"
                    className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bengali Name (Optional)
                  </label>
                  <Input
                    name="name_bn"
                    placeholder="মেঘনা অফসেট প্রিন্টার্স"
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Business Type
                  </label>
                  <select
                    name="business_type"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="commercial_printing">Commercial Printing &amp; Offset</option>
                    <option value="signage_flex">Outdoor Signage &amp; Flex Banner</option>
                    <option value="digital_press">Digital Press &amp; Laser Print</option>
                    <option value="packaging">Packaging &amp; Die Cutting</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3">
                <h4 className="text-xs font-bold text-indigo-400 mb-2">Business Owner Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Name</label>
                    <Input
                      name="owner_name"
                      placeholder="e.g. Al-Haj Rafiqul Islam"
                      className="bg-slate-950 border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Phone</label>
                    <Input
                      name="owner_phone"
                      placeholder="01711-XXXXXX"
                      className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Email</label>
                    <Input
                      name="owner_email"
                      type="email"
                      placeholder="owner@meghna-offset.com"
                      className="bg-slate-950 border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Owner Password</label>
                    <Input
                      name="owner_password"
                      defaultValue="PrintERP2026!Owner"
                      placeholder="Password"
                      className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Subscription Plan
                </label>
                {(() => {
                  const trialPlan = plans.find((p) => p.code === 'trial')
                  const trialDays = trialPlan?.trial_days || 14
                  return (
                    <select
                      name="plan"
                      defaultValue="trial"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="trial">
                        {trialPlan?.name ? `${trialPlan.name} (৳0/mo • ${trialDays} Days Evaluation)` : `Free Trial Plan (৳0/mo • ${trialDays} Days Evaluation)`}
                      </option>
                      <option value="starter">Starter Plan (৳1,999/mo • 3 Users • 1 Branch)</option>
                      <option value="business">Business Plan (৳4,999/mo • 10 Users • 3 Branches)</option>
                      <option value="enterprise">Enterprise Plan (৳9,999/mo • 50+ Users • Unlimited Branches)</option>
                    </select>
                  )
                })()}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="border-slate-700 text-slate-300 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreatingBusiness}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  {isCreatingBusiness ? 'Creating Tenant...' : 'Create Business'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Single Company Modal */}
      {deleteModalCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-md bg-slate-900 border border-red-900/50 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-400" />
                <span>Delete Tenant: {deleteModalCompany.name}</span>
              </div>
              <button
                onClick={() => setDeleteModalCompany(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 text-red-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-red-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Permanent Data Deletion Warning</span>
                </div>
                <p className="text-[11px] leading-relaxed text-red-300/90">
                  Deleting <strong>{deleteModalCompany.name}</strong> will permanently erase this tenant workspace, branches, users, orders, invoices, and audit records via cascading PostgreSQL deletion. This action cannot be undone.
                </p>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Reason for Deletion (Recorded in Platform Audit)
                </label>
                <textarea
                  rows={2}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Account closed upon business request..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-600 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalCompany(null)}
                className="border-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isDeletingCompany}
                onClick={handleConfirmDeleteCompany}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                {isDeletingCompany ? 'Deleting Tenant...' : 'Confirm Permanent Deletion'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Purge All Companies Modal */}
      {showPurgeAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-lg bg-slate-900 border border-red-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="font-bold text-white text-base flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                <span>Purge All Platform Businesses</span>
              </div>
              <button
                onClick={() => setShowPurgeAllModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 space-y-2">
                <div className="font-bold flex items-center gap-2 text-red-300 text-sm">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-red-400" />
                  <span>Platform-Wide Deletion Action</span>
                </div>
                <p className="text-xs leading-relaxed text-red-200/90">
                  This will permanently delete all <strong>{companies.length}</strong> registered printing businesses, user memberships, subscriptions, orders, and transactional records from the database.
                </p>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Platform Admin Purge Rationale
                </label>
                <textarea
                  rows={2}
                  value={purgeReason}
                  onChange={(e) => setPurgeReason(e.target.value)}
                  placeholder="e.g. Production baseline reset / clean launch..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-600 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPurgeAllModal(false)}
                className="border-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isPurgingAll}
                onClick={handleConfirmPurgeAll}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                {isPurgingAll ? 'Purging All Businesses...' : 'Confirm Purge All Businesses'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
