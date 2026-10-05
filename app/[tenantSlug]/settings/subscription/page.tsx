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
import { UsageMeter } from '@/components/platform/usage-meter'
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

  const anyLimitExceeded = Boolean(
    userLimit.exceeded ||
    branchLimit.exceeded ||
    storageLimit.exceeded ||
    orderLimit.exceeded ||
    customerLimit.exceeded ||
    productLimit.exceeded
  )
  const anyLimitWarning = Boolean(
    userLimit.warning ||
    branchLimit.warning ||
    storageLimit.warning ||
    orderLimit.warning ||
    customerLimit.warning ||
    productLimit.warning
  )

 const isCancelScheduled = Boolean(subscription.cancel_at_period_end)
 const isDowngradeScheduled = Boolean(subscription.next_plan_id && subscription.change_effective_at)
 const nextPlanRecord = subscription.next_plan_id ? allPlans.find((p) => p.id === subscription.next_plan_id) : null

 if (!mounted) {
 return (
      <div className="space-y-6 animate-pulse">
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
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
 titleEn="My Plan"titleBn="সাবস্ক্রিপশন ও প্ল্যান ব্যবস্থাপনা"descriptionEn="Manage your organization subscription tier (Trial, Starter, Business, Enterprise), view resource quota meters, and process payments securely."descriptionBn="আপনার প্রতিষ্ঠানের সাবস্ক্রিপশন প্ল্যান, রিসোর্স কোটা ও বিলিং স্ট্যাটাস পরিচালনা করুন।"icon={Crown}
 iconColor="text-warning"/>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-success-surface text-success rounded-lg text-xs font-semibold flex items-center gap-2 border border-success-border bg-success-surface text-success border-success-border animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0"/>
          <span>{notification}</span>
        </div>
      )}

      {/* Scheduled Change / Cancellation Alert */}
      {isCancelScheduled && (
        <div className="p-4 rounded-xl border border-warning-border border-warning-border bg-warning-surface bg-warning-surface flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0"/>
            <div className="text-xs text-warning text-warning">
              <strong>Cancellation Pending:</strong> Your subscription will remain active until{' '}
              <span className="tabular-nums font-bold">{formatDate(subscription.current_period_end, locale)}</span>, after which it will not renew.
            </div>
          </div>
          <Button
 size="sm"onClick={handleReactivate}
 disabled={isActionPending}
 className="bg-success hover:bg-success text-white text-xs font-bold shrink-0">
 Resume Subscription
          </Button>
        </div>
      )}

      {isDowngradeScheduled && nextPlanRecord && (
        <div className="p-4 rounded-xl border border-primary/20 border-border bg-primary/10 bg-primary/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-primary shrink-0"/>
            <div className="text-xs text-primary text-primary">
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
              <Badge className="bg-warning-surface text-warning bg-warning-surface text-warning border border-warning-border font-bold tracking-wider uppercase text-xs px-2.5 py-0.5">
                {isTrial ? (isBn ? 'ফ্রি ট্রায়াল' : 'Free Trial') : (isBn ? (currentPlan.name_bn || currentPlan.name) : currentPlan.name)}
              </Badge>

              <Badge
 className={`text-xs font-bold capitalize px-2 py-0.5 ${
 isTrial
                    ? isTrialExpired
                      ? 'bg-destructive text-white'
                      : 'bg-warning text-foreground'
                    : subscription.status === 'active'
                    ? isPlanExpired
                      ? 'bg-destructive text-white'
                      : 'bg-success text-white'
                    : subscription.status === 'past_due'
                    ? 'bg-warning text-foreground'
                    : 'bg-destructive text-white'
                }`}
              >
                {isTrial
                  ? isTrialExpired
                    ? (isBn ? 'ট্রায়ালের মেয়াদ শেষ' : 'Trial Expired')
                    : timeRemainingInTrial && timeRemainingInTrial.days === 0
                    ? `Trial (${isBn ? timeRemainingInTrial.formattedBn : isBn ? timeRemainingInTrial.formattedBn : timeRemainingInTrial.formattedEn})`
                    : (isBn ? `ট্রায়াল (${daysRemainingInTrial} দিন বাকি)` : `Trial (${daysRemainingInTrial} Days Remaining)`)
                  : isPlanExpired
                  ? (isBn ? 'প্ল্যানের মেয়াদ শেষ' : 'Plan Expired')
                  : subscription.status.replace('_', ' ')}
              </Badge>

              <span className="text-xs text-muted-foreground capitalize">
                • {isBn ? (subscription.billing_interval === 'yearly' ? 'বার্ষিক বিলিং' : 'মাসিক বিলিং') : `${subscription.billing_interval} billing`}
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
                {isTrial ? (isBn ? `/ ${currentPlan.trial_days || 30} দিনের মূল্যায়ন` : `/ ${currentPlan.trial_days || 30} days evaluation`) : (isBn ? (subscription.billing_interval === 'yearly' ? '/ বছর' : '/ মাস') : `/ ${subscription.billing_interval === 'yearly' ? 'year' : 'month'}`)}
              </span>
            </div>

            <p className="text-xs text-muted-foreground max-w-xl">
              {isBn ? accountTypeMeta.nameBn : accountTypeMeta.nameEn}: {isBn ? accountTypeMeta.descriptionBn : accountTypeMeta.descriptionEn}
            </p>

            <div className="text-xs text-muted-foreground pt-1 flex items-center gap-3 flex-wrap">
              <span>
                {isTrial ? (isBn ? 'ট্রায়াল শেষ:' : 'Trial Ends:') : (isBn ? 'মেয়াদ শেষ:' : 'Period Ends:')}{' '}
                <strong className="text-white tabular-nums">
                  {formatDate(trialExpiresAt || planExpiresAt || subscription.current_period_end, locale)}
                </strong>{' '}
                <span className="text-warning tabular-nums text-xs">
                  ({isTrial
                    ? isTrialExpired
                      ? 'Expired'
                      : timeRemainingInTrial.formattedEn
                    : isPlanExpired
                    ? 'Expired'
                    : isBn ? timeRemainingInPlan.formattedBn : timeRemainingInPlan.formattedEn})
                </span>
              </span>
              {subscription.last_payment_reference && (
                <span>
 {isBn ? 'সর্বশেষ পেমেন্ট রেফারেন্স:' : 'Last Payment Reference:'}{' '}
                  <strong className="text-primary tabular-nums">{subscription.last_payment_reference}</strong>{' '}
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
              {isTrial ? (isBn ? 'ফ্রি ট্রায়াল আপগ্রেড করুন' : 'Upgrade Free Trial') : (isBn ? 'প্ল্যান পরিবর্তন / আপগ্রেড' : 'Change / Upgrade Plan')}
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
 className="border-danger-border/60 text-destructive hover:bg-danger-surface text-xs flex-1">
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
              <Layers className="h-4 w-4 text-primary"/>
              {isBn ? 'রিসোর্স ব্যবহার ও কোটা মিটার' : '6 Configurable Limits & Utilization'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isBn ? 'আপনার সাবস্ক্রিপশন প্ল্যানের কোটা ও রিয়েল-টাইম ব্যবহারের পরিসংখ্যান।' : 'Authoritative server-side consumption tracking against your plan quota.'}
            </p>
          </div>

          {subscription.custom_limits_override && (
            <Badge variant="outline" className="border-border text-foreground text-xs">
              {isBn ? 'কাস্টম সীমা সক্রিয়' : 'Custom Overrides Active'}
            </Badge>
          )}
        </div>

        {anyLimitExceeded && (
          <div className="mb-4 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div className="text-xs text-destructive font-medium">
                <strong>{isBn ? 'কোটা অতিক্রম করেছে:' : 'Quota Limit Exceeded:'}</strong>{' '}
                {isBn
                  ? 'আপনার সাবস্ক্রিপশন প্ল্যানের রিসোর্স সীমা পূর্ণ হয়েছে। নতুন ডেটা এন্ট্রি করতে প্ল্যান আপগ্রেড করুন।'
                  : 'One or more resource limits have been reached. Upgrade your plan to expand capacity.'}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => openUpgradeModal()}
              className="text-xs font-bold shrink-0"
            >
              {isBn ? 'আপগ্রেড করুন' : 'Upgrade Plan'}
            </Button>
          </div>
        )}

        {!anyLimitExceeded && anyLimitWarning && (
          <div className="mb-4 p-3.5 rounded-xl border border-warning/30 bg-warning-surface flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <div className="text-xs text-warning-foreground font-medium">
                <strong>{isBn ? 'কোটা সতর্কতা:' : 'Quota Warning:'}</strong>{' '}
                {isBn
                  ? 'আপনার কিছু রিসোর্সের ব্যবহার ৮০% বা তার বেশি পৌঁছেছে।'
                  : 'One or more resource quotas have reached 80% capacity.'}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openUpgradeModal()}
              className="text-xs font-bold shrink-0 border-warning/30"
            >
              {isBn ? 'প্ল্যান দেখুন' : 'View Plans'}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4 bg-card border-border">
            <UsageMeter
              label={isBn ? 'টিম সদস্য' : 'Team Users'}
              current={userLimit.current}
              max={userLimit.limit}
              warningThreshold={80}
              dangerThreshold={95}
              description={Math.max(0, userLimit.limit - userLimit.current) > 0 
                ? (isBn ? `${Math.max(0, userLimit.limit - userLimit.current)} টি সিট বাকি` : `${Math.max(0, userLimit.limit - userLimit.current)} seats available`)
                : (isBn ? 'কোটা পূর্ণ হয়েছে' : 'Quota exhausted')}
            />
          </Card>

          <Card className="p-4 bg-card border-border">
            <UsageMeter
              label={isBn ? 'শাখা ও কারখানা হাব' : 'Branches & Hubs'}
              current={branchLimit.current}
              max={branchLimit.limit}
              warningThreshold={80}
              dangerThreshold={95}
              description={Math.max(0, branchLimit.limit - branchLimit.current) > 0 
                ? (isBn ? `${Math.max(0, branchLimit.limit - branchLimit.current)} টি অবশিষ্ট` : `${Math.max(0, branchLimit.limit - branchLimit.current)} branches available`)
                : (isBn ? 'কোটা পূর্ণ হয়েছে' : 'Quota exhausted')}
            />
          </Card>

          <Card className="p-4 bg-card border-border">
            <UsageMeter
              label={isBn ? 'ক্লাউড আর্টওয়ার্ক স্টোরেজ' : 'Cloud Artwork Storage'}
              current={storageLimit.current}
              max={storageLimit.limit}
              unit={isBn ? 'জিবি' : 'GB'}
              warningThreshold={80}
              dangerThreshold={95}
              description={(storageLimit.limit - storageLimit.current) > 0
                ? (isBn ? `${(storageLimit.limit - storageLimit.current).toFixed(1)} জিবি খালি` : `${(storageLimit.limit - storageLimit.current).toFixed(1)} GB available`)
                : (isBn ? 'স্টোরেজ পূর্ণ' : 'Storage full')}
            />
          </Card>

          <Card className="p-4 bg-card border-border">
            <UsageMeter
              label={isBn ? 'মাসিক অর্ডার' : 'Monthly Orders'}
              current={orderLimit.current}
              max={orderLimit.limit}
              warningThreshold={80}
              dangerThreshold={95}
              description={isBn ? 'প্রতি মাসের ১ তারিখে রিসেট হবে' : 'Resets on 1st of month'}
            />
          </Card>

          <Card className="p-4 bg-card border-border">
            <UsageMeter
              label={isBn ? 'গ্রাহক তালিকা' : 'Client Directory'}
              current={customerLimit.current}
              max={customerLimit.limit}
              warningThreshold={80}
              dangerThreshold={95}
              description={Math.max(0, customerLimit.limit - customerLimit.current) > 0
                ? (isBn ? `${customerLimit.limit - customerLimit.current} টি বাকি` : `${customerLimit.limit - customerLimit.current} entries left`)
                : (isBn ? 'কোটা পূর্ণ হয়েছে' : 'Quota exhausted')}
            />
          </Card>

          <Card className="p-4 bg-card border-border">
            <UsageMeter
              label={isBn ? 'ক্যাটালগ পণ্য' : 'Catalog Products'}
              current={productLimit.current}
              max={productLimit.limit}
              warningThreshold={80}
              dangerThreshold={95}
              description={Math.max(0, productLimit.limit - productLimit.current) > 0
                ? (isBn ? `${productLimit.limit - productLimit.current} টি বাকি` : `${productLimit.limit - productLimit.current} products left`)
                : (isBn ? 'কোটা পূর্ণ হয়েছে' : 'Quota exhausted')}
            />
          </Card>
        </div>
      </div>

      {/* Subscription Events & Audit History */}
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary"/>
            {isBn ? 'সাবস্ক্রিপশন ইভেন্ট ও অ্যাক্টিভেশন হিস্ট্রি' : 'Subscription Events & Audit Log'}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
 {isBn ? 'সকল প্ল্যান পরিবর্তন, পেমেন্ট যাচাইকরণ ও রিনিউয়ালের স্থায়ী সার্ভার অডিট লগ।' : 'Immutable server-side audit trail of all plan changes, payment verifications, and renewals.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4 bangla-text">{isBn ? 'ইভেন্টের ধরন' : 'Event Type'}</th>
                  <th className="py-3 px-4 bangla-text">{isBn ? 'পরিবর্তন' : 'Transition'}</th>
                  <th className="py-3 px-4 bangla-text">{isBn ? 'পরিমাণ' : 'Amount'}</th>
                  <th className="py-3 px-4 bangla-text">{isBn ? 'কারণ / রেফারেন্স' : 'Reason / Reference'}</th>
                  <th className="py-3 px-4 bangla-text">{isBn ? 'সময়' : 'Timestamp'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      {loadingEvents ? (isBn ? 'ইভেন্ট লোড হচ্ছে...' : 'Loading subscription events...') : (isBn ? 'এখনও কোনো সাবস্ক্রিপশন ইভেন্ট রেকর্ড করা হয়নি।' : 'No subscription events recorded yet.')}
                    </td>
                  </tr>
                ) : (
 events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
 ev.event_type === 'PLAN_UPGRADED' || ev.event_type === 'PAYMENT_VERIFIED' || ev.event_type === 'RENEWED'
                            ? 'bg-success-surface text-success bg-success-surface text-success'
                            : ev.event_type === 'PAYMENT_FAILED' || ev.event_type === 'EXPIRED'
                            ? 'bg-danger-surface text-destructive bg-danger-surface text-destructive'
                            : 'bg-primary/10 text-primary bg-primary/10 text-primary'
                        }`}>
                          {ev.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 tabular-nums text-xs">
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
                {loadingEvents ? (isBn ? 'ইভেন্ট লোড হচ্ছে...' : 'Loading subscription events...') : (isBn ? 'এখনও কোনো সাবস্ক্রিপশন ইভেন্ট রেকর্ড করা হয়নি।' : 'No subscription events recorded yet.')}
              </div>
            ) : (
 events.map((ev) => (
                <div key={ev.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
 ev.event_type === 'PLAN_UPGRADED' || ev.event_type === 'PAYMENT_VERIFIED' || ev.event_type === 'RENEWED'
                        ? 'bg-success-surface text-success bg-success-surface text-success'
                        : ev.event_type === 'PAYMENT_FAILED' || ev.event_type === 'EXPIRED'
                        ? 'bg-danger-surface text-destructive bg-danger-surface text-destructive'
                        : 'bg-primary/10 text-primary bg-primary/10 text-primary'
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
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
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
            <FileText className="h-4 w-4 text-success"/>
            {isBn ? 'পেমেন্ট ইনভয়েস ও রসিদ হিস্ট্রি' : 'Billing Invoices & Payment Receipts'}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
 {isBn ? 'অফিসিয়াল বিলিং স্টেটমেন্ট, গেটওয়ে ট্রানজেকশন রেফারেন্স ও সেটেলমেন্ট রেকর্ড।' : 'Official billing statements, gateway transaction references, and settlement records.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4 bangla-text">{isBn ? 'ইনভয়েস নং' : 'Invoice #'}</th>
                  <th className="py-3 px-4 bangla-text">{isBn ? 'প্ল্যান ও সময়কাল' : 'Plan & Interval'}</th>
                  <th className="py-3 px-4 bangla-text">{isBn ? 'পরিমাণ' : 'Amount'}</th>
                  <th className="py-3 px-4 bangla-text">{isBn ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}</th>
                  <th className="py-3 px-4 bangla-text">{isBn ? 'ট্রানজেকশন রেফারেন্স' : 'Transaction Ref'}</th>
                  <th className="py-3 px-4 bangla-text">{isBn ? 'অবস্থা' : 'Status'}</th>
                  <th className="py-3 px-4 bangla-text">{isBn ? 'তারিখ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      {loadingInvoices ? (isBn ? 'ইনভয়েস লোড হচ্ছে...' : 'Loading billing invoices...') : (isBn ? 'এখনও কোনো বিলিং ট্রানজেকশন রেকর্ড করা হয়নি।' : 'No billing transactions recorded yet.')}
                    </td>
                  </tr>
                ) : (
 invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 tabular-nums font-bold text-foreground">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 uppercase text-foreground font-semibold">
                        {inv.plan_name} <span className="text-xs text-muted-foreground font-normal">({inv.billing_interval})</span>
                      </td>
                      <td className="py-3 px-4 tabular-nums font-bold">
                        <CurrencyDisplay amount={inv.amount} />
                      </td>
                      <td className="py-3 px-4 uppercase text-muted-foreground">
                        {inv.payment_method}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-xs text-muted-foreground">
                        {inv.transaction_ref}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
 inv.status === 'paid'
                            ? 'bg-success-surface text-success bg-success-surface text-success'
                            : inv.status === 'failed'
                            ? 'bg-danger-surface text-destructive bg-danger-surface text-destructive'
                            : 'bg-warning-surface text-warning bg-warning-surface text-warning'
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
                {loadingInvoices ? (isBn ? 'ইনভয়েস লোড হচ্ছে...' : 'Loading billing invoices...') : (isBn ? 'এখনও কোনো বিলিং ট্রানজেকশন রেকর্ড করা হয়নি।' : 'No billing transactions recorded yet.')}
              </div>
            ) : (
 invoices.map((inv) => (
                <div key={inv.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="tabular-nums text-xs font-bold text-foreground">
                      {inv.invoice_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
 inv.status === 'paid'
                        ? 'bg-success-surface text-success bg-success-surface text-success'
                        : inv.status === 'failed'
                        ? 'bg-danger-surface text-destructive bg-danger-surface text-destructive'
                        : 'bg-warning-surface text-warning bg-warning-surface text-warning'
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
                  <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums pt-1">
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
            <div className="p-3 bg-warning-surface bg-warning-surface rounded-xl border border-warning-border border-warning-border text-warning text-warning">
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
 Are you sure you want to cancel your PrintFlow subscription?
            </p>
            <div className="p-3 bg-danger-surface bg-danger-surface rounded-xl border border-danger-border border-danger-border text-destructive text-destructive">
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
 className="bg-destructive hover:bg-destructive text-white font-bold w-full sm:w-auto h-10 sm:h-9">
                {isActionPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}
