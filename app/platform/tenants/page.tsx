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
  Copy,
  Check,
  Eye,
  EyeOff,
  Key,
  Globe,
  Lock,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { getPlatformCompaniesAction, getPlatformPlansAction } from '@/actions/platform-data.actions'
import {
  PlatformTenantCompany,
  PlatformCompanyStatus,
  PlatformPlanCode,
  TenantHealthStatus,
} from '@/types/platform.types'
import { SubscriptionPlanRecord } from '@/types/subscription.types'
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
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Create Business Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [provisionName, setProvisionName] = useState('')
  const [provisionSlug, setProvisionSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [provisionNameBn, setProvisionNameBn] = useState('')
  const [provisionBusinessType, setProvisionBusinessType] = useState('commercial_printing')
  const [provisionOwnerName, setProvisionOwnerName] = useState('')
  const [provisionOwnerEmail, setProvisionOwnerEmail] = useState('')
  const [provisionOwnerPhone, setProvisionOwnerPhone] = useState('')
  const [provisionPassword, setProvisionPassword] = useState('PrintERP2026!Owner')
  const [showPassword, setShowPassword] = useState(false)
  const [provisionAddress, setProvisionAddress] = useState('')
  const [provisionCurrency, setProvisionCurrency] = useState('BDT')
  const [provisionPlan, setProvisionPlan] = useState('trial')

  // Post-Provisioning Credentials Summary State
  const [provisionedResult, setProvisionedResult] = useState<{
    company: any
    credentials: {
      businessName: string
      slug: string
      email: string
      password: string
      loginUrl: string
      dashboardUrl: string
      plan: string
    }
  } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleNameChange = (val: string) => {
    setProvisionName(val)
    if (!slugManuallyEdited) {
      setProvisionSlug(generateSlug(val))
    }
  }

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
    let pwd = ''
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setProvisionPassword(pwd)
    setShowPassword(true)
  }

  const handleCopyText = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldKey)
    setTimeout(() => setCopiedField(null), 2500)
  }

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
    const [compRes, plansRes] = await Promise.all([
      getPlatformCompaniesAction({
        status: statusFilter !== 'all' ? (statusFilter as PlatformCompanyStatus) : undefined,
        plan: planFilter !== 'all' ? (planFilter as PlatformPlanCode) : undefined,
        search: search.trim() || undefined,
      }),
      getPlatformPlansAction(),
    ])
    if (compRes.success && compRes.data) {
      const list = Array.isArray(compRes.data) ? compRes.data : compRes.data.companies
      setCompanies(list || [])
    }
    if (plansRes.success && plansRes.data) {
      setPlans(plansRes.data)
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

    const finalSlug = (provisionSlug || generateSlug(provisionName)).trim().toLowerCase()
    const finalName = provisionName.trim()

    if (!finalName) {
      setCreateError('Business Name is required.')
      setIsCreatingBusiness(false)
      return
    }

    if (!finalSlug) {
      setCreateError('URL Slug is required.')
      setIsCreatingBusiness(false)
      return
    }

    const formData = new FormData()
    formData.set('name', finalName)
    formData.set('slug', finalSlug)
    formData.set('name_bn', provisionNameBn.trim())
    formData.set('business_type', provisionBusinessType)
    formData.set('owner_name', provisionOwnerName.trim())
    formData.set('owner_email', provisionOwnerEmail.trim())
    formData.set('owner_phone', provisionOwnerPhone.trim())
    formData.set('owner_password', provisionPassword.trim() || 'PrintERP2026!Owner')
    formData.set('address', provisionAddress.trim())
    formData.set('currency', provisionCurrency)
    formData.set('plan', provisionPlan)

    const res = await createBusinessAction(formData)

    if (res.success && res.data) {
      showNotification(`Tenant organization "${finalName}" provisioned successfully.`)
      setShowCreateModal(false)
      // Open credentials summary
      setProvisionedResult({
        company: res.data,
        credentials: (res as any).credentials || {
          businessName: res.data.name,
          slug: res.data.slug,
          email: provisionOwnerEmail.trim() || res.data.email || `owner@${res.data.slug}.com`,
          password: provisionPassword.trim() || 'PrintERP2026!Owner',
          loginUrl: `/${res.data.slug}/login`,
          dashboardUrl: `/${res.data.slug}/dashboard`,
          plan: provisionPlan,
        },
      })
      // Reset form fields
      setProvisionName('')
      setProvisionSlug('')
      setSlugManuallyEdited(false)
      setProvisionNameBn('')
      setProvisionOwnerName('')
      setProvisionOwnerEmail('')
      setProvisionOwnerPhone('')
      setProvisionPassword('PrintERP2026!Owner')
      setProvisionAddress('')
      setProvisionPlan('trial')
      loadData()
    } else {
      setCreateError(res.error || 'Failed to provision tenant organization.')
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

      {/* KPI Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="bg-slate-900/80 border-slate-800 p-4 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Tenants</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 flex items-baseline gap-2">
            {companies.length}
            <span className="text-[11px] font-normal text-slate-500 font-mono">orgs</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-indigo-400 font-bold">
              {companies.reduce((acc, c) => acc + (c.users_count || 0), 0)}
            </span>{' '}
            active members
          </div>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 p-4 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Tenants</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-600/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2 flex items-baseline gap-2">
            {companies.filter((c) => c.status === 'active').length}
            <span className="text-[11px] font-semibold text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              {companies.length > 0
                ? `${Math.round((companies.filter((c) => c.status === 'active').length / companies.length) * 100)}%`
                : '0%'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Operational workspaces</div>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 p-4 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Free Trials</span>
            <div className="h-8 w-8 rounded-xl bg-blue-600/15 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-400 mt-2 flex items-baseline gap-2">
            {companies.filter((c) => c.status === 'trial').length}
            <span className="text-[11px] font-normal text-slate-500 font-mono">evaluating</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">14-day evaluation accounts</div>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 p-4 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Suspended / Risk</span>
            <div className="h-8 w-8 rounded-xl bg-red-600/15 border border-red-500/20 text-red-400 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-400 mt-2 flex items-baseline gap-2">
            {companies.filter((c) => c.status === 'suspended').length}
            <span className="text-[11px] font-normal text-slate-500 font-mono">restricted</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Access restricted by policy</div>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 p-4 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Portfolio MRR</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-600/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            <CurrencyDisplay amount={companies.reduce((acc, c) => acc + (c.monthly_fee || 0), 0)} />
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Monthly SaaS revenue</div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { key: 'all', label: 'All Tenants', count: companies.length },
            { key: 'active', label: 'Active', count: companies.filter((c) => c.status === 'active').length },
            { key: 'trial', label: 'Trial', count: companies.filter((c) => c.status === 'trial').length },
            { key: 'suspended', label: 'Suspended', count: companies.filter((c) => c.status === 'suspended').length },
          ].map((tab) => {
            const isSelected = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2.5 flex-1 md:max-w-md justify-end">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by name, slug, owner, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-950/80 border-slate-800 text-xs text-white placeholder:text-slate-500 h-9 rounded-xl focus-visible:ring-indigo-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-medium focus:outline-none focus:border-indigo-500 shrink-0"
          >
            <option value="all">All Plans</option>
            <option value="trial">Trial Tier</option>
            <option value="starter">Starter Tier</option>
            <option value="business">Business Tier</option>
            <option value="enterprise">Enterprise Tier</option>
            <option value="growth">Growth Tier</option>
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
                              href={`/platform/tenants/${c.id}`}
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
                            href={`/platform/tenants/${c.id}`}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors"
                          >
                            360° View
                          </Link>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setPlanModalCompany(c)
                              setTargetPlan(c.plan as PlatformPlanCode)
                              setPlanReason('')
                            }}
                            className="h-7 px-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 text-xs"
                            title="Change Subscription Plan"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                          </Button>

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
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in-0 duration-200 overflow-y-auto">
          <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 text-slate-100 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <CardHeader className="border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                      Provision New Tenant Organization
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Creates a dedicated PostgreSQL partitioned tenant workspace with roles, branches, and subscriptions.
                    </CardDescription>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>

            <form onSubmit={handleCreateBusiness} className="flex flex-col flex-1 overflow-hidden">
              <CardContent className="space-y-5 p-5 text-xs overflow-y-auto flex-1">
                {createError && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                {/* Workspace Live Endpoint Banner */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span className="text-slate-400 text-xs">Direct Workspace URL:</span>
                    <span className="font-mono text-white font-bold text-xs">
                      /{provisionSlug || generateSlug(provisionName) || 'tenant-slug'}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md">
                    Multi-Tenant Path
                  </span>
                </div>

                {/* Section: Organization Identity */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                    1. Organization Identity &amp; Routing
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">
                        Business Name <span className="text-red-400">*</span>
                      </label>
                      <Input
                        required
                        placeholder="e.g. Meghna Offset Printers"
                        value={provisionName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-slate-300">
                          URL Slug (Kebab-case) <span className="text-red-400">*</span>
                        </label>
                        {slugManuallyEdited && (
                          <button
                            type="button"
                            onClick={() => {
                              setSlugManuallyEdited(false)
                              setProvisionSlug(generateSlug(provisionName))
                            }}
                            className="text-[10px] text-indigo-400 hover:underline"
                          >
                            Reset to auto
                          </button>
                        )}
                      </div>
                      <Input
                        required
                        placeholder="meghna-offset"
                        value={provisionSlug}
                        onChange={(e) => {
                          setSlugManuallyEdited(true)
                          setProvisionSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                        }}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">Bengali Name (ঐচ্ছিক বাংলা নাম)</label>
                      <Input
                        placeholder="যেমন: মেঘনা অফসেট প্রিন্টার্স"
                        value={provisionNameBn}
                        onChange={(e) => setProvisionNameBn(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">Industry / Business Type</label>
                      <select
                        value={provisionBusinessType}
                        onChange={(e) => setProvisionBusinessType(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                      >
                        <option value="commercial_printing">Commercial Printing &amp; Offset</option>
                        <option value="signage_flex">Outdoor Signage &amp; Flex Banner</option>
                        <option value="digital_press">Digital Press &amp; Laser Print</option>
                        <option value="packaging">Packaging &amp; Corrugated Box</option>
                        <option value="garment_accessories">Garment Accessories &amp; Label</option>
                        <option value="sublimation">Sublimation &amp; Promotional Gifts</option>
                        <option value="publication">Newspaper &amp; Periodicals Publishing</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Owner & Primary Administrator */}
                <div className="space-y-3 border-t border-slate-800/80 pt-4">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
                    2. Primary Owner Credentials &amp; Contact
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">Owner Full Name</label>
                      <Input
                        placeholder="e.g. Al-Haj Rafiqul Islam"
                        value={provisionOwnerName}
                        onChange={(e) => setProvisionOwnerName(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">Owner Email (Login Account)</label>
                      <Input
                        type="email"
                        placeholder="owner@meghna-offset.com"
                        value={provisionOwnerEmail}
                        onChange={(e) => setProvisionOwnerEmail(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">Owner Phone (BD Format)</label>
                      <Input
                        placeholder="01711-000000"
                        value={provisionOwnerPhone}
                        onChange={(e) => setProvisionOwnerPhone(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-slate-300">Initial Owner Password</label>
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                        >
                          <Sparkles className="h-3 w-3" />
                          Generate Strong
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={provisionPassword}
                          onChange={(e) => setProvisionPassword(e.target.value)}
                          placeholder="Password"
                          className="bg-slate-950 border-slate-800 text-white text-xs h-9 pr-8 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Location & Currency */}
                <div className="space-y-3 border-t border-slate-800/80 pt-4">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                    3. Location &amp; Currency Profile
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="font-semibold text-slate-300">Business / Factory Address</label>
                      <Input
                        placeholder="e.g. 14 Arambagh, Motijheel, Dhaka-1000"
                        value={provisionAddress}
                        onChange={(e) => setProvisionAddress(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">Base Currency</label>
                      <select
                        value={provisionCurrency}
                        onChange={(e) => setProvisionCurrency(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                      >
                        <option value="BDT">BDT (৳ Bangladesh Taka)</option>
                        <option value="USD">USD ($ US Dollar)</option>
                        <option value="EUR">EUR (€ Euro)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Subscription Plan Selection */}
                <div className="space-y-3 border-t border-slate-800/80 pt-4">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-indigo-400" />
                    4. Initial Subscription Plan
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(() => {
                      const trialPlan = plans.find((p) => p.code === 'trial')
                      const trialDays = trialPlan?.trial_days || 14
                      return (
                        <div
                          onClick={() => setProvisionPlan('trial')}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            provisionPlan === 'trial'
                              ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white text-xs">Free Trial Evaluation</span>
                            <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                              ৳0 • {trialDays} Days
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Full platform evaluation access for {trialDays} days without charge.</p>
                        </div>
                      )
                    })()}

                    <div
                      onClick={() => setProvisionPlan('starter')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        provisionPlan === 'starter'
                          ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-xs">Starter Plan</span>
                        <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                          ৳1,999/mo
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Up to 3 Users • 1 Branch • Basic Quotations &amp; Billing.</p>
                    </div>

                    <div
                      onClick={() => setProvisionPlan('business')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        provisionPlan === 'business'
                          ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-xs">Business Plan</span>
                        <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">
                          ৳4,999/mo
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Up to 10 Users • 3 Branches • Inventory &amp; Production Kanban.</p>
                    </div>

                    <div
                      onClick={() => setProvisionPlan('enterprise')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        provisionPlan === 'enterprise'
                          ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-xs">Enterprise Plan</span>
                        <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                          ৳9,999/mo
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">50+ Users • Unlimited Branches • Dedicated SLA &amp; Support.</p>
                    </div>
                  </div>
                </div>
              </CardContent>

              <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2.5 bg-slate-950/80 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingBusiness}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4"
                >
                  {isCreatingBusiness ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Provisioning Workspace...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Provision Tenant Organization
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 1.1 POST-PROVISIONING CREDENTIALS SUMMARY MODAL */}
      {provisionedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <Card className="w-full max-w-lg bg-slate-900 border-emerald-500/30 text-slate-100 shadow-2xl overflow-hidden">
            <div className="bg-emerald-950/40 border-b border-emerald-500/20 p-5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  Tenant Workspace Provisioned!
                </h3>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  The organization instance has been partitioned and initialized with administrative privileges.
                </p>
              </div>
            </div>

            <CardContent className="p-5 space-y-4 text-xs">
              {/* Org Details Card */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Organization:</span>
                  <span className="font-bold text-white text-sm">{provisionedResult.credentials.businessName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Subscription Tier:</span>
                  <span className="font-semibold text-indigo-400 uppercase tracking-wider text-[11px]">
                    {provisionedResult.credentials.plan}
                  </span>
                </div>
              </div>

              {/* Login Credentials Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="font-bold text-slate-300 text-xs flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                  <Key className="h-3.5 w-3.5 text-indigo-400" />
                  Owner Access &amp; Login Credentials
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="text-[11px] text-slate-400 mb-0.5">Direct Workspace URL</div>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                      <span className="font-mono text-white text-xs truncate">
                        {provisionedResult.credentials.loginUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(
                            `${window.location.origin}${provisionedResult.credentials.loginUrl}`,
                            'url'
                          )
                        }
                        className="text-slate-400 hover:text-indigo-400 p-1 text-xs shrink-0"
                        title="Copy Login URL"
                      >
                        {copiedField === 'url' ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-400 mb-0.5">Owner Email</div>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                      <span className="font-mono text-white text-xs truncate">
                        {provisionedResult.credentials.email}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(provisionedResult.credentials.email, 'email')}
                        className="text-slate-400 hover:text-indigo-400 p-1 text-xs shrink-0"
                        title="Copy Email"
                      >
                        {copiedField === 'email' ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-400 mb-0.5">Temporary Access Password</div>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                      <span className="font-mono text-emerald-400 font-bold text-xs">
                        {provisionedResult.credentials.password}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(provisionedResult.credentials.password, 'password')}
                        className="text-slate-400 hover:text-indigo-400 p-1 text-xs shrink-0"
                        title="Copy Password"
                      >
                        {copiedField === 'password' ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* One-Click Copy All */}
              <Button
                type="button"
                onClick={() => {
                  const payload = `🚀 Welcome to InkFlow ERP!\n\nYour organization workspace is ready:\n🏢 Organization: ${provisionedResult.credentials.businessName}\n🌐 Login URL: ${window.location.origin}${provisionedResult.credentials.loginUrl}\n👤 Owner Email: ${provisionedResult.credentials.email}\n🔑 Password: ${provisionedResult.credentials.password}\n📦 Plan: ${provisionedResult.credentials.plan.toUpperCase()}\n\nPlease log in and update your password from your profile settings.`
                  handleCopyText(payload, 'all')
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs h-9 border border-slate-700 rounded-xl"
              >
                {copiedField === 'all' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400 mr-1.5" />
                    Onboarding Credentials Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-indigo-400 mr-1.5" />
                    Copy Formatted Onboarding Message (WhatsApp / Email)
                  </>
                )}
              </Button>
            </CardContent>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <Link
                  href={`/platform/tenants/${provisionedResult.company.id}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors"
                >
                  View 360° Profile
                </Link>
                <Link
                  href={provisionedResult.credentials.loginUrl}
                  target="_blank"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-medium text-xs border border-indigo-500/30 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Workspace
                </Link>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => setProvisionedResult(null)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4"
              >
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 2. CHANGE PLAN MODAL */}
      {planModalCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <Card className="w-full max-w-xl bg-slate-900 border-slate-800 text-slate-100 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <CardHeader className="border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                      Modify Subscription Plan
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Organization: <strong className="text-white">{planModalCompany.name}</strong> (/{planModalCompany.slug}) • Current Plan:{' '}
                      <span className="font-bold text-indigo-400 capitalize">{planModalCompany.plan}</span>
                    </CardDescription>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPlanModalCompany(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-5 text-xs overflow-y-auto flex-1">
              <div className="space-y-2">
                <label className="font-semibold text-slate-300 block">Select Target Tier</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      code: 'trial' as PlatformPlanCode,
                      title: 'Free Trial',
                      price: '৳0 / 14 Days',
                      desc: 'Full evaluation access for testing and initial pilot setup.',
                    },
                    {
                      code: 'starter' as PlatformPlanCode,
                      title: 'Starter Tier',
                      price: '৳1,999 / mo',
                      desc: 'Up to 3 Users • 1 Branch • Basic Quotations & POS Invoices.',
                    },
                    {
                      code: 'business' as PlatformPlanCode,
                      title: 'Business Tier',
                      price: '৳4,999 / mo',
                      desc: 'Up to 10 Users • 3 Branches • Inventory & Production Kanban.',
                    },
                    {
                      code: 'enterprise' as PlatformPlanCode,
                      title: 'Enterprise Tier',
                      price: '৳9,999 / mo',
                      desc: '50+ Users • Unlimited Branches • Dedicated Support & Custom SLA.',
                    },
                    {
                      code: 'growth' as PlatformPlanCode,
                      title: 'Growth / Scale',
                      price: '৳14,999 / mo',
                      desc: 'High volume transactional quota • Advanced API integrations.',
                    },
                  ].map((p) => {
                    const isSelected = targetPlan === p.code
                    const isCurrent = planModalCompany.plan === p.code
                    return (
                      <div
                        key={p.code}
                        onClick={() => setTargetPlan(p.code)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white text-xs flex items-center gap-1.5">
                            {p.title}
                            {isCurrent && (
                              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-normal">
                                Current
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                            {p.price}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{p.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">
                  Reason for Plan Modification <span className="text-red-400">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Upgraded to Business tier following verified payment confirmation..."
                  value={planReason}
                  onChange={(e) => setPlanReason(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>
            </CardContent>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2.5 bg-slate-950/80 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPlanModalCompany(null)}
                className="text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isUpdatingPlan || !planReason.trim()}
                onClick={handleChangePlan}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4"
              >
                {isUpdatingPlan ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Updating Plan...
                  </>
                ) : (
                  'Apply Plan Change'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 3. SUSPEND / REACTIVATE MODAL */}
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
