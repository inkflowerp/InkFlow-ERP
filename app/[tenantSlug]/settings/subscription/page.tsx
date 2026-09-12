'use client'

import React, { useState, useEffect } from 'react'
import {
  Crown,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Zap,
  Users,
  Building,
  HardDrive,
  ShoppingCart,
  Layers,
  AlertTriangle,
  Lock,
  Smartphone,
  CreditCard,
  Landmark,
  FileText,
  RotateCcw,
  Clock,
  Ban,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { formatDate } from '@/lib/formatters'
import {
  DEFAULT_PLANS,
  FEATURE_METADATA,
} from '@/lib/subscription/subscription-constants'
import {
  PlanCode,
  BillingInterval,
  PaymentGatewayType,
  SubscriptionEventRecord,
  SubscriptionInvoiceRecord,
} from '@/types/subscription.types'
import {
  getSubscriptionEventsAction,
  getTenantSubscriptionInvoicesAction,
} from '@/actions/subscription.actions'

export default function TenantSubscriptionPage() {
  const {
    subscription,
    currentPlan,
    currentPlanCode,
    accountType,
    accountTypeMeta,
    allPlans,
    usage,
    isSuspended,
    isPastDue,
    isTrial,
    isTrialExpired,
    isPlanExpired,
    daysRemainingInTrial,
    daysRemainingInPlan,
    timeRemainingInTrial,
    timeRemainingInPlan,
    planExpiresAt,
    trialExpiresAt,
    getLimitStatus,
    openUpgradeModal,
    scheduleDowngrade,
    cancelSub,
    reactivateSub,
    refreshSubscription,
  } = useSubscription()

  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  const [events, setEvents] = useState<SubscriptionEventRecord[]>([])
  const [invoices, setInvoices] = useState<SubscriptionInvoiceRecord[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [notification, setNotification] = useState<string | null>(null)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [isDowngradeConfirmOpen, setIsDowngradeConfirmOpen] = useState(false)
  const [downgradeTargetPlan, setDowngradeTargetPlan] = useState<PlanCode>('starter')
  const [isActionPending, setIsActionPending] = useState(false)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  useEffect(() => {
    async function loadData() {
      if (company?.id) {
        setLoadingEvents(true)
        setLoadingInvoices(true)

        const [evRes, invRes] = await Promise.all([
          getSubscriptionEventsAction(company.id),
          getTenantSubscriptionInvoicesAction(company.id),
        ])

        if (evRes.success && evRes.data) {
          setEvents(evRes.data)
        }
        if (invRes.success && invRes.data) {
          setInvoices(invRes.data)
        }

        setLoadingEvents(false)
        setLoadingInvoices(false)
      }
    }
    loadData()
  }, [company?.id, subscription.status, subscription.plan_code])

  const handleScheduleDowngrade = async () => {
    setIsActionPending(true)
    const res = await scheduleDowngrade(downgradeTargetPlan)
    setIsActionPending(false)
    setIsDowngradeConfirmOpen(false)

    if (res.success) {
      const effStr = ('effectiveAt' in res && res.effectiveAt) ? ` (${formatDate(res.effectiveAt)})` : ''
      showNotification(`Downgrade scheduled for end of billing cycle${effStr}.`)
    } else {
      showNotification(`Failed: ${res.error}`)
    }
  }

  const handleCancelSubscription = async () => {
    setIsActionPending(true)
    const res = await cancelSub(false, 'Tenant requested cancellation at period end')
    setIsActionPending(false)
    setIsCancelConfirmOpen(false)

    if (res.success) {
      showNotification('Subscription scheduled for cancellation at the end of the billing period.')
    } else {
      showNotification(`Failed: ${res.error}`)
    }
  }

  const handleReactivate = async () => {
    setIsActionPending(true)
    const res = await reactivateSub()
    setIsActionPending(false)

    if (res.success) {
      showNotification('Subscription reactivated successfully!')
    } else {
      showNotification(`Failed: ${res.error}`)
    }
  }

  // 6 Configurable limits statuses
  const userLimit = getLimitStatus('max_users')
  const branchLimit = getLimitStatus('max_branches')
  const storageLimit = getLimitStatus('storage_gb')
  const orderLimit = getLimitStatus('monthly_orders')
  const customerLimit = getLimitStatus('max_customers')
  const productLimit = getLimitStatus('max_products')

  const isCancelScheduled = Boolean(subscription.cancel_at_period_end)
  const isDowngradeScheduled = Boolean(subscription.next_plan_id && subscription.change_effective_at)
  const nextPlanRecord = subscription.next_plan_id ? allPlans.find((p) => p.id === subscription.next_plan_id) : null

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <PageHeader
        titleEn="SaaS Subscription & Plan Entitlements"
        titleBn="সাবস্ক্রিপশন ও প্ল্যান ব্যবস্থাপনা"
        descriptionEn="Manage your organization subscription tier (Trial, Starter, Business, Enterprise), view resource quota meters, and process payments securely."
        descriptionBn="আপনার প্রতিষ্ঠানের সাবস্ক্রিপশন প্ল্যান, রিসোর্স কোটা ও বিলিং স্ট্যাটাস পরিচালনা করুন।"
        icon={Crown}
        iconColor="text-amber-500"
      />

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Scheduled Change / Cancellation Alert */}
      {isCancelScheduled && (
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <strong>Cancellation Pending:</strong> Your subscription will remain active until{' '}
              <span className="font-mono font-bold">{formatDate(subscription.current_period_end, locale)}</span>, after which it will not renew.
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleReactivate}
            disabled={isActionPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0"
          >
            Resume Subscription
          </Button>
        </div>
      )}

      {isDowngradeScheduled && nextPlanRecord && (
        <div className="p-4 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="text-xs text-blue-900 dark:text-blue-200">
              <strong>Scheduled Downgrade:</strong> Your plan will switch to{' '}
              <strong>{nextPlanRecord.name}</strong> on{' '}
              <span className="font-mono font-bold">
                {formatDate(subscription.change_effective_at || subscription.current_period_end, locale)}
              </span>.
            </div>
          </div>
        </div>
      )}

      {/* Active Subscription Banner */}
      <Card className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white rounded-2xl shadow-md border-0 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge className="bg-amber-400 text-slate-950 font-black tracking-wider uppercase text-[10px] px-2.5 py-0.5">
                {isTrial ? 'Free Trial' : currentPlan.name}
              </Badge>

              <Badge
                className={`text-[10px] font-bold capitalize px-2 py-0.5 ${
                  isTrial
                    ? isTrialExpired
                      ? 'bg-red-500 text-white'
                      : 'bg-amber-500 text-slate-950'
                    : subscription.status === 'active'
                    ? isPlanExpired
                      ? 'bg-red-500 text-white'
                      : 'bg-emerald-500 text-white'
                    : subscription.status === 'past_due'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-red-500 text-white'
                }`}
              >
                {isTrial
                  ? isTrialExpired
                    ? 'Trial Expired'
                    : timeRemainingInTrial && timeRemainingInTrial.days === 0
                    ? `Trial (${timeRemainingInTrial.formattedEn})`
                    : `Trial (${daysRemainingInTrial} Days Remaining)`
                  : isPlanExpired
                  ? 'Plan Expired'
                  : subscription.status.replace('_', ' ')}
              </Badge>

              <span className="text-xs text-slate-400 capitalize">
                • {subscription.billing_interval} billing
              </span>
            </div>

            <div className="text-3xl font-black tracking-tight text-white flex items-baseline gap-2">
              <CurrencyDisplay
                amount={
                  isTrial
                    ? 0
                    : subscription.billing_interval === 'yearly'
                    ? currentPlan.price_yearly
                    : currentPlan.price_monthly
                }
              />
              <span className="text-xs text-slate-400 font-normal">
                {isTrial ? `/ ${currentPlan.trial_days || 30} days evaluation` : `/ ${subscription.billing_interval === 'yearly' ? 'year' : 'month'}`}
              </span>
            </div>

            <p className="text-xs text-slate-300 max-w-xl">
              {isBn ? accountTypeMeta.nameBn : accountTypeMeta.nameEn}: {isBn ? accountTypeMeta.descriptionBn : accountTypeMeta.descriptionEn}
            </p>

            <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-3 flex-wrap">
              <span>
                {isTrial ? 'Trial Ends:' : 'Period Ends:'}{' '}
                <strong className="text-white font-mono">
                  {formatDate(trialExpiresAt || planExpiresAt || subscription.current_period_end, locale)}
                </strong>{' '}
                <span className="text-amber-300 font-mono text-[10px]">
                  ({isTrial
                    ? isTrialExpired
                      ? 'Expired'
                      : timeRemainingInTrial.formattedEn
                    : isPlanExpired
                    ? 'Expired'
                    : timeRemainingInPlan.formattedEn})
                </span>
              </span>
              {subscription.last_payment_reference && (
                <span>
                  Last Payment Reference:{' '}
                  <strong className="text-indigo-300 font-mono">{subscription.last_payment_reference}</strong>{' '}
                  ({subscription.payment_method_type?.toUpperCase()})
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
            <Button
              onClick={() => openUpgradeModal()}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black shadow-lg shadow-amber-500/20 text-xs px-5"
            >
              <Zap className="mr-1.5 h-4 w-4" />
              {isTrial ? 'Upgrade Free Trial' : 'Change / Upgrade Plan'}
            </Button>

            {!isTrial && subscription.status === 'active' && !isCancelScheduled && (
              <div className="flex gap-2">
                {currentPlanCode !== 'starter' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDowngradeTargetPlan(currentPlanCode === 'enterprise' ? 'business' : 'starter')
                      setIsDowngradeConfirmOpen(true)
                    }}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs flex-1"
                  >
                    Downgrade
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCancelConfirmOpen(true)}
                  className="border-red-900/60 text-red-400 hover:bg-red-950/40 text-xs flex-1"
                >
                  Cancel Plan
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 6 Configurable Limits Meters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              {isBn ? 'রিসোর্স ব্যবহার ও কোটা মিটার' : '6 Configurable Limits & Utilization'}
            </h2>
            <p className="text-xs text-slate-500">
              Authoritative server-side consumption tracking against your plan quota.
            </p>
          </div>

          {subscription.custom_limits_override && (
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 text-[10px]">
              Custom Overrides Active
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Limit 1: Team Users */}
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-500" />
                Team Users
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {userLimit.current} / {userLimit.limit}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  userLimit.exceeded
                    ? 'bg-red-500'
                    : userLimit.warning
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(userLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{userLimit.percentage}% used</span>
              <span>{Math.max(0, userLimit.limit - userLimit.current)} seats left</span>
            </div>
          </Card>

          {/* Limit 2: Branches */}
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Building className="h-4 w-4 text-purple-500" />
                Branches &amp; Hubs
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {branchLimit.current} / {branchLimit.limit}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  branchLimit.exceeded ? 'bg-red-500' : 'bg-purple-600'
                }`}
                style={{ width: `${Math.min(branchLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{branchLimit.percentage}% used</span>
              <span>{Math.max(0, branchLimit.limit - branchLimit.current)} available</span>
            </div>
          </Card>

          {/* Limit 3: Storage */}
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-cyan-500" />
                Cloud Artwork Storage
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {storageLimit.current} GB / {storageLimit.limit} GB
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-cyan-500 transition-all"
                style={{ width: `${Math.min(storageLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{storageLimit.percentage}% used</span>
              <span>{(storageLimit.limit - storageLimit.current).toFixed(1)} GB free</span>
            </div>
          </Card>

          {/* Limit 4: Monthly Orders */}
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-emerald-500" />
                Monthly Orders
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {orderLimit.current} / {orderLimit.limit}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(orderLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{orderLimit.percentage}% used</span>
              <span>Resets on 1st of month</span>
            </div>
          </Card>

          {/* Limit 5: Customers */}
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-amber-500" />
                Client Directory
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {customerLimit.current} / {customerLimit.limit}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-amber-500 transition-all"
                style={{ width: `${Math.min(customerLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{customerLimit.percentage}% used</span>
              <span>{customerLimit.limit - customerLimit.current} entries left</span>
            </div>
          </Card>

          {/* Limit 6: Products */}
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-pink-500" />
                Catalog Products
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {productLimit.current} / {productLimit.limit}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-pink-500 transition-all"
                style={{ width: `${Math.min(productLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{productLimit.percentage}% used</span>
              <span>{productLimit.limit - productLimit.current} products left</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Subscription Events & Audit History */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-600" />
            {isBn ? 'সাবস্ক্রিপশন ইভেন্ট ও অ্যাক্টিভেশন হিস্ট্রি' : 'Subscription Events & Audit Ledger'}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Immutable server-side audit trail of all plan changes, payment verifications, and renewals.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Transition</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      {loadingEvents ? 'Loading subscription events...' : 'No subscription events recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ev.event_type === 'PLAN_UPGRADED' || ev.event_type === 'PAYMENT_VERIFIED' || ev.event_type === 'RENEWED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : ev.event_type === 'PAYMENT_FAILED' || ev.event_type === 'EXPIRED'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {ev.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {ev.previous_plan_code || 'trial'} → <strong className="text-slate-900 dark:text-white">{ev.new_plan_code || 'starter'}</strong>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {ev.amount ? <CurrencyDisplay amount={Number(ev.amount)} /> : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {ev.reason || 'Lifecycle action'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {new Date(ev.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Touch Cards View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {events.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {loadingEvents ? 'Loading subscription events...' : 'No subscription events recorded yet.'}
              </div>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ev.event_type === 'PLAN_UPGRADED' || ev.event_type === 'PAYMENT_VERIFIED' || ev.event_type === 'RENEWED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : ev.event_type === 'PAYMENT_FAILED' || ev.event_type === 'EXPIRED'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                      {ev.event_type}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {ev.amount ? <CurrencyDisplay amount={Number(ev.amount)} /> : '—'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                    {ev.previous_plan_code || 'trial'} → <strong className="text-slate-900 dark:text-white">{ev.new_plan_code || 'starter'}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>{ev.reason || 'Lifecycle action'}</span>
                    <span>{formatDate(ev.created_at, locale)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing Invoices & Payment Receipts */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            {isBn ? 'পেমেন্ট ইনভয়েস ও রসিদ হিস্ট্রি' : 'Billing Invoices & Payment Receipts'}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Official billing statements, gateway transaction references, and settlement records.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Plan & Interval</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      {loadingInvoices ? 'Loading billing invoices...' : 'No billing transactions recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 uppercase text-slate-700 dark:text-slate-300 font-semibold">
                        {inv.plan_name} <span className="text-[10px] text-slate-400 font-normal">({inv.billing_interval})</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <CurrencyDisplay amount={inv.amount} />
                      </td>
                      <td className="py-3 px-4 uppercase text-slate-600 dark:text-slate-300">
                        {inv.payment_method}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {inv.transaction_ref}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : inv.status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {formatDate(inv.billing_date, locale)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Touch Cards View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {loadingInvoices ? 'Loading billing invoices...' : 'No billing transactions recorded yet.'}
              </div>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {inv.invoice_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      inv.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : inv.status === 'failed'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold uppercase">
                      {inv.plan_name} ({inv.billing_interval})
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      <CurrencyDisplay amount={inv.amount} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                    <span>{inv.payment_method?.toUpperCase()} • {inv.transaction_ref}</span>
                    <span>{formatDate(inv.billing_date, locale)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Downgrade Confirmation Modal */}
      {isDowngradeConfirmOpen && (
        <ModalDialog
          open={isDowngradeConfirmOpen}
          onOpenChange={setIsDowngradeConfirmOpen}
          title="Schedule Plan Downgrade"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-700 dark:text-slate-300">
              You are about to downgrade your plan to <strong className="text-slate-900 dark:text-white uppercase">{downgradeTargetPlan}</strong>.
            </p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              Your downgrade will safely take effect at the end of your current billing period (<strong>{formatDate(subscription.current_period_end)}</strong>). You will retain full access to your current features until that date.
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDowngradeConfirmOpen(false)}
                disabled={isActionPending}
                className="w-full sm:w-auto h-10 sm:h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleScheduleDowngrade}
                disabled={isActionPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9"
              >
                {isActionPending ? 'Scheduling...' : 'Confirm Scheduled Downgrade'}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* Cancel Confirmation Modal */}
      {isCancelConfirmOpen && (
        <ModalDialog
          open={isCancelConfirmOpen}
          onOpenChange={setIsCancelConfirmOpen}
          title="Cancel Subscription"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-700 dark:text-slate-300">
              Are you sure you want to cancel your PrintERP subscription?
            </p>
            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200">
              Your subscription will remain active until <strong>{formatDate(subscription.current_period_end)}</strong> and will not renew. Your company data and invoices will remain intact.
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelConfirmOpen(false)}
                disabled={isActionPending}
                className="w-full sm:w-auto h-10 sm:h-9"
              >
                Keep Subscription
              </Button>
              <Button
                size="sm"
                onClick={handleCancelSubscription}
                disabled={isActionPending}
                className="bg-red-600 hover:bg-red-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9"
              >
                {isActionPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}
