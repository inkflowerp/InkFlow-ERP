'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Clock,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Building2,
  Sliders,
  DollarSign,
  RefreshCw,
  X,
  Download,
  Check,
  Sparkles,
  Users,
  HardDrive,
  ShoppingBag,
  ShieldAlert,
  Calendar,
  AlertCircle,
  Layers,
  ArrowUpDown,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import {
  getPlatformSubscriptionsAction,
  getPlatformPlansAction,
} from '@/actions/platform-data.actions'
import {
  updateCompanySubscriptionAction,
  extendSubscriptionTrialAction,
  recordManualSubscriptionPaymentAction,
  updateCompanyStatusAction,
} from '@/actions/platform.actions'
import {
  PlatformSubscriptionRecord,
  PlatformSubscriptionsOverview,
  PlatformCompanyStatus,
  PlatformPlanCode,
} from '@/types/platform.types'
import { SubscriptionPlanRecord } from '@/types/subscription.types'
import { DEFAULT_PLANS } from '@/lib/subscription/subscription-constants'

export default function PlatformSubscriptionsPage() {
  const [data, setData] = useState<PlatformSubscriptionsOverview | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>(DEFAULT_PLANS)
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [intervalFilter, setIntervalFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'days' | 'mrr' | 'name' | 'created'>('days')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Modals state
  const [configuringSub, setConfiguringSub] = useState<PlatformSubscriptionRecord | null>(null)
  const [extendingTrialSub, setExtendingTrialSub] = useState<PlatformSubscriptionRecord | null>(null)
  const [recordingPaymentSub, setRecordingPaymentSub] = useState<PlatformSubscriptionRecord | null>(null)
  const [statusToggleSub, setStatusToggleSub] = useState<{
    sub: PlatformSubscriptionRecord
    targetStatus: PlatformCompanyStatus
  } | null>(null)

  // Form states for Configure Modal
  const [configPlan, setConfigPlan] = useState<string>('')
  const [configStatus, setConfigStatus] = useState<PlatformCompanyStatus>('active')
  const [configInterval, setConfigInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [configPeriodEnd, setConfigPeriodEnd] = useState<string>('')
  const [configTrialEnd, setConfigTrialEnd] = useState<string>('')
  const [configGateway, setConfigGateway] = useState<string>('')
  const [configPaymentRef, setConfigPaymentRef] = useState<string>('')
  const [configReason, setConfigReason] = useState<string>('')
  const [configCustomOverrides, setConfigCustomOverrides] = useState<{
    max_users?: number
    max_branches?: number
    storage_gb?: number
    monthly_orders?: number
    max_customers?: number
    max_products?: number
  }>({})
  const [showOverrideSection, setShowOverrideSection] = useState(false)

  // Form states for Extend Trial Modal
  const [extendDays, setExtendDays] = useState<number>(14)
  const [extendReason, setExtendReason] = useState<string>('')

  // Form states for Record Payment Modal
  const [paymentAmount, setPaymentAmount] = useState<number>(4999)
  const [paymentInterval, setPaymentInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [paymentGateway, setPaymentGateway] = useState<string>('bkash')
  const [paymentRef, setPaymentRef] = useState<string>('')
  const [paymentReason, setPaymentReason] = useState<string>('')
  const [paymentMonths, setPaymentMonths] = useState<number>(1)

  // Status toggle reason
  const [statusReason, setStatusReason] = useState<string>('')

  // Loading indicator for submissions
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Notifications
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // Load Data
  const loadData = async () => {
    setLoading(true)
    try {
      const [subsRes, plansRes] = await Promise.all([
        getPlatformSubscriptionsAction(),
        getPlatformPlansAction(),
      ])

      if (subsRes.success && subsRes.data) {
        setData(subsRes.data)
      } else {
        showToast(subsRes.error || 'Failed to load subscriptions', 'error')
      }

      if (plansRes.success && plansRes.data && plansRes.data.length > 0) {
        setPlans(plansRes.data)
      }
    } catch (err: any) {
      showToast(err?.message || 'Error communicating with server', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Open Configure Modal
  const handleOpenConfigure = (sub: PlatformSubscriptionRecord) => {
    setConfiguringSub(sub)
    setConfigPlan(sub.plan_code || sub.plan_id)
    setConfigStatus(sub.status)
    setConfigInterval(sub.billing_interval)
    setConfigPeriodEnd(sub.current_period_end ? sub.current_period_end.slice(0, 10) : '')
    setConfigTrialEnd(sub.trial_ends_at ? sub.trial_ends_at.slice(0, 10) : '')
    setConfigGateway(sub.payment_method_type || 'bkash')
    setConfigPaymentRef(sub.last_payment_reference || '')
    setConfigReason('')
    setConfigCustomOverrides(sub.custom_limits_override || {})
    setShowOverrideSection(!!sub.custom_limits_override && Object.keys(sub.custom_limits_override).length > 0)
  }

  // Save Configure Modal
  const handleSaveConfigure = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configuringSub) return
    setIsSubmitting(true)

    try {
      const cleanOverrides: Record<string, number> = {}
      if (showOverrideSection) {
        if (configCustomOverrides.max_users !== undefined && configCustomOverrides.max_users > 0) {
          cleanOverrides.max_users = Number(configCustomOverrides.max_users)
        }
        if (configCustomOverrides.max_branches !== undefined && configCustomOverrides.max_branches > 0) {
          cleanOverrides.max_branches = Number(configCustomOverrides.max_branches)
        }
        if (configCustomOverrides.storage_gb !== undefined && configCustomOverrides.storage_gb > 0) {
          cleanOverrides.storage_gb = Number(configCustomOverrides.storage_gb)
        }
        if (configCustomOverrides.monthly_orders !== undefined && configCustomOverrides.monthly_orders > 0) {
          cleanOverrides.monthly_orders = Number(configCustomOverrides.monthly_orders)
        }
        if (configCustomOverrides.max_customers !== undefined && configCustomOverrides.max_customers > 0) {
          cleanOverrides.max_customers = Number(configCustomOverrides.max_customers)
        }
        if (configCustomOverrides.max_products !== undefined && configCustomOverrides.max_products > 0) {
          cleanOverrides.max_products = Number(configCustomOverrides.max_products)
        }
      }

      const res = await updateCompanySubscriptionAction({
        companyId: configuringSub.company_id,
        planCodeOrId: configPlan,
        status: configStatus,
        billingInterval: configInterval,
        currentPeriodEnd: configPeriodEnd ? new Date(configPeriodEnd).toISOString() : undefined,
        trialEndsAt: configTrialEnd ? new Date(configTrialEnd).toISOString() : undefined,
        paymentMethodType: configGateway || undefined,
        lastPaymentReference: configPaymentRef || undefined,
        customLimitsOverride: showOverrideSection ? cleanOverrides : null,
        reason: configReason || 'Subscription governance modification by platform admin',
      })

      if (res.success) {
        showToast(`Subscription settings updated for "${configuringSub.company_name}".`)
        setConfiguringSub(null)
        await loadData()
      } else {
        showToast(res.error || 'Failed to update subscription', 'error')
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating subscription', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open Quick Extend Trial
  const handleOpenExtendTrial = (sub: PlatformSubscriptionRecord) => {
    setExtendingTrialSub(sub)
    setExtendDays(14)
    setExtendReason('')
  }

  // Submit Extend Trial
  const handleSaveExtendTrial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!extendingTrialSub) return
    setIsSubmitting(true)

    try {
      const res = await extendSubscriptionTrialAction(
        extendingTrialSub.company_id,
        extendDays,
        extendingTrialSub.is_trial ? 'trial' : 'period',
        extendReason || `Extended by ${extendDays} days from platform governance`
      )

      if (res.success) {
        showToast(`Extended ${extendingTrialSub.is_trial ? 'trial' : 'period'} by ${extendDays} days for "${extendingTrialSub.company_name}".`)
        setExtendingTrialSub(null)
        await loadData()
      } else {
        showToast(res.error || 'Failed to extend subscription', 'error')
      }
    } catch (err: any) {
      showToast(err?.message || 'Error extending trial', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open Record Payment
  const handleOpenRecordPayment = (sub: PlatformSubscriptionRecord) => {
    setRecordingPaymentSub(sub)
    const suggestedPrice = sub.billing_interval === 'yearly' ? sub.yearly_rate : (sub.monthly_rate || 4999)
    setPaymentAmount(suggestedPrice || 4999)
    setPaymentInterval(sub.billing_interval || 'monthly')
    setPaymentGateway('bkash')
    setPaymentRef(`TXN-${Date.now().toString().slice(-6)}`)
    setPaymentReason('Manual offline subscription renewal reconciliation')
    setPaymentMonths(sub.billing_interval === 'yearly' ? 12 : 1)
  }

  // Submit Record Payment
  const handleSaveRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recordingPaymentSub) return
    setIsSubmitting(true)

    try {
      const res = await recordManualSubscriptionPaymentAction(recordingPaymentSub.company_id, {
        amount: Number(paymentAmount),
        billingInterval: paymentInterval,
        paymentGateway,
        transactionRef: paymentRef,
        extendPeriodMonths: paymentMonths,
        reason: paymentReason,
      })

      if (res.success) {
        showToast(`Payment of ৳${paymentAmount} recorded for "${recordingPaymentSub.company_name}". Subscription active until renewal.`)
        setRecordingPaymentSub(null)
        await loadData()
      } else {
        showToast(res.error || 'Failed to record payment', 'error')
      }
    } catch (err: any) {
      showToast(err?.message || 'Error recording payment', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Status Toggle (Suspend / Reactivate)
  const handleConfirmStatusToggle = async () => {
    if (!statusToggleSub) return
    setIsSubmitting(true)

    try {
      const res = await updateCompanyStatusAction(
        statusToggleSub.sub.company_id,
        statusToggleSub.targetStatus,
        statusReason || `Platform governance status change to ${statusToggleSub.targetStatus}`
      )

      if (res.success) {
        showToast(`Tenant "${statusToggleSub.sub.company_name}" status updated to ${statusToggleSub.targetStatus}.`)
        setStatusToggleSub(null)
        setStatusReason('')
        await loadData()
      } else {
        showToast(res.error || 'Failed to update status', 'error')
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating status', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    if (!data?.subscriptions || data.subscriptions.length === 0) {
      showToast('No subscriptions available to export', 'error')
      return
    }

    const headers = [
      'Company Name',
      'Slug',
      'Owner Name',
      'Owner Email',
      'Owner Phone',
      'Plan',
      'Billing Interval',
      'Monthly Rate (BDT)',
      'Status',
      'Days Remaining',
      'Current Period Start',
      'Current Period End',
      'Trial Ends At',
      'Payment Gateway',
      'Payment Reference',
      'Users Usage',
      'Branches Usage',
      'Storage GB',
      'Orders Usage',
    ]

    const rows = data.subscriptions.map((s) => [
      `"${s.company_name.replace(/"/g, '""')}"`,
      `"${s.company_slug}"`,
      `"${s.owner_name.replace(/"/g, '""')}"`,
      `"${s.owner_email}"`,
      `"${s.owner_phone}"`,
      `"${s.plan_name}"`,
      `"${s.billing_interval}"`,
      s.monthly_rate,
      `"${s.status}"`,
      s.days_remaining,
      `"${s.current_period_start}"`,
      `"${s.current_period_end}"`,
      `"${s.trial_ends_at || ''}"`,
      `"${s.payment_method_type || ''}"`,
      `"${s.last_payment_reference || ''}"`,
      `"${s.users_count}/${s.users_limit}"`,
      `"${s.branches_count}/${s.branches_limit}"`,
      `"${s.storage_used_gb}/${s.storage_limit_gb} GB"`,
      `"${s.orders_this_month}/${s.orders_limit}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `printerp-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Subscriptions CSV report generated and downloaded.')
  }

  // Filtered & Sorted Subscriptions
  const filteredSubscriptions = useMemo(() => {
    if (!data?.subscriptions) return []
    let list = [...data.subscriptions]

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.company_name.toLowerCase().includes(q) ||
          s.company_slug.toLowerCase().includes(q) ||
          s.owner_name.toLowerCase().includes(q) ||
          s.owner_email.toLowerCase().includes(q) ||
          s.owner_phone.toLowerCase().includes(q) ||
          (s.last_payment_reference && s.last_payment_reference.toLowerCase().includes(q))
      )
    }

    // Status Tab filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'expiring_soon') {
        list = list.filter((s) => s.is_expiring_soon)
      } else if (statusFilter === 'trial') {
        list = list.filter((s) => s.is_trial || s.status === 'trial')
      } else if (statusFilter === 'active') {
        list = list.filter((s) => s.status === 'active' && !s.is_trial)
      } else if (statusFilter === 'past_due') {
        list = list.filter((s) => s.status === 'past_due' || s.is_past_due)
      } else {
        list = list.filter((s) => s.status === statusFilter)
      }
    }

    // Plan Filter
    if (planFilter !== 'all') {
      list = list.filter((s) => s.plan_code === planFilter || s.plan_id === planFilter)
    }

    // Interval Filter
    if (intervalFilter !== 'all') {
      list = list.filter((s) => s.billing_interval === intervalFilter)
    }

    // Sorting
    list.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'days') {
        comparison = a.days_remaining - b.days_remaining
      } else if (sortBy === 'mrr') {
        comparison = b.monthly_rate - a.monthly_rate
      } else if (sortBy === 'name') {
        comparison = a.company_name.localeCompare(b.company_name)
      } else if (sortBy === 'created') {
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return list
  }, [data, search, statusFilter, planFilter, intervalFilter, sortBy, sortOrder])

  const metrics = data?.metrics || {
    total_subscriptions: 0,
    total_mrr: 0,
    total_arr: 0,
    active_paid_count: 0,
    trial_count: 0,
    expiring_soon_count: 0,
    past_due_count: 0,
    suspended_count: 0,
    cancelled_count: 0,
    annual_subscribers_count: 0,
    monthly_subscribers_count: 0,
    arpa: 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            SaaS Subscriptions &amp; Recurring Revenue
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <CreditCard className="h-7 w-7 text-emerald-400" />
            Subscription Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Oversee tenant billing plans, MRR revenue metrics, expiry alerts, manual payment reconciliation, and custom quota overrides.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 h-9 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            <span>Export CSV</span>
          </button>

          <Link
            href="/platform/plans"
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 h-9 transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-purple-400" />
            <span>Plans Catalog</span>
          </Link>

          <Link
            href="/platform/billing"
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 h-9 transition-colors"
          >
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            <span>Reconciliation</span>
          </Link>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 h-9 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 border ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200 shadow-lg'
              : 'bg-red-950/90 border-red-700 text-red-200 shadow-lg'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* MRR & ARR Card */}
        <Card className="bg-slate-900 border-slate-800 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Monthly Recurring (MRR)</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">
            <CurrencyDisplay amount={metrics.total_mrr} />
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>ARR: <CurrencyDisplay amount={metrics.total_arr} /></span>
            <span className="text-emerald-400 font-mono font-bold">100% Live</span>
          </div>
        </Card>

        {/* Active Paid Tenants */}
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Active Paid Tenants</span>
            <Building2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{metrics.active_paid_count}</div>
          <div className="text-[11px] text-indigo-300 mt-1">
            {metrics.annual_subscribers_count} Annual • {metrics.monthly_subscribers_count} Monthly
          </div>
        </Card>

        {/* Free Trials Active */}
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Free Trials Active</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{metrics.trial_count}</div>
          <div className="text-[11px] text-cyan-400 mt-1">
            {metrics.total_subscriptions} total registered tenants
          </div>
        </Card>

        {/* Expiring Soon & Past Due */}
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Attention Needed</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {metrics.expiring_soon_count + metrics.past_due_count + metrics.suspended_count}
          </div>
          <div className="text-[11px] text-amber-300/80 mt-1">
            {metrics.expiring_soon_count} Expiring &le;7d • {metrics.past_due_count} Past Due • {metrics.suspended_count} Susp.
          </div>
        </Card>

        {/* ARPA Card */}
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Avg. Revenue (ARPA)</span>
            <DollarSign className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">
            <CurrencyDisplay amount={metrics.arpa} />
          </div>
          <div className="text-[11px] text-purple-300 mt-1">
            Per active paying account
          </div>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 lg:pb-0 scrollbar-thin">
            {[
              { id: 'all', label: 'All Subscriptions', count: metrics.total_subscriptions },
              { id: 'active', label: 'Active Paid', count: metrics.active_paid_count },
              { id: 'trial', label: 'Free Trial', count: metrics.trial_count },
              { id: 'expiring_soon', label: 'Expiring Soon', count: metrics.expiring_soon_count },
              { id: 'past_due', label: 'Past Due', count: metrics.past_due_count },
              { id: 'suspended', label: 'Suspended', count: metrics.suspended_count },
              { id: 'cancelled', label: 'Cancelled', count: metrics.cancelled_count },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    statusFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              placeholder="Search by company, slug, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-indigo-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-white text-xs cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Plan Tier Selector */}
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>Plan:</span>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-xs capitalize"
              >
                <option value="all">All Plans</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Billing Interval Selector */}
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>Interval:</span>
              <select
                value={intervalFilter}
                onChange={(e) => setIntervalFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-xs capitalize"
              >
                <option value="all">All Intervals</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly (Annual)</option>
              </select>
            </div>
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-xs"
            >
              <option value="days">Renewal Deadline / Expiry</option>
              <option value="mrr">Monthly Rate (Highest)</option>
              <option value="name">Company Name (A-Z)</option>
              <option value="created">Registration Date (Newest)</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="h-7 w-7 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              title={`Toggle sort order (${sortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-xl">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Tenant Company</th>
                <th className="py-3 px-4">Plan &amp; Interval</th>
                <th className="py-3 px-4">Rate (BDT)</th>
                <th className="py-3 px-4">Status &amp; Timeline</th>
                <th className="py-3 px-4">Resource Limits</th>
                <th className="py-3 px-4">Payment Info</th>
                <th className="py-3 px-4 text-right">Governance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading platform subscriptions and telemetry...</span>
                  </td>
                </tr>
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Building2 className="h-8 w-8 mx-auto mb-2 text-slate-700" />
                    <p className="font-semibold text-slate-400">No subscriptions match the selected criteria.</p>
                    <p className="text-xs mt-1">Try changing filters or search terms.</p>
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((s) => {
                  const hasCustomOverrides = s.custom_limits_override && Object.keys(s.custom_limits_override).length > 0
                  const userUsagePct = s.users_limit > 0 ? Math.round((s.users_count / s.users_limit) * 100) : 0

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Tenant Company Details */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/platform/companies/${s.company_id}`}
                          className="font-bold text-white hover:text-indigo-400 text-sm flex items-center gap-1.5"
                        >
                          <span>{s.company_name}</span>
                          <ExternalLink className="h-3 w-3 text-slate-500 opacity-60 hover:opacity-100" />
                        </Link>
                        <div className="text-[11px] font-mono text-indigo-400">
                          {s.company_slug}.printerp.com.bd
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {s.owner_name} • {s.owner_phone}
                        </div>
                      </td>

                      {/* Plan & Interval */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`capitalize px-2 py-0.5 rounded text-[10px] font-bold border ${
                              s.plan_code === 'enterprise'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : s.plan_code === 'business'
                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                : s.plan_code === 'starter'
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                            }`}
                          >
                            {s.plan_name}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize font-mono">
                            ({s.billing_interval})
                          </span>
                        </div>
                        {hasCustomOverrides && (
                          <div className="mt-1">
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold inline-flex items-center gap-1">
                              <Sparkles className="h-2.5 w-2.5" />
                              Custom Quotas
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Rate (BDT) */}
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-white text-sm">
                          <CurrencyDisplay amount={s.monthly_rate} />
                          <span className="text-[10px] text-slate-400 font-normal"> /mo</span>
                        </div>
                        {s.billing_interval === 'yearly' && (
                          <div className="text-[10px] text-indigo-400 mt-0.5">
                            <CurrencyDisplay amount={s.yearly_rate} /> /yr billed
                          </div>
                        )}
                      </td>

                      {/* Status & Timeline */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              s.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : s.status === 'trial'
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                : s.status === 'past_due'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                                : s.status === 'suspended'
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : 'bg-slate-700/40 text-slate-400 border-slate-700'
                            }`}
                          >
                            {s.status.replace('_', ' ')}
                          </span>

                          {/* Expiry / Countdown indicator */}
                          {s.status === 'trial' ? (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                s.days_remaining <= 3
                                  ? 'bg-red-950 text-red-300 font-bold border border-red-800'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {s.days_remaining >= 0
                                ? `${s.days_remaining}d left`
                                : `Expired ${Math.abs(s.days_remaining)}d ago`}
                            </span>
                          ) : s.status === 'active' ? (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                s.days_remaining <= 7
                                  ? 'bg-amber-950 text-amber-300 font-bold border border-amber-800'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              Renews in {s.days_remaining}d
                            </span>
                          ) : null}
                        </div>

                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {s.is_trial && s.trial_ends_at
                              ? `Trial: ${new Date(s.trial_ends_at).toLocaleDateString()}`
                              : `Period End: ${new Date(s.current_period_end).toLocaleDateString()}`}
                          </span>
                        </div>
                      </td>

                      {/* Quota & Resource Usage */}
                      <td className="py-3 px-4 text-slate-300">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span>Users: <strong className="text-white">{s.users_count}</strong>/{s.users_limit}</span>
                            <span className="text-[10px] text-slate-400">{userUsagePct}%</span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                userUsagePct >= 90
                                  ? 'bg-red-500'
                                  : userUsagePct >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.min(userUsagePct, 100)}%` }}
                            />
                          </div>

                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{s.branches_count}/{s.branches_limit} branches</span>
                            <span>•</span>
                            <span>{s.orders_this_month}/{s.orders_limit} orders</span>
                          </div>
                        </div>
                      </td>

                      {/* Payment & Gateway */}
                      <td className="py-3 px-4">
                        {s.is_trial ? (
                          <span className="text-[10px] text-cyan-400 font-mono">14-day Evaluation</span>
                        ) : (
                          <div>
                            <span className="capitalize px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-emerald-300 border border-slate-700">
                              {s.payment_method_type || 'bKash'}
                            </span>
                            {s.last_payment_reference && (
                              <div className="text-[10px] font-mono text-slate-400 mt-1 truncate max-w-[130px]" title={s.last_payment_reference}>
                                Ref: {s.last_payment_reference}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Governance Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Configure Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenConfigure(s)}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-100 hover:text-white border border-slate-700 shadow-sm transition-colors cursor-pointer"
                            title="Configure plan, interval, status & custom limits"
                          >
                            <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                            <span>Configure</span>
                          </button>

                          {/* Quick Extend Trial / Period */}
                          <button
                            type="button"
                            onClick={() => handleOpenExtendTrial(s)}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 hover:text-cyan-100 border border-cyan-700/80 shadow-sm transition-colors cursor-pointer"
                            title="Extend trial or period by N days"
                          >
                            <Clock className="h-3.5 w-3.5 text-cyan-400" />
                            <span>Extend</span>
                          </button>

                          {/* Record Payment Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenRecordPayment(s)}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 hover:text-emerald-100 border border-emerald-700/80 shadow-sm transition-colors cursor-pointer"
                            title="Record manual offline payment settlement"
                          >
                            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Pay</span>
                          </button>

                          {/* Suspend / Reactivate Toggle */}
                          {s.status === 'suspended' ? (
                            <button
                              type="button"
                              onClick={() => setStatusToggleSub({ sub: s, targetStatus: 'active' })}
                              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 hover:text-emerald-100 border border-emerald-700/80 shadow-sm transition-colors cursor-pointer"
                              title="Reactivate suspended tenant"
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Reactivate</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setStatusToggleSub({ sub: s, targetStatus: 'suspended' })}
                              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold bg-red-950/80 hover:bg-red-900 text-red-200 hover:text-red-100 border border-red-700/80 shadow-sm transition-colors cursor-pointer"
                              title="Suspend tenant access"
                            >
                              <Ban className="h-3.5 w-3.5 text-red-400" />
                              <span>Suspend</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 1. EDIT / CONFIGURE SUBSCRIPTION MODAL */}
      {/* ========================================================================= */}
      {configuringSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400" />
                <span>Configure Subscription: {configuringSub.company_name}</span>
              </div>
              <button
                onClick={() => setConfiguringSub(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfigure} className="space-y-4 text-xs">
              {/* Plan Selection */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Subscription Plan</label>
                <select
                  value={configPlan}
                  onChange={(e) => setConfigPlan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-semibold capitalize focus:border-indigo-500"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.name} {p.code === 'trial' ? '(৳0/mo - 14 Days Evaluation)' : `(৳${p.price_monthly}/mo)`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status & Billing Interval Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Subscription Status</label>
                  <select
                    value={configStatus}
                    onChange={(e) => setConfigStatus(e.target.value as PlatformCompanyStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-semibold capitalize"
                  >
                    <option value="trial">Trial (Evaluation Mode)</option>
                    <option value="active">Active (Standard Paid)</option>
                    <option value="past_due">Past Due (Payment Pending)</option>
                    <option value="grace_period">Grace Period</option>
                    <option value="suspended">Suspended (Access Blocked)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Billing Interval</label>
                  <select
                    value={configInterval}
                    onChange={(e) => setConfigInterval(e.target.value as 'monthly' | 'yearly')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-semibold"
                  >
                    <option value="monthly">Monthly Recurring (30 Days)</option>
                    <option value="yearly">Yearly / Annual (365 Days)</option>
                  </select>
                </div>
              </div>

              {/* Timeline Expiry Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Current Period End Date</label>
                  <Input
                    type="date"
                    value={configPeriodEnd}
                    onChange={(e) => setConfigPeriodEnd(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Trial Expiry Date</label>
                  <Input
                    type="date"
                    value={configTrialEnd}
                    onChange={(e) => setConfigTrialEnd(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                  />
                </div>
              </div>

              {/* Payment Gateway & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Payment Method / Gateway</label>
                  <select
                    value={configGateway}
                    onChange={(e) => setConfigGateway(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-xs capitalize"
                  >
                    <option value="bkash">bKash (Merchant / Direct)</option>
                    <option value="nagad">Nagad</option>
                    <option value="sslcommerz">SSLCommerz</option>
                    <option value="bank_wire">Bank Wire / EFTN</option>
                    <option value="cash">Cash / Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Last Payment Reference / TxID</label>
                  <Input
                    placeholder="e.g. TXN-8921829"
                    value={configPaymentRef}
                    onChange={(e) => setConfigPaymentRef(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white text-xs h-9 font-mono"
                  />
                </div>
              </div>

              {/* Custom Resource Limits Overrides Toggle */}
              <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span className="font-bold text-white text-xs">Custom Quota Limits Overrides</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOverrideSection(!showOverrideSection)}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-950/90 hover:bg-indigo-900 text-indigo-200 hover:text-white border border-indigo-700/80 shadow-sm transition-colors cursor-pointer"
                  >
                    {showOverrideSection ? 'Disable / Reset Overrides' : 'Configure Custom Limits'}
                  </button>
                </div>

                {showOverrideSection && (
                  <div className="space-y-3 pt-2 border-t border-slate-800 animate-in fade-in">
                    <p className="text-[11px] text-slate-400">
                      Override plan default maximum quotas specifically for this VIP or enterprise tenant:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-slate-400 text-[10px] block mb-0.5">Max Users</label>
                        <Input
                          type="number"
                          value={configCustomOverrides.max_users ?? configuringSub.users_limit}
                          onChange={(e) =>
                            setConfigCustomOverrides({
                              ...configCustomOverrides,
                              max_users: Number(e.target.value),
                            })
                          }
                          className="bg-slate-900 border-slate-700 text-white text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px] block mb-0.5">Max Branches</label>
                        <Input
                          type="number"
                          value={configCustomOverrides.max_branches ?? configuringSub.branches_limit}
                          onChange={(e) =>
                            setConfigCustomOverrides({
                              ...configCustomOverrides,
                              max_branches: Number(e.target.value),
                            })
                          }
                          className="bg-slate-900 border-slate-700 text-white text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px] block mb-0.5">Storage GB</label>
                        <Input
                          type="number"
                          value={configCustomOverrides.storage_gb ?? configuringSub.storage_limit_gb}
                          onChange={(e) =>
                            setConfigCustomOverrides({
                              ...configCustomOverrides,
                              storage_gb: Number(e.target.value),
                            })
                          }
                          className="bg-slate-900 border-slate-700 text-white text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px] block mb-0.5">Monthly Orders</label>
                        <Input
                          type="number"
                          value={configCustomOverrides.monthly_orders ?? configuringSub.orders_limit}
                          onChange={(e) =>
                            setConfigCustomOverrides({
                              ...configCustomOverrides,
                              monthly_orders: Number(e.target.value),
                            })
                          }
                          className="bg-slate-900 border-slate-700 text-white text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px] block mb-0.5">Max Customers</label>
                        <Input
                          type="number"
                          value={configCustomOverrides.max_customers ?? configuringSub.customers_limit}
                          onChange={(e) =>
                            setConfigCustomOverrides({
                              ...configCustomOverrides,
                              max_customers: Number(e.target.value),
                            })
                          }
                          className="bg-slate-900 border-slate-700 text-white text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px] block mb-0.5">Max Products</label>
                        <Input
                          type="number"
                          value={configCustomOverrides.max_products ?? configuringSub.products_limit}
                          onChange={(e) =>
                            setConfigCustomOverrides({
                              ...configCustomOverrides,
                              max_products: Number(e.target.value),
                            })
                          }
                          className="bg-slate-900 border-slate-700 text-white text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Justification Notes */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Audit Trail Justification / Reason</label>
                <textarea
                  rows={2}
                  value={configReason}
                  onChange={(e) => setConfigReason(e.target.value)}
                  placeholder="e.g. Upgraded to Business Plan upon contract signing..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfiguringSub(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Settings...' : 'Apply Subscription Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. QUICK EXTEND TRIAL MODAL */}
      {/* ========================================================================= */}
      {extendingTrialSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span>Extend Evaluation: {extendingTrialSub.company_name}</span>
              </div>
              <button
                onClick={() => setExtendingTrialSub(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExtendTrial} className="space-y-4 text-xs">
              <p className="text-slate-300">
                Extend evaluation trial period for this prospect to allow continued software onboarding:
              </p>

              <div className="grid grid-cols-3 gap-2">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setExtendDays(days)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      extendDays === days
                        ? 'bg-cyan-600 border-cyan-500 text-white shadow-xs'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    +{days} Days
                  </button>
                ))}
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Custom Days to Add</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={extendDays}
                  onChange={(e) => setExtendDays(Number(e.target.value))}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Reason / Notes</label>
                <Input
                  placeholder="e.g. Extended for owner review meeting..."
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setExtendingTrialSub(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Extending...' : `Extend by ${extendDays} Days`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. RECORD MANUAL PAYMENT MODAL */}
      {/* ========================================================================= */}
      {recordingPaymentSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span>Record Payment: {recordingPaymentSub.company_name}</span>
              </div>
              <button
                onClick={() => setRecordingPaymentSub(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecordPayment} className="space-y-3.5 text-xs">
              <p className="text-slate-300">
                Reconcile manual or offline subscription payments received via bank transfer or direct mobile gateway:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Amount Paid (BDT)</label>
                  <Input
                    type="number"
                    min={0}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="bg-slate-950 border-slate-700 text-white text-xs h-9 font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Billing Interval</label>
                  <select
                    value={paymentInterval}
                    onChange={(e) => setPaymentInterval(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-xs"
                  >
                    <option value="monthly">Monthly Plan</option>
                    <option value="yearly">Yearly (Annual)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Gateway / Channel</label>
                  <select
                    value={paymentGateway}
                    onChange={(e) => setPaymentGateway(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-xs capitalize"
                  >
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="sslcommerz">SSLCommerz</option>
                    <option value="bank_wire">Bank Wire / EFTN</option>
                    <option value="cash">Cash / Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Advance Period (Months)</label>
                  <Input
                    type="number"
                    min={1}
                    max={36}
                    value={paymentMonths}
                    onChange={(e) => setPaymentMonths(Number(e.target.value))}
                    className="bg-slate-950 border-slate-700 text-white text-xs h-9 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Transaction ID / Cheque Ref</label>
                <Input
                  required
                  placeholder="e.g. TXN-9281928"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-9 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Notes</label>
                <Input
                  placeholder="e.g. Advance 3-month payment confirmed in Dutch-Bangla account"
                  value={paymentReason}
                  onChange={(e) => setPaymentReason(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRecordingPaymentSub(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : `Record ৳${paymentAmount} & Activate`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUSPEND / REACTIVATE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {statusToggleSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                {statusToggleSub.targetStatus === 'suspended' ? (
                  <Ban className="h-4 w-4 text-red-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                )}
                <span>
                  {statusToggleSub.targetStatus === 'suspended' ? 'Suspend Tenant Access' : 'Reactivate Tenant Access'}
                </span>
              </div>
              <button
                onClick={() => setStatusToggleSub(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Are you sure you want to set <strong>{statusToggleSub.sub.company_name}</strong> to{' '}
                <strong className={statusToggleSub.targetStatus === 'suspended' ? 'text-red-400' : 'text-emerald-400'}>
                  {statusToggleSub.targetStatus}
                </strong>
                ?
              </p>

              {statusToggleSub.targetStatus === 'suspended' && (
                <div className="p-3 bg-red-950/50 border border-red-900/60 rounded-xl text-red-200 text-[11px] flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    Suspending a tenant immediately blocks all company users from logging in and accessing POS, production, and billing.
                  </span>
                </div>
              )}

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Reason for Status Change</label>
                <Input
                  required
                  placeholder="e.g. Non-payment of subscription invoice after grace period..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStatusToggleSub(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStatusToggle}
                  disabled={isSubmitting}
                  className={`px-5 py-2 rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50 text-white ${
                    statusToggleSub.targetStatus === 'suspended'
                      ? 'bg-red-600 hover:bg-red-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {isSubmitting
                    ? 'Updating...'
                    : statusToggleSub.targetStatus === 'suspended'
                    ? 'Confirm Suspension'
                    : 'Confirm Reactivation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
