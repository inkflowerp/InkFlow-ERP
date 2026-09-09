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
  Plus,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { getPlatformCompaniesAction } from '@/actions/platform-data.actions'
import {
  PlatformTenantCompany,
  PlatformCompanyStatus,
  PlatformPlanCode,
  TenantHealthStatus,
} from '@/types/platform.types'
import {
  updateCompanyStatusAction,
  changeCompanyPlanAction,
  startTenantSupportSessionAction,
  exportTenantDataAction,
  createBusinessAction,
  deleteBusinessAction,
  deleteAllBusinessesAction,
} from '@/actions/platform.actions'

export default function PlatformTenantsPage() {
  const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Create Business Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Status Change Modal (Suspend / Reactivate)
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

  // Delete Single Tenant Modal
  const [deleteModalCompany, setDeleteModalCompany] = useState<PlatformTenantCompany | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeletingCompany, setIsDeletingCompany] = useState(false)

  // Purge All Tenants Modal
  const [showPurgeAllModal, setShowPurgeAllModal] = useState(false)
  const [purgeReason, setPurgeReason] = useState('')
  const [purgeConfirmText, setPurgeConfirmText] = useState('')
  const [isPurgingAll, setIsPurgingAll] = useState(false)

  // Notifications
  const [notification, setNotification] = useState<string | null>(null)
  const router = useRouter()

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    const res = await getPlatformCompaniesAction({
      status: statusFilter !== 'all' ? (statusFilter as PlatformCompanyStatus) : undefined,
      plan: planFilter !== 'all' ? (planFilter as PlatformPlanCode) : undefined,
      search: search.trim() || undefined,
    })
    if (res.success && res.data) {
      const list = Array.isArray(res.data) ? res.data : res.data.companies
      setCompanies(list || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [statusFilter, planFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadData()
  }

  // Handle Create Business
  const handleCreateBusiness = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreatingBusiness(true)
    setCreateError(null)

    const formData = new FormData(e.currentTarget)
    const res = await createBusinessAction(formData)

    if (res.success) {
      showNotification(`Tenant business "${formData.get('name')}" provisioned successfully.`)
      setShowCreateModal(false)
      loadData()
    } else {
      setCreateError(res.error || 'Failed to create business.')
    }
    setIsCreatingBusiness(false)
  }

  // Handle Delete Single Tenant
  const handleDeleteCompany = async () => {
    if (!deleteModalCompany) return
    setIsDeletingCompany(true)
    const res = await deleteBusinessAction(deleteModalCompany.id, deleteReason)
    if (res.success) {
      showNotification(`Tenant "${deleteModalCompany.name}" and all associated workspace data have been deleted.`)
      setDeleteModalCompany(null)
      setDeleteReason('')
      loadData()
    } else {
      showNotification(res.error || 'Failed to delete tenant.')
    }
    setIsDeletingCompany(false)
  }

  // Handle Purge All Tenants
  const handlePurgeAllCompanies = async () => {
    if (purgeConfirmText !== 'PURGE') return
    setIsPurgingAll(true)
    const res = await deleteAllBusinessesAction(purgeReason || 'All tenants purged by platform administrator')
    if (res.success) {
      showNotification('All tenants and associated workspace data have been completely purged.')
      setShowPurgeAllModal(false)
      setPurgeReason('')
      setPurgeConfirmText('')
      loadData()
    } else {
      showNotification(res.error || 'Failed to purge tenants.')
    }
    setIsPurgingAll(false)
  }

  // Handle Status Update
  const handleUpdateStatus = async () => {
    if (!statusModalCompany || !statusReason.trim()) return
    setIsUpdatingStatus(true)

    const res = await updateCompanyStatusAction(
      statusModalCompany.id,
      targetStatus,
      statusReason
    )

    if (res.success) {
      showNotification(`Tenant status updated to ${targetStatus.toUpperCase()}.`)
      setStatusModalCompany(null)
      setStatusReason('')
      loadData()
    } else {
      showNotification(res.error || 'Failed to update tenant status.')
    }
    setIsUpdatingStatus(false)
  }

  // Handle Plan Change
  const handleChangePlan = async () => {
    if (!planModalCompany || !planReason.trim()) return
    setIsUpdatingPlan(true)

    const res = await changeCompanyPlanAction(
      planModalCompany.id,
      targetPlan,
      planReason
    )

    if (res.success) {
      showNotification(`Tenant subscription plan updated to ${targetPlan.toUpperCase()}.`)
      setPlanModalCompany(null)
      setPlanReason('')
      loadData()
    } else {
      showNotification(res.error || 'Failed to update tenant plan.')
    }
    setIsUpdatingPlan(false)
  }

  // Handle Start Support
  const handleStartSupport = async () => {
    if (!supportModalCompany || !supportReason.trim()) return
    setIsStartingSupport(true)

    const res = await startTenantSupportSessionAction(
      supportModalCompany.id,
      supportModalCompany.slug,
      supportModalCompany.name,
      supportReason
    )

    if (res.success && 'redirectUrl' in res) {
      showNotification('Temporary support access granted. Redirecting to tenant workspace...')
      setSupportModalCompany(null)
      router.push(res.redirectUrl)
    } else if (!res.success && 'error' in res) {
      showNotification(res.error)
    }
    setIsStartingSupport(false)
  }

  const filteredCompanies = companies.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    return (
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.owner_name && c.owner_name.toLowerCase().includes(q)) ||
      (c.owner_email && c.owner_email.toLowerCase().includes(q)) ||
      (c.owner_phone && c.owner_phone.includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-2xl animate-in slide-in-from-bottom-5">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Multi-Tenant Portfolio • Bangladesh SaaS
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Building2 className="h-7 w-7 text-indigo-400" />
            Tenants Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative directory of all organizations on the InkFlow platform with lifecycle governance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {companies.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowPurgeAllModal(true)
                setPurgeReason('')
                setPurgeConfirmText('')
              }}
              className="border-red-800/60 bg-red-950/30 text-red-400 hover:bg-red-900/50 hover:text-red-200 text-xs h-9 px-3 rounded-xl"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Purge All Tenants
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Tenant
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by business name, slug, owner, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-950/80 border-slate-800 text-xs text-white placeholder:text-slate-500 h-9 rounded-xl focus-visible:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
            <option value="archived">Archived</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
            <option value="growth">Growth</option>
          </select>
        </div>
      </div>

      {/* Tenant Table / Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-800 text-center py-16">
          <CardContent className="space-y-3">
            <Building2 className="h-12 w-12 text-slate-600 mx-auto" />
            <div className="text-base font-bold text-white">No tenants found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search || statusFilter !== 'all' || planFilter !== 'all'
                ? 'No organizations match your current search or filter criteria.'
                : 'No tenant organizations have been provisioned yet.'}
            </p>
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-8 mt-2"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create First Tenant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Business</th>
                  <th className="py-3.5 px-3 font-bold">Plan &amp; Pricing</th>
                  <th className="py-3.5 px-3 font-bold">Status</th>
                  <th className="py-3.5 px-3 font-bold">Owner / Contact</th>
                  <th className="py-3.5 px-3 font-bold">Usage</th>
                  <th className="py-3.5 px-3 font-bold">Created</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredCompanies.map((c) => {
                  const isSuspended = c.status === 'suspended'
                  const isTrial = c.status === 'trial'

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Business */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/platform/companies/${c.id}`}
                              className="font-bold text-white hover:text-indigo-400 transition-colors truncate block"
                            >
                              {c.name}
                            </Link>
                            <span className="text-[11px] text-slate-500 font-mono">/{c.slug}</span>
                          </div>
                        </div>
                      </td>

                      {/* Plan & Pricing */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-white capitalize">{c.plan}</div>
                        <div className="text-[11px] text-slate-400">
                          <CurrencyDisplay amount={c.monthly_fee || 0} />
                          <span className="text-[10px] text-slate-500">/mo</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            c.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isTrial
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : isSuspended
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              c.status === 'active'
                                ? 'bg-emerald-400'
                                : isTrial
                                ? 'bg-blue-400'
                                : isSuspended
                                ? 'bg-red-400'
                                : 'bg-slate-400'
                            }`}
                          />
                          {c.status}
                        </span>
                      </td>

                      {/* Owner / Contact */}
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-slate-200 truncate">{c.owner_name || 'Not set'}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">{c.owner_email || c.owner_phone || 'No contact'}</div>
                      </td>

                      {/* Usage */}
                      <td className="py-3.5 px-3">
                        <div className="text-[11px] text-slate-300">
                          {c.users_count || 0}/{c.users_limit || 5} Users
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {c.branches_count || 1} Branch
                        </div>
                      </td>

                      {/* Created */}
                      <td className="py-3.5 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(c.created_at || Date.now()).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/platform/companies/${c.id}`}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors"
                          >
                            360° View
                          </Link>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSupportModalCompany(c)
                              setSupportReason('')
                            }}
                            className="h-7 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 text-xs"
                            title="Start Support Session"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                          </Button>

                          {isSuspended ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setStatusModalCompany(c)
                                setTargetStatus('active')
                                setStatusReason('Tenant reactivated by Platform Administrator')
                              }}
                              className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 text-xs"
                              title="Reactivate Tenant"
                            >
                              Reactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setStatusModalCompany(c)
                                setTargetStatus('suspended')
                                setStatusReason('')
                              }}
                              className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 text-xs"
                              title="Suspend Tenant"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDeleteModalCompany(c)
                              setDeleteReason('')
                            }}
                            className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 text-xs"
                            title="Delete Tenant"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1. CREATE BUSINESS MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-400" />
                  Provision New Tenant Organization
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Creates a partitioned multi-tenant business instance on PostgreSQL with standard RBAC presets.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCreateBusiness}>
              <CardContent className="space-y-4 pt-4 text-xs">
                {createError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs">
                    {createError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Business Name *</label>
                    <Input
                      name="name"
                      required
                      placeholder="e.g. Classic Printers"
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">URL Slug *</label>
                    <Input
                      name="slug"
                      required
                      placeholder="classic-printers"
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Owner Name</label>
                    <Input
                      name="owner_name"
                      placeholder="e.g. Haji Shamim"
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Owner Email</label>
                    <Input
                      name="owner_email"
                      type="email"
                      placeholder="owner@example.com"
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Owner Phone (BD)</label>
                    <Input
                      name="owner_phone"
                      placeholder="01711000000"
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Initial Subscription Plan</label>
                    <select
                      name="plan"
                      defaultValue="starter"
                      className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    >
                      <option value="starter">Starter Press (৳2,500/mo)</option>
                      <option value="growth">Growth Signage (৳6,000/mo)</option>
                      <option value="enterprise">Enterprise Factory (৳15,000/mo)</option>
                    </select>
                  </div>
                </div>
              </CardContent>

              <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs border-slate-800 bg-slate-900 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingBusiness}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {isCreatingBusiness ? 'Provisioning...' : 'Provision Tenant'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 2. SUSPEND / REACTIVATE MODAL */}
      {statusModalCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-400" />
                {targetStatus === 'suspended' ? 'Suspend Tenant Access' : 'Reactivate Tenant'}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Organization: <strong className="text-white">{statusModalCompany.name}</strong> (/{statusModalCompany.slug})
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-200">
                {targetStatus === 'suspended'
                  ? 'Suspending this tenant will block all member logins and API access immediately.'
                  : 'Reactivating this tenant will restore operational access for all active organization users.'}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Reason for Status Change *</label>
                <Input
                  required
                  placeholder="e.g. Non-payment, Terms violation, Owner request..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>
            </CardContent>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusModalCompany(null)}
                className="text-xs border-slate-800 bg-slate-900 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                disabled={isUpdatingStatus || !statusReason.trim()}
                onClick={handleUpdateStatus}
                size="sm"
                className={
                  targetStatus === 'suspended'
                    ? 'bg-red-600 hover:bg-red-500 text-white font-bold text-xs'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs'
                }
              >
                {isUpdatingStatus ? 'Updating...' : `Confirm ${targetStatus === 'suspended' ? 'Suspension' : 'Reactivation'}`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 3. SUPPORT ACCESS MODAL */}
      {supportModalCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
                Initiate Time-Limited Support Session
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Target Organization: <strong className="text-white">{supportModalCompany.name}</strong>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
                <div className="font-semibold text-white">Zero Trust Protocol:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                  <li>Session expires automatically in 2 hours (TTL)</li>
                  <li>Actions are recorded to immutable audit log</li>
                  <li>A persistent banner is shown across tenant workspace</li>
                </ul>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Mandatory Support Reason *</label>
                <Input
                  required
                  placeholder="e.g. Investigating GST invoice printing layout issue #402"
                  value={supportReason}
                  onChange={(e) => setSupportReason(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>
            </CardContent>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSupportModalCompany(null)}
                className="text-xs border-slate-800 bg-slate-900 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                disabled={isStartingSupport || !supportReason.trim()}
                onClick={handleStartSupport}
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
              >
                {isStartingSupport ? 'Initiating...' : 'Start Support Session'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 4. DELETE SINGLE TENANT MODAL */}
      {deleteModalCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <Card className="w-full max-w-md bg-slate-900 border-red-800/60 text-slate-100 shadow-2xl shadow-red-950/40">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-red-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Delete Tenant Organization
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Are you sure you want to permanently delete{' '}
                <strong className="text-white">{deleteModalCompany.name}</strong> (/{deleteModalCompany.slug})?
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-red-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                  Irreversible Action
                </div>
                <p className="text-[11px] text-red-300/90 leading-relaxed">
                  This will permanently delete the tenant and all associated data including users, customer profiles,
                  orders, invoices, inventory rolls, and ledger balances across PostgreSQL partitions.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Reason for Deletion (Audit Trail)</label>
                <Input
                  placeholder="e.g. Account closed at owner request / Testing cleanup..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>
            </CardContent>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteModalCompany(null)
                  setDeleteReason('')
                }}
                className="text-xs border-slate-800 bg-slate-900 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                disabled={isDeletingCompany}
                onClick={handleDeleteCompany}
                size="sm"
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                {isDeletingCompany ? 'Deleting...' : 'Confirm Permanent Deletion'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 5. PURGE ALL TENANTS MODAL */}
      {showPurgeAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <Card className="w-full max-w-lg bg-slate-900 border-red-800 text-slate-100 shadow-2xl shadow-red-950/60">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-red-400 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Purge All Tenants (Danger Zone)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                You are about to wipe all {companies.length} tenant organization(s) from the platform.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-700 text-red-200 space-y-2">
                <div className="font-bold text-sm text-red-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                  CRITICAL PLATFORM PURGE
                </div>
                <p className="text-xs text-red-200 leading-relaxed">
                  This administrative operation will wipe <strong>all registered businesses</strong>, branches,
                  customer databases, job orders, and ledger transactions. Platform administrator accounts and system
                  roles will be preserved.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Reason for Platform Purge *</label>
                <Input
                  required
                  placeholder="e.g. System reset, Pre-production data cleanup..."
                  value={purgeReason}
                  onChange={(e) => setPurgeReason(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">
                  Type <span className="font-mono text-red-400 font-bold">PURGE</span> to confirm:
                </label>
                <Input
                  required
                  placeholder="PURGE"
                  value={purgeConfirmText}
                  onChange={(e) => setPurgeConfirmText(e.target.value)}
                  className="bg-slate-950 border-red-800 text-red-400 font-mono font-bold text-xs h-9 placeholder:text-slate-600"
                />
              </div>
            </CardContent>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPurgeAllModal(false)
                  setPurgeReason('')
                  setPurgeConfirmText('')
                }}
                className="text-xs border-slate-800 bg-slate-900 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                disabled={isPurgingAll || purgeConfirmText !== 'PURGE'}
                onClick={handlePurgeAllCompanies}
                size="sm"
                className="bg-red-600 hover:bg-red-500 disabled:bg-red-950 disabled:text-slate-500 text-white font-bold text-xs"
              >
                {isPurgingAll ? 'Purging All Tenants...' : 'Purge All Tenants Now'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
