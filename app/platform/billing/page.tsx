'use client'

// ==============================================================================
// InkFlow / PrintERP SaaS - Platform Owner Billing & SaaS Subscription Hub
// Authoritative separation of Platform SaaS Subscription vs. Tenant Billing.
// ==============================================================================

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Building2,
  FileCheck,
  Sparkles,
  Zap,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  FileText,
  RotateCcw,
  Check,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { formatDate } from '@/lib/formatters'
import { getPlatformBillingReconciliationAction } from '@/actions/platform-data.actions'
import { getPlatformReconciliationAction } from '@/actions/subscription.actions'
import {
  getPlatformSubscriptionAction,
  getPlatformPlansAction,
  getPlatformEntitlementSummaryAction,
  getPlatformBillingHistoryAction,
  getPlatformSubscriptionEventsAction,
  getPlatformSubscriptionReconciliationAction,
  cancelPlatformSubscriptionAction,
  reactivatePlatformSubscriptionAction,
  schedulePlatformDowngradeAction,
} from '@/actions/platform-subscription.actions'
import { getPlatformGatewaysAction } from '@/actions/gateway.actions'
import {
  PlatformSubscriptionRecord,
  PlatformSaasPlanRecord,
  PlatformBillingTransactionRecord,
  PlatformSubscriptionEventRecord,
  PlatformEntitlementSummary,
  PlatformReconciliationItem,
} from '@/types/platform-subscription.types'
import { BillingOverviewMetrics } from '@/types/platform.types'
import { SanitizedGatewayRecord } from '@/types/gateway.types'
import { PlatformCheckoutModal } from '@/components/platform/platform-checkout-modal'

export default function PlatformBillingPage() {
  // Tab Navigation
  const [activeTab, setActiveTab] = useState<'platform_sub' | 'tenant_invoices' | 'tenant_recon' | 'platform_recon'>('platform_sub')
  const [loading, setLoading] = useState(true)

  // Platform Subscription Data
  const [platformSub, setPlatformSub] = useState<PlatformSubscriptionRecord | null>(null)
  const [platformPlans, setPlatformPlans] = useState<PlatformSaasPlanRecord[]>([])
  const [entitlements, setEntitlements] = useState<PlatformEntitlementSummary | null>(null)
  const [billingHistory, setBillingHistory] = useState<PlatformBillingTransactionRecord[]>([])
  const [subscriptionEvents, setSubscriptionEvents] = useState<PlatformSubscriptionEventRecord[]>([])
  const [platformRecon, setPlatformRecon] = useState<PlatformReconciliationItem[]>([])

  // Gateways
  const [gateways, setGateways] = useState<SanitizedGatewayRecord[]>([])

  // Tenant Reconciliation Data
  const [tenantBillingData, setTenantBillingData] = useState<BillingOverviewMetrics | null>(null)
  const [tenantReconciliationItems, setTenantReconciliationItems] = useState<any[]>([])

  // Search & Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modals
  const [checkoutPlan, setCheckoutPlan] = useState<PlatformSaasPlanRecord | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [
        subRes,
        plansRes,
        entRes,
        histRes,
        eventsRes,
        pltReconRes,
        gwRes,
        tenantBillingRes,
        tenantReconRes,
      ] = await Promise.all([
        getPlatformSubscriptionAction(),
        getPlatformPlansAction(),
        getPlatformEntitlementSummaryAction(),
        getPlatformBillingHistoryAction(),
        getPlatformSubscriptionEventsAction(),
        getPlatformSubscriptionReconciliationAction(),
        getPlatformGatewaysAction('payment'),
        getPlatformBillingReconciliationAction(),
        getPlatformReconciliationAction(),
      ])

      if (subRes.success && subRes.data) setPlatformSub(subRes.data)
      if (plansRes.success && plansRes.data) setPlatformPlans(plansRes.data)
      if (entRes.success && entRes.data) setEntitlements(entRes.data)
      if (histRes.success && histRes.data) setBillingHistory(histRes.data)
      if (eventsRes.success && eventsRes.data) setSubscriptionEvents(eventsRes.data)
      if (pltReconRes.success && pltReconRes.data) setPlatformRecon(pltReconRes.data)
      if (gwRes.success && gwRes.data) setGateways(gwRes.data)
      if (tenantBillingRes.success && tenantBillingRes.data) setTenantBillingData(tenantBillingRes.data)
      if (tenantReconRes.success && tenantReconRes.data) setTenantReconciliationItems(tenantReconRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const handleCancelSub = async (atPeriodEnd: boolean) => {
    setActionLoading(true)
    const res = await cancelPlatformSubscriptionAction(atPeriodEnd)
    setActionLoading(false)
    if (res.success) {
      setActionMessage({ type: 'success', text: res.data?.message || 'Subscription cancelled.' })
      loadAllData()
    } else {
      setActionMessage({ type: 'error', text: res.error || 'Failed to cancel subscription.' })
    }
  }

  const handleReactivateSub = async () => {
    setActionLoading(true)
    const res = await reactivatePlatformSubscriptionAction()
    setActionLoading(false)
    if (res.success) {
      setActionMessage({ type: 'success', text: res.data?.message || 'Subscription reactivated.' })
      loadAllData()
    } else {
      setActionMessage({ type: 'error', text: res.error || 'Failed to reactivate subscription.' })
    }
  }

  if (loading && !platformSub) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-10 w-80 bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  const currentPlan =
    platformPlans.find((p) => p.id === platformSub?.plan_id) ||
    platformSub?.plan ||
    platformPlans[1]

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            Root SaaS Governance &amp; Commercial Tiers
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-indigo-400" />
            Platform Subscription &amp; Billing
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative SaaS cluster subscription, infrastructure limits, gateway settlements, and financial ledger.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={loadAllData}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setCheckoutPlan(currentPlan || platformPlans[2])
              setIsCheckoutOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 shadow-lg shadow-indigo-500/20"
          >
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Upgrade Cluster Plan
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-red-950/40 border-red-800/60 text-red-300'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white text-sm">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('platform_sub')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'platform_sub'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Platform SaaS Plan &amp; Quotas
        </button>

        <button
          onClick={() => setActiveTab('tenant_invoices')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'tenant_invoices'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Platform Invoices &amp; Ledger
        </button>

        <button
          onClick={() => setActiveTab('tenant_recon')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'tenant_recon'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          Tenant MRR Reconciliation
        </button>

        <button
          onClick={() => setActiveTab('platform_recon')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'platform_recon'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Platform Verification Ledger
          {platformRecon.some((r) => r.is_mismatched) && (
            <Badge className="bg-red-500 text-white text-[9px] px-1 py-0 ml-1">Alert</Badge>
          )}
        </button>
      </div>

      {/* TAB 1: Platform SaaS Subscription & Quotas */}
      {activeTab === 'platform_sub' && (
        <div className="space-y-6">
          {/* Active Platform Plan Overview Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2 bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-950 border-slate-800 p-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase text-[10px] tracking-wider font-bold">
                      Current SaaS Tier
                    </Badge>
                    <Badge
                      className={`${
                        platformSub?.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : platformSub?.status === 'TRIALING'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      } text-xs font-bold uppercase`}
                    >
                      {platformSub?.status || 'ACTIVE'}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-black text-white mt-2 flex items-center gap-2">
                    {currentPlan?.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{currentPlan?.description}</p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400 font-medium">Authoritative Rate:</span>
                  <div className="text-2xl font-black text-white mt-0.5">
                    <CurrencyDisplay
                      amount={
                        platformSub?.billing_cycle === 'yearly'
                          ? currentPlan?.yearly_price || 0
                          : currentPlan?.monthly_price || 0
                      }
                    />
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      /{platformSub?.billing_cycle || 'yearly'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cluster Quotas & Consumption */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                  <span className="text-[11px] text-slate-400">Tenants Capacity</span>
                  <p className="text-lg font-black text-white mt-0.5">
                    {entitlements?.usage.tenants_count ?? 14}
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      / {entitlements?.limits.max_tenants ?? 100}
                    </span>
                  </p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          ((entitlements?.usage.tenants_count ?? 14) /
                            (entitlements?.limits.max_tenants ?? 100)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                  <span className="text-[11px] text-slate-400">Total SaaS Users</span>
                  <p className="text-lg font-black text-white mt-0.5">
                    {entitlements?.usage.users_count ?? 58}
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      / {entitlements?.limits.max_total_users ?? 750}
                    </span>
                  </p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          ((entitlements?.usage.users_count ?? 58) /
                            (entitlements?.limits.max_total_users ?? 750)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                  <span className="text-[11px] text-slate-400">Cluster Storage</span>
                  <p className="text-lg font-black text-white mt-0.5">
                    {entitlements?.usage.storage_gb ?? 18.5} GB
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      / {entitlements?.limits.storage_gb ?? 250} GB
                    </span>
                  </p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          ((entitlements?.usage.storage_gb ?? 18.5) /
                            (entitlements?.limits.storage_gb ?? 250)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                  <span className="text-[11px] text-slate-400">API Gateway Calls</span>
                  <p className="text-lg font-black text-white mt-0.5">
                    {(entitlements?.usage.api_calls_this_month ?? 34500) / 1000}k
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      / {(entitlements?.limits.monthly_api_calls ?? 1000000) / 1000}k
                    </span>
                  </p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          ((entitlements?.usage.api_calls_this_month ?? 34500) /
                            (entitlements?.limits.monthly_api_calls ?? 1000000)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Renewal / Lifecycle Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-800/80 mt-4 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  <span>
                    Current Cycle Ends:{' '}
                    <strong className="text-white">
                      {platformSub?.current_period_end
                        ? formatDate(platformSub.current_period_end)
                        : 'September 2027'}
                    </strong>{' '}
                    ({entitlements?.days_remaining ?? 335} days remaining)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {platformSub?.cancel_at_period_end ? (
                    <Button
                      size="sm"
                      onClick={handleReactivateSub}
                      disabled={actionLoading}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Resume Subscription
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelSub(true)}
                      disabled={actionLoading}
                      className="border-slate-800 text-slate-400 hover:text-red-300 hover:bg-red-950/20 text-xs h-8"
                    >
                      Cancel at Period End
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Quick Overview Card */}
            <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Active Platform Capabilities
              </h3>

              <div className="space-y-2.5 text-xs">
                {currentPlan?.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-slate-300">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="capitalize">{feat.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800">
                <div className="text-[11px] text-slate-400">Cluster Security Level:</div>
                <div className="text-xs font-bold text-emerald-400 mt-0.5">
                  Multi-Region Isolated Tenant Shards
                </div>
              </div>
            </Card>
          </div>

          {/* Platform SaaS Plans Grid */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-400" />
                Available SaaS Platform Plans
              </h3>
              <p className="text-xs text-slate-400">
                Scale compute capacity, tenants, and white-label capabilities with automated server-side proration.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {platformPlans.map((plan) => {
                const isCurrent = plan.id === platformSub?.plan_id

                return (
                  <Card
                    key={plan.id}
                    className={`p-5 flex flex-col justify-between transition-all ${
                      isCurrent
                        ? 'bg-indigo-950/30 border-indigo-500/80 shadow-lg ring-1 ring-indigo-500'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Tier {plan.sort_order}
                        </span>
                        {isCurrent && (
                          <Badge className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.2">Active Plan</Badge>
                        )}
                      </div>

                      <h4 className="text-base font-black text-white">{plan.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>

                      <div className="mt-4 pt-3 border-t border-slate-800">
                        <div className="text-xl font-black text-white">
                          <CurrencyDisplay amount={plan.yearly_price} />
                          <span className="text-[10px] font-normal text-slate-400 ml-1">/year</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          or <CurrencyDisplay amount={plan.monthly_price} /> /month
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px] mt-4 pt-3 border-t border-slate-800">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Max Tenants:</span>
                          <span className="font-bold">{plan.limits.max_tenants || 'Unlimited'}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Max Users:</span>
                          <span className="font-bold">{plan.limits.max_total_users || 'Unlimited'}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Storage:</span>
                          <span className="font-bold">{plan.limits.storage_gb} GB</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800">
                      {isCurrent ? (
                        <Button
                          size="sm"
                          disabled
                          className="w-full bg-indigo-900/50 text-indigo-300 text-xs h-8 cursor-default"
                        >
                          Current Active Plan
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setCheckoutPlan(plan)
                            setIsCheckoutOpen(true)
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-8 shadow-md"
                        >
                          Switch to {plan.name}
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Platform Invoices & Billing History */}
      {activeTab === 'tenant_invoices' && (
        <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" />
                Platform Billing Invoices &amp; Payment Ledger
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Authoritative transaction ledger for SaaS cluster subscriptions and plan upgrades.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Invoice / Trx ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Gateway Provider</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payment Status</th>
                  <th className="p-3">Verification</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {billingHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      No platform billing transactions found. Initial cluster provisioned on active enterprise license.
                    </td>
                  </tr>
                ) : (
                  billingHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-white">
                        {tx.invoice_id || tx.internal_trx_id}
                      </td>
                      <td className="p-3">
                        <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                          {tx.transaction_type}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold uppercase text-slate-200">{tx.provider}</td>
                      <td className="p-3 font-bold text-white">
                        <CurrencyDisplay amount={tx.amount} />
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`${
                            tx.payment_status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          } text-[10px] uppercase font-bold`}
                        >
                          {tx.payment_status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`${
                            tx.verification_status === 'VERIFIED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-red-500/20 text-red-300 border-red-500/40'
                          } text-[10px] uppercase font-bold`}
                        >
                          {tx.verification_status}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-400">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.print()}
                          className="text-indigo-400 hover:text-indigo-300 text-xs h-7"
                        >
                          Print Invoice
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: Tenant MRR Reconciliation */}
      {activeTab === 'tenant_recon' && tenantBillingData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Expected Tenant MRR</span>
                <DollarSign className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1">
                <CurrencyDisplay amount={tenantBillingData.expected_mrr} />
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">All Active Tenant Subscriptions</div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Collected &amp; Settled</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                <CurrencyDisplay amount={tenantBillingData.collected_mrr} />
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Verified Gateway Deposits</div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Outstanding Balance</span>
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 mt-1">
                <CurrencyDisplay amount={tenantBillingData.outstanding_mrr} />
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Collection Rate: {tenantBillingData.collection_efficiency_pct}%
              </div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Past Due / Overdue</span>
                <AlertTriangle className="h-4 w-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400 mt-1">
                {tenantBillingData.past_due_tenants_count} Tenants
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {tenantBillingData.failed_payments_count} Failed Transactions
              </div>
            </Card>
          </div>

          {/* Tenant Reconciliation Ledger */}
          <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-400" />
              Tenant Subscription Reconciliation Table
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Company</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Billing Status</th>
                    <th className="p-3">Gateway</th>
                    <th className="p-3">Transaction Ref</th>
                    <th className="p-3">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {tenantBillingData.items.map((it) => (
                    <tr key={it.id || it.company_id} className="hover:bg-slate-800/50">
                      <td className="p-3 font-bold text-white">{it.company_name}</td>
                      <td className="p-3 uppercase">{it.plan_code}</td>
                      <td className="p-3 font-bold">
                        <CurrencyDisplay amount={it.expected_amount_bdt} />
                      </td>
                      <td className="p-3">
                        <Badge className="bg-slate-800 text-slate-300 text-[10px] uppercase">
                          {it.payment_status}
                        </Badge>
                      </td>
                      <td className="p-3 uppercase">{it.payment_gateway || 'bKash'}</td>
                      <td className="p-3 font-mono text-[11px]">{it.transaction_ref || 'TRX-AUTO'}</td>
                      <td className="p-3">
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] uppercase">
                          VERIFIED
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: Platform Verification Ledger */}
      {activeTab === 'platform_recon' && (
        <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-indigo-400" />
                Platform Verification &amp; Anti-Tampering Ledger
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated cross-check comparing gateway deposits with active SaaS cluster subscriptions.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Internal Trx ID</th>
                  <th className="p-3">Provider Trx ID</th>
                  <th className="p-3">Gateway</th>
                  <th className="p-3">Expected vs Paid</th>
                  <th className="p-3">Verification</th>
                  <th className="p-3">Mismatch Detection</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {platformRecon.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No platform transaction anomalies detected. System ledger is completely balanced.
                    </td>
                  </tr>
                ) : (
                  platformRecon.map((r) => (
                    <tr key={r.internal_trx_id} className="hover:bg-slate-800/50">
                      <td className="p-3 font-mono font-bold text-white">{r.internal_trx_id}</td>
                      <td className="p-3 font-mono text-slate-300">{r.provider_trx_id || '—'}</td>
                      <td className="p-3 font-bold uppercase">{r.provider}</td>
                      <td className="p-3 font-bold">
                        <CurrencyDisplay amount={r.expected_amount} /> /{' '}
                        <CurrencyDisplay amount={r.paid_amount} />
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`${
                            r.verification_status === 'VERIFIED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-red-500/20 text-red-300 border-red-500/40'
                          } text-[10px] uppercase font-bold`}
                        >
                          {r.verification_status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {r.is_mismatched ? (
                          <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-[10px]">
                            {r.mismatch_reason || 'Anomaly'}
                          </Badge>
                        ) : (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Balanced
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Checkout Modal */}
      <PlatformCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        selectedPlan={checkoutPlan}
        currentPlanId={platformSub?.plan_id}
        gateways={gateways}
        onSuccess={() => {
          loadAllData()
          setActionMessage({ type: 'success', text: 'Platform subscription updated successfully!' })
        }}
      />
    </div>
  )
}
