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

 const [mounted, setMounted] = useState(false)
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
 setMounted(true)
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

 const handleSync = () => {
 loadData()
 refreshSubscription()
    }
 window.addEventListener('printerp_table_synced:tenant_subscriptions', handleSync)
 window.addEventListener('printerp_data_sync', handleSync)

 return () => {
 window.removeEventListener('printerp_table_synced:tenant_subscriptions', handleSync)
 window.removeEventListener('printerp_data_sync', handleSync)
    }
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

 if (!mounted) {
 return (
      <div className="space-y-6 max-w-6xl animate-pulse">
        <div className="h-20 bg-muted rounded-xl"/>
        <div className="h-12 bg-muted rounded-xl"/>
        <div className="h-44 bg-muted rounded-xl"/>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-28 bg-muted rounded-xl"/>
          <div className="h-28 bg-muted rounded-xl"/>
          <div className="h-28 bg-muted rounded-xl"/>
        </div>
      </div>
    )
  }

 return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <PageHeader
 titleEn="My Plan"titleBn="সাবস্ক্রিপশন ও প্ল্যান ব্যবস্থাপনা"descriptionEn="Manage your organization subscription tier (Trial, Starter, Business, Enterprise), view resource quota meters, and process payments securely."descriptionBn="আপনার প্রতিষ্ঠানের সাবস্ক্রিপশন প্ল্যান, রিসোর্স কোটা ও বিলিং স্ট্যাটাস পরিচালনা করুন।"icon={Crown}
 iconColor="text-amber-500"/>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0"/>
          <span>{notification}</span>
        </div>
      )}

      {/* Scheduled Change / Cancellation Alert */}
      {isCancelScheduled && (
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0"/>
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <strong>Cancellation Pending:</strong> Your subscription will remain active until{' '}
              <span className="tabular-nums font-bold">{formatDate(subscription.current_period_end, locale)}</span>, after which it will not renew.
            </div>
          </div>
          <Button
 size="sm"onClick={handleReactivate}
 disabled={isActionPending}
 className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0">
 Resume Subscription
          </Button>
        </div>
      )}

      {isDowngradeScheduled && nextPlanRecord && (
        <div className="p-4 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-blue-600 shrink-0"/>
            <div className="text-xs text-blue-900 dark:text-blue-200">
              <strong>Scheduled Downgrade:</strong> Your plan will switch to{' '}
              <strong>{nextPlanRecord.name}</strong> on{' '}
              <span className="tabular-nums font-bold">
                {formatDate(subscription.change_effective_at || subscription.current_period_end, locale)}
              </span>.
            </div>
          </div>
        </div>
      )}

      {/* Active Subscription Banner */}
      <Card className="p-6 bg-card text-card-foreground rounded-xl shadow-xs border border-border relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 font-bold tracking-wider uppercase text-2xs px-2.5 py-0.5">
                {isTrial ? 'Free Trial' : currentPlan.name}
              </Badge>

              <Badge
 className={`text-2xs font-bold capitalize px-2 py-0.5 ${
 isTrial
                    ? isTrialExpired
                      ? 'bg-red-500 text-white'
                      : 'bg-amber-500 text-foreground'
                    : subscription.status === 'active'
                    ? isPlanExpired
                      ? 'bg-red-500 text-white'
                      : 'bg-emerald-500 text-white'
                    : subscription.status === 'past_due'
                    ? 'bg-amber-500 text-foreground'
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

              <span className="text-xs text-muted-foreground capitalize">
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
              <span className="text-xs text-muted-foreground font-normal">
                {isTrial ? `/ ${currentPlan.trial_days || 30} days evaluation` : `/ ${subscription.billing_interval === 'yearly' ? 'year' : 'month'}`}
              </span>
            </div>

            <p className="text-xs text-muted-foreground max-w-xl">
              {isBn ? accountTypeMeta.nameBn : accountTypeMeta.nameEn}: {isBn ? accountTypeMeta.descriptionBn : accountTypeMeta.descriptionEn}
            </p>

            <div className="text-2xs text-muted-foreground pt-1 flex items-center gap-3 flex-wrap">
              <span>
                {isTrial ? 'Trial Ends:' : 'Period Ends:'}{' '}
                <strong className="text-white tabular-nums">
                  {formatDate(trialExpiresAt || planExpiresAt || subscription.current_period_end, locale)}
                </strong>{' '}
                <span className="text-amber-300 tabular-nums text-2xs">
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
                  <strong className="text-indigo-300 tabular-nums">{subscription.last_payment_reference}</strong>{' '}
                  ({subscription.payment_method_type?.toUpperCase()})
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
            <Button
 onClick={() => openUpgradeModal()}
 className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs px-5 shadow-xs">
              <Zap className="mr-1.5 h-4 w-4"/>
              {isTrial ? 'Upgrade Free Trial' : 'Change / Upgrade Plan'}
            </Button>

            {!isTrial && subscription.status === 'active' && !isCancelScheduled && (
              <div className="flex gap-2">
                {currentPlanCode !== 'starter' && (
                  <Button
 variant="outline"size="sm"onClick={() => {
 setDowngradeTargetPlan(currentPlanCode === 'enterprise' ? 'business' : 'starter')
 setIsDowngradeConfirmOpen(true)
                    }}
 className="border-border text-muted-foreground hover:bg-card-elevated text-xs flex-1">
 Downgrade
                  </Button>
                )}
                <Button
 variant="outline"size="sm"onClick={() => setIsCancelConfirmOpen(true)}
 className="border-red-900/60 text-red-400 hover:bg-red-950/40 text-xs flex-1">
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
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600"/>
              {isBn ? 'রিসোর্স ব্যবহার ও কোটা মিটার' : '6 Configurable Limits & Utilization'}
            </h2>
            <p className="text-xs text-muted-foreground">
 Authoritative server-side consumption tracking against your plan quota.
            </p>
          </div>

          {subscription.custom_limits_override && (
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 text-2xs">
 Custom Overrides Active
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Limit 1: Team Users */}
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-500"/>
 Team Users
              </span>
              <span className="tabular-nums text-foreground font-bold">
                {userLimit.current} / {userLimit.limit}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
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
            <div className="text-2xs text-muted-foreground mt-1 flex justify-between">
              <span>{userLimit.percentage}% used</span>
              <span>{Math.max(0, userLimit.limit - userLimit.current)} seats left</span>
            </div>
          </Card>

          {/* Limit 2: Branches */}
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <Building className="h-4 w-4 text-purple-500"/>
 Branches &amp; Hubs
              </span>
              <span className="tabular-nums text-foreground font-bold">
                {branchLimit.current} / {branchLimit.limit}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
              <div
 className={`h-2 rounded-full transition-all ${
 branchLimit.exceeded ? 'bg-red-500' : 'bg-purple-600'
                }`}
 style={{ width: `${Math.min(branchLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-2xs text-muted-foreground mt-1 flex justify-between">
              <span>{branchLimit.percentage}% used</span>
              <span>{Math.max(0, branchLimit.limit - branchLimit.current)} available</span>
            </div>
          </Card>

          {/* Limit 3: Storage */}
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-cyan-500"/>
 Cloud Artwork Storage
              </span>
              <span className="tabular-nums text-foreground font-bold">
                {storageLimit.current} GB / {storageLimit.limit} GB
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
              <div
 className="h-2 rounded-full bg-cyan-500 transition-all"style={{ width: `${Math.min(storageLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-2xs text-muted-foreground mt-1 flex justify-between">
              <span>{storageLimit.percentage}% used</span>
              <span>{(storageLimit.limit - storageLimit.current).toFixed(1)} GB free</span>
            </div>
          </Card>

          {/* Limit 4: Monthly Orders */}
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-emerald-500"/>
 Monthly Orders
              </span>
              <span className="tabular-nums text-foreground font-bold">
                {orderLimit.current} / {orderLimit.limit}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
              <div
 className="h-2 rounded-full bg-emerald-500 transition-all"style={{ width: `${Math.min(orderLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-2xs text-muted-foreground mt-1 flex justify-between">
              <span>{orderLimit.percentage}% used</span>
              <span>Resets on 1st of month</span>
            </div>
          </Card>

          {/* Limit 5: Customers */}
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-amber-500"/>
 Client Directory
              </span>
              <span className="tabular-nums text-foreground font-bold">
                {customerLimit.current} / {customerLimit.limit}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
              <div
 className="h-2 rounded-full bg-amber-500 transition-all"style={{ width: `${Math.min(customerLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-2xs text-muted-foreground mt-1 flex justify-between">
              <span>{customerLimit.percentage}% used</span>
              <span>{customerLimit.limit - customerLimit.current} entries left</span>
            </div>
          </Card>

          {/* Limit 6: Products */}
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-pink-500"/>
 Catalog Products
              </span>
              <span className="tabular-nums text-foreground font-bold">
                {productLimit.current} / {productLimit.limit}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
              <div
 className="h-2 rounded-full bg-pink-500 transition-all"style={{ width: `${Math.min(productLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-2xs text-muted-foreground mt-1 flex justify-between">
              <span>{productLimit.percentage}% used</span>
              <span>{productLimit.limit - productLimit.current} products left</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Subscription Events & Audit History */}
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-600"/>
            {isBn ? 'সাবস্ক্রিপশন ইভেন্ট ও অ্যাক্টিভেশন হিস্ট্রি' : 'Subscription Events & Audit Log'}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
 Immutable server-side audit trail of all plan changes, payment verifications, and renewals.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Transition</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      {loadingEvents ? 'Loading subscription events...' : 'No subscription events recorded yet.'}
                    </td>
                  </tr>
                ) : (
 events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
 ev.event_type === 'PLAN_UPGRADED' || ev.event_type === 'PAYMENT_VERIFIED' || ev.event_type === 'RENEWED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : ev.event_type === 'PAYMENT_FAILED' || ev.event_type === 'EXPIRED'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {ev.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 tabular-nums text-2xs">
                        {ev.previous_plan_code || 'trial'} → <strong className="text-foreground">{ev.new_plan_code || 'starter'}</strong>
                      </td>
                      <td className="py-3 px-4 tabular-nums font-bold">
                        {ev.amount ? <CurrencyDisplay amount={Number(ev.amount)} /> : '—'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {ev.reason || 'Lifecycle action'}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-muted-foreground">
                        {new Date(ev.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Touch Cards View */}
          <div className="md:hidden divide-y divide-border dark:divide-border">
            {events.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {loadingEvents ? 'Loading subscription events...' : 'No subscription events recorded yet.'}
              </div>
            ) : (
 events.map((ev) => (
                <div key={ev.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
 ev.event_type === 'PLAN_UPGRADED' || ev.event_type === 'PAYMENT_VERIFIED' || ev.event_type === 'RENEWED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : ev.event_type === 'PAYMENT_FAILED' || ev.event_type === 'EXPIRED'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                      {ev.event_type}
                    </span>
                    <span className="tabular-nums text-xs font-bold text-foreground">
                      {ev.amount ? <CurrencyDisplay amount={Number(ev.amount)} /> : '—'}
                    </span>
                  </div>
                  <div className="text-xs text-foreground tabular-nums">
                    {ev.previous_plan_code || 'trial'} → <strong className="text-foreground">{ev.new_plan_code || 'starter'}</strong>
                  </div>
                  <div className="flex items-center justify-between text-2xs text-muted-foreground pt-1">
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
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600"/>
            {isBn ? 'পেমেন্ট ইনভয়েস ও রসিদ হিস্ট্রি' : 'Billing Invoices & Payment Receipts'}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
 Official billing statements, gateway transaction references, and settlement records.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted font-semibold text-muted-foreground border-b border-border">
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
              <tbody className="divide-y divide-border dark:divide-border">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      {loadingInvoices ? 'Loading billing invoices...' : 'No billing transactions recorded yet.'}
                    </td>
                  </tr>
                ) : (
 invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 tabular-nums font-bold text-foreground">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 uppercase text-foreground font-semibold">
                        {inv.plan_name} <span className="text-2xs text-muted-foreground font-normal">({inv.billing_interval})</span>
                      </td>
                      <td className="py-3 px-4 tabular-nums font-bold">
                        <CurrencyDisplay amount={inv.amount} />
                      </td>
                      <td className="py-3 px-4 uppercase text-muted-foreground">
                        {inv.payment_method}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-2xs text-muted-foreground">
                        {inv.transaction_ref}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-2xs font-bold uppercase ${
 inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : inv.status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 tabular-nums text-muted-foreground">
                        {formatDate(inv.billing_date, locale)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Touch Cards View */}
          <div className="md:hidden divide-y divide-border dark:divide-border">
            {invoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {loadingInvoices ? 'Loading billing invoices...' : 'No billing transactions recorded yet.'}
              </div>
            ) : (
 invoices.map((inv) => (
                <div key={inv.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="tabular-nums text-xs font-bold text-foreground">
                      {inv.invoice_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-2xs font-bold uppercase ${
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
                    <span className="text-muted-foreground font-semibold uppercase">
                      {inv.plan_name} ({inv.billing_interval})
                    </span>
                    <span className="tabular-nums font-bold text-foreground">
                      <CurrencyDisplay amount={inv.amount} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-2xs text-muted-foreground tabular-nums pt-1">
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
 title="Schedule Plan Downgrade">
          <div className="space-y-4 text-xs">
            <p className="text-foreground">
 You are about to downgrade your plan to <strong className="text-foreground uppercase">{downgradeTargetPlan}</strong>.
            </p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
 Your downgrade will safely take effect at the end of your current billing period (<strong>{formatDate(subscription.current_period_end)}</strong>). You will retain full access to your current features until that date.
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
              <Button
 variant="outline"size="sm"onClick={() => setIsDowngradeConfirmOpen(false)}
 disabled={isActionPending}
 className="w-full sm:w-auto h-10 sm:h-9">
 Cancel
              </Button>
              <Button
 size="sm"onClick={handleScheduleDowngrade}
 disabled={isActionPending}
 className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold w-full sm:w-auto h-10 sm:h-9">
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
 title="Cancel Subscription">
          <div className="space-y-4 text-xs">
            <p className="text-foreground">
 Are you sure you want to cancel your PrintERP subscription?
            </p>
            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200">
 Your subscription will remain active until <strong>{formatDate(subscription.current_period_end)}</strong> and will not renew. Your company data and invoices will remain intact.
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
              <Button
 variant="outline"size="sm"onClick={() => setIsCancelConfirmOpen(false)}
 disabled={isActionPending}
 className="w-full sm:w-auto h-10 sm:h-9">
 Keep Subscription
              </Button>
              <Button
 size="sm"onClick={handleCancelSubscription}
 disabled={isActionPending}
 className="bg-red-600 hover:bg-red-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9">
                {isActionPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}
