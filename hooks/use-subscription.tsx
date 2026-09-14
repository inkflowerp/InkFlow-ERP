'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  SubscriptionPlanRecord,
  CompanySubscriptionRecord,
  TenantResourceUsage,
  PlanCode,
  BillingInterval,
  PaymentGatewayType,
  ConfigurableLimitType,
  CustomLimitsOverride,
  TenantAccountType,
  TenantAccountTypeMeta,
  SubscriptionCheckoutInput,
  SubscriptionCheckoutResult,
  SubscriptionVerificationResult,
  resolveTenantAccountType,
} from '@/types/subscription.types'
import {
  DEFAULT_PLANS,
  DEFAULT_TRIAL_PLAN,
  DEFAULT_TENANT_SUBSCRIPTION,
  DEMO_TENANT_SUBSCRIPTION,
  DEMO_RESOURCE_USAGE,
  TENANT_ACCOUNT_TYPE_METADATA,
  checkFeatureAccess,
  checkResourceLimit,
  getTenantResourceUsage,
  getTrialPlan,
  getNextTierPlan,
  getTrialDaysRemaining,
  getSubscriptionTimeRemaining,
  SubscriptionExpiryCountdown,
} from '@/lib/subscription/subscription-constants'
import {
  SubscriptionSnapshot,
  FeatureCode,
} from '@/types/subscription.types'
import { useTenant } from '@/hooks/use-tenant'
import {
  getTenantSubscriptionAction,
  getAuthoritativeSubscriptionSnapshotAction,
  getPublicSubscriptionPlansAction,
  initiateSubscriptionCheckoutAction,
  verifySubscriptionPaymentAction,
  schedulePlanDowngradeAction,
  cancelSubscriptionAction,
  reactivateSubscriptionAction,
} from '@/actions/subscription.actions'
import { toBengaliDigits } from '@/hooks/use-public-plans'
import { triggerPopupNotification } from '@/components/shell/realtime-notification-popup'
import { PlatformTenantCompany } from '@/types/platform.types'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { STORAGE_KEYS } from '@/lib/db/data-store'

function snapshotToSubscriptionRecord(snapshot: SubscriptionSnapshot): CompanySubscriptionRecord {
  return {
    id: snapshot.subscriptionId || `sub-${snapshot.tenantId}`,
    company_id: snapshot.tenantId,
    plan_id: snapshot.planId,
    plan_code: (snapshot.planCode as PlanCode) || 'starter',
    plan_name: snapshot.planName,
    plan_name_bn: snapshot.planNameBn,
    status: snapshot.status === 'unknown' ? 'active' : snapshot.status,
    billing_interval: snapshot.billingInterval || 'monthly',
    current_period_start: snapshot.currentPeriodStart || new Date().toISOString(),
    current_period_end: snapshot.currentPeriodEnd || snapshot.trialEndsAt || new Date(Date.now() + 30 * 86400000).toISOString(),
    trial_ends_at: snapshot.trialEndsAt,
    payment_method_type: null,
    last_payment_reference: null,
    custom_limits_override: snapshot.customLimitsOverride as any,
  }
}

function snapshotToPlanRecord(snapshot: SubscriptionSnapshot): SubscriptionPlanRecord {
  const trialDays = snapshot.planCode === 'trial'
    ? (snapshot.trialEndsAt && snapshot.trialStartsAt
        ? Math.max(1, Math.round((new Date(snapshot.trialEndsAt).getTime() - new Date(snapshot.trialStartsAt).getTime()) / 86400000))
        : 30)
    : 0

  return {
    id: snapshot.planId,
    code: (snapshot.planCode as PlanCode) || 'starter',
    name: snapshot.planName,
    name_bn: snapshot.planNameBn || snapshot.planName || '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    max_users: snapshot.limits.maxUsers,
    max_branches: snapshot.limits.maxBranches,
    storage_gb: snapshot.limits.storageGb,
    monthly_orders: snapshot.limits.monthlyOrders,
    max_customers: snapshot.limits.maxCustomers,
    max_products: snapshot.limits.maxProducts,
    trial_days: trialDays,
    features: (snapshot.features || []) as FeatureCode[],
    is_active: true,
    sort_order: 0,
  }
}

export interface LimitCheckResult {
  allowed: boolean
  reason?: string
  reasonBn?: string
  current: number
  limit: number
  percentage: number
  warning: boolean
  exceeded: boolean
  nextPlan?: SubscriptionPlanRecord
}

interface SubscriptionContextType {
  snapshot: SubscriptionSnapshot | null
  subscription: CompanySubscriptionRecord
  currentPlan: SubscriptionPlanRecord
  currentPlanCode: PlanCode
  accountType: TenantAccountType
  accountTypeMeta: TenantAccountTypeMeta
  allPlans: SubscriptionPlanRecord[]
  usage: TenantResourceUsage
  isLoading: boolean
  isSuspended: boolean
  isPastDue: boolean
  isTrial: boolean
  isTrialExpired: boolean
  isPlanExpired: boolean
  daysRemainingInTrial: number
  daysRemainingInPlan: number
  timeRemainingInTrial: SubscriptionExpiryCountdown
  timeRemainingInPlan: SubscriptionExpiryCountdown
  trialProgressPercent: number
  planExpiresAt: string | null
  trialExpiresAt: string | null
  hasFeature: (feature: FeatureCode) => boolean
  getLimitStatus: (limitType: ConfigurableLimitType) => {
    limit: number
    current: number
    exceeded: boolean
    warning: boolean
    percentage: number
  }
  checkCanCreate: (limitType: ConfigurableLimitType) => LimitCheckResult
  initiateCheckout: (input: Omit<SubscriptionCheckoutInput, 'companyId'>) => Promise<SubscriptionCheckoutResult>
  verifyPayment: (params: { internalTrxId?: string; providerTrxId?: string; gatewayReference?: string; provider?: string }) => Promise<SubscriptionVerificationResult>
  scheduleDowngrade: (nextPlanCode: PlanCode) => Promise<{ success: boolean; effectiveAt?: string; error?: string }>
  cancelSub: (immediately?: boolean, reason?: string) => Promise<{ success: boolean; error?: string }>
  reactivateSub: () => Promise<{ success: boolean; error?: string }>
  refreshSubscription: () => Promise<void>
  // Modal controls
  isUpgradeModalOpen: boolean
  upgradeModalInitialTarget?: PlanCode
  upgradeModalTriggerFeature?: string
  openUpgradeModal: (targetPlanOrFeature?: PlanCode | string) => void
  closeUpgradeModal: () => void
  isLimitExceededModalOpen: boolean
  limitModalType: ConfigurableLimitType | null
  openLimitExceededModal: (limitType: ConfigurableLimitType) => void
  closeLimitExceededModal: () => void
  refreshUsage: () => void
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null)

export function SubscriptionProvider({
  initialSnapshot,
  children,
}: {
  initialSnapshot?: SubscriptionSnapshot | null
  children: React.ReactNode
}) {
  const { company } = useTenant()
  const companyId = company?.id || initialSnapshot?.tenantId || ''
  const companySlug = company?.slug || 'app'

  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(() => initialSnapshot || null)
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>(() => {
    if (initialSnapshot) {
      const snapPlan = snapshotToPlanRecord(initialSnapshot)
      return [snapPlan, ...DEFAULT_PLANS.filter((p) => p.code !== snapPlan.code)]
    }
    return DEFAULT_PLANS
  })
  const [subscription, setSubscription] = useState<CompanySubscriptionRecord>(() => {
    if (initialSnapshot) {
      return snapshotToSubscriptionRecord(initialSnapshot)
    }
    return {
      id: '',
      company_id: companyId,
      plan_id: '',
      plan_code: 'starter',
      plan_name: '',
      plan_name_bn: '',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      trial_ends_at: null,
      payment_method_type: null,
      last_payment_reference: null,
      custom_limits_override: null,
    }
  })
  const [isLoading, setIsLoading] = useState<boolean>(() => !initialSnapshot)

  const refreshSubscription = useCallback(async () => {
    if (!companyId && !companySlug) {
      setIsLoading(false)
      return
    }

    try {
      const [snapshotRes, plansRes] = await Promise.all([
        getAuthoritativeSubscriptionSnapshotAction(companyId, companySlug),
        getPublicSubscriptionPlansAction(),
      ])

      if (plansRes && plansRes.success && plansRes.data?.plans && plansRes.data.plans.length > 0) {
        setPlans(plansRes.data.plans)
      }

      if (snapshotRes && snapshotRes.success && snapshotRes.data) {
        setSnapshot(snapshotRes.data)
        setSubscription(snapshotToSubscriptionRecord(snapshotRes.data))
      }
    } catch {} finally {
      setIsLoading(false)
    }
  }, [companyId, companySlug])

  useEffect(() => {
    refreshSubscription()

    const handlePlansSync = () => {
      refreshSubscription()
    }
    const handleDataSync = (e: Event) => {
      const customEvent = e as CustomEvent
      const key = customEvent.detail?.key
      if (
        key === STORAGE_KEYS.COMPANY_SUBSCRIPTIONS ||
        key === STORAGE_KEYS.PLATFORM_PLANS ||
        key === 'printerp_company_subscriptions' ||
        key === 'printerp_platform_plans' ||
        key === 'plans'
      ) {
        refreshSubscription()
      }
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEYS.COMPANY_SUBSCRIPTIONS ||
        e.key === STORAGE_KEYS.PLATFORM_PLANS ||
        e.key?.includes('subscription') ||
        e.key?.includes('plan')
      ) {
        refreshSubscription()
      }
    }

    window.addEventListener('printerp_plans_sync', handlePlansSync)
    window.addEventListener('printerp_data_sync', handleDataSync)
    window.addEventListener('storage', handleStorageEvent)
    window.addEventListener('printerp_company_subscriptions_updated', handlePlansSync)
    window.addEventListener('printerp_platform_plans_updated', handlePlansSync)

    let busChannel: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        busChannel = new BroadcastChannel('printerp_realtime_bus')
        busChannel.onmessage = (event) => {
          if (
            event.data?.storageKey === STORAGE_KEYS.PLATFORM_PLANS ||
            event.data?.storageKey === STORAGE_KEYS.COMPANY_SUBSCRIPTIONS ||
            event.data?.type === 'LOCAL_STORE_MUTATION' ||
            event.data?.type === 'SUBSCRIPTION_UPDATE' ||
            event.data?.type === 'PLAN_UPDATE'
          ) {
            refreshSubscription()
          }
        }
      }
    } catch {}

    let channel: any = null
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient()
        channel = supabase
          .channel(`tenant_sub_realtime:${companyId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'subscription_plans' },
            () => {
              refreshSubscription()
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'company_subscriptions' },
            () => {
              refreshSubscription()
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'companies' },
            () => {
              refreshSubscription()
            }
          )
          .subscribe()
      }
    } catch {}

    return () => {
      window.removeEventListener('printerp_plans_sync', handlePlansSync)
      window.removeEventListener('printerp_data_sync', handleDataSync)
      window.removeEventListener('storage', handleStorageEvent)
      window.removeEventListener('printerp_company_subscriptions_updated', handlePlansSync)
      window.removeEventListener('printerp_platform_plans_updated', handlePlansSync)
      if (busChannel) {
        try {
          busChannel.close()
        } catch {}
      }
      if (channel && isSupabaseConfigured()) {
        try {
          const supabase = createClient()
          supabase.removeChannel(channel)
        } catch {}
      }
    }
  }, [refreshSubscription, companyId, companySlug])

  // Compute resource usage dynamically
  const [usageTick, setUsageTick] = useState(0)
  const refreshUsage = useCallback(() => {
    setUsageTick((prev) => prev + 1)
  }, [])

  const currentPlan = useMemo(() => {
    if (snapshot) {
      const bySnapshot = plans.find((p) => p.id === snapshot.planId || p.code === snapshot.planCode)
      if (bySnapshot) return bySnapshot
      return snapshotToPlanRecord(snapshot)
    }
    if (subscription.plan_id) {
      const byId = plans.find((p) => p.id === subscription.plan_id)
      if (byId) return byId
    }
    if (subscription.plan_code) {
      const byCode = plans.find((p) => p.code === subscription.plan_code)
      if (byCode) return byCode
    }
    if (subscription.status === 'trial' || subscription.status === 'trialing') {
      return plans.find((p) => p.code === 'trial') || getTrialPlan(plans)
    }
    return plans.find((p) => p.code === 'starter') || DEFAULT_PLANS[1]
  }, [snapshot, plans, subscription.plan_id, subscription.plan_code, subscription.status])

  const currentPlanCode: PlanCode = useMemo(() => {
    if (snapshot?.planCode) return snapshot.planCode as PlanCode
    if (subscription.status === 'trial' || subscription.status === 'trialing' || subscription.plan_code === 'trial') {
      return 'trial'
    }
    if (subscription.plan_code === 'enterprise') return 'enterprise'
    if (subscription.plan_code === 'business') return 'business'
    if (subscription.plan_code === 'starter') return 'starter'
    return (subscription.plan_code as PlanCode) || 'starter'
  }, [snapshot, subscription.plan_code, subscription.status])

  const usage: TenantResourceUsage = useMemo(() => {
    if (typeof window === 'undefined') return DEMO_RESOURCE_USAGE
    return getTenantResourceUsage(companyId, currentPlan, subscription.custom_limits_override)
  }, [companyId, currentPlan, subscription.custom_limits_override, usageTick])

  // Modal dialog states
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [upgradeModalInitialTarget, setUpgradeModalInitialTarget] = useState<PlanCode | undefined>()
  const [upgradeModalTriggerFeature, setUpgradeModalTriggerFeature] = useState<string | undefined>()

  const [isLimitExceededModalOpen, setIsLimitExceededModalOpen] = useState(false)
  const [limitModalType, setLimitModalType] = useState<ConfigurableLimitType | null>(null)

  const openUpgradeModal = useCallback((targetPlanOrFeature?: PlanCode | string) => {
    if (targetPlanOrFeature === 'starter' || targetPlanOrFeature === 'business' || targetPlanOrFeature === 'enterprise') {
      setUpgradeModalInitialTarget(targetPlanOrFeature)
      setUpgradeModalTriggerFeature(undefined)
    } else if (targetPlanOrFeature) {
      setUpgradeModalTriggerFeature(targetPlanOrFeature)
      setUpgradeModalInitialTarget('business')
    } else {
      setUpgradeModalInitialTarget(currentPlanCode === 'trial' || currentPlanCode === 'starter' ? 'business' : 'enterprise')
      setUpgradeModalTriggerFeature(undefined)
    }
    setIsUpgradeModalOpen(true)
  }, [currentPlanCode])

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false)
    setUpgradeModalTriggerFeature(undefined)
  }, [])

  const getLimitStatus = useCallback(
    (limitType: ConfigurableLimitType) => {
      let currentVal = 0
      switch (limitType) {
        case 'max_users':
          currentVal = usage.users_count
          break
        case 'max_branches':
          currentVal = usage.branches_count
          break
        case 'storage_gb':
          currentVal = usage.storage_used_gb
          break
        case 'monthly_orders':
          currentVal = usage.orders_this_month
          break
        case 'max_customers':
          currentVal = usage.customers_count
          break
        case 'max_products':
          currentVal = usage.products_count
          break
      }

      return checkResourceLimit(
        limitType,
        currentVal,
        currentPlan,
        subscription.custom_limits_override
      )
    },
    [usage, currentPlan, subscription.custom_limits_override]
  )

  const openLimitExceededModal = useCallback(
    (limitType: ConfigurableLimitType) => {
      setLimitModalType(limitType)
      setIsLimitExceededModalOpen(true)
      const status = getLimitStatus(limitType)
      const resMap: Record<ConfigurableLimitType, { en: string; bn: string }> = {
        max_users: { en: 'Users', bn: 'ইউজার' },
        max_branches: { en: 'Branches', bn: 'শাখা' },
        monthly_orders: { en: 'Monthly Orders', bn: 'মাসিক অর্ডার' },
        max_customers: { en: 'Customers', bn: 'কাস্টমার' },
        max_products: { en: 'Products', bn: 'প্রোডাক্ট' },
        storage_gb: { en: 'Storage (GB)', bn: 'ক্লাউড স্টোরেজ' },
      }
      const meta = resMap[limitType] || { en: limitType, bn: limitType }
      triggerPopupNotification({
        title: `Plan Limit Reached: ${meta.en}`,
        titleBn: `প্ল্যান লিমিট পূর্ণ: ${meta.bn}`,
        message: `Plan Limit Reached: Your current plan allows up to ${status.limit} ${meta.en} quota (currently at ${status.current}). Please upgrade your subscription to continue.`,
        messageBn: `প্ল্যান লিমিট পূর্ণ: আপনার বর্তমান প্ল্যানে সর্বোচ্চ ${toBengaliDigits(status.limit)} ${meta.bn} কোটা অনুমোদিত (বর্তমানে ${toBengaliDigits(status.current)})। চালিয়ে যেতে অনুগ্রহ করে সাবস্ক্রিপশন আপগ্রেড করুন।`,
        type: 'system',
        actionUrl: `/${companySlug}/settings/subscription`,
      })
    },
    [getLimitStatus, companySlug]
  )

  const closeLimitExceededModal = useCallback(() => {
    setIsLimitExceededModalOpen(false)
    setLimitModalType(null)
  }, [])

  const accountType: TenantAccountType = useMemo(() => {
    if (snapshot?.planCode) {
      if (snapshot.planCode === 'enterprise') return 'enterprise'
      if (snapshot.planCode === 'business') return 'business'
      if (snapshot.planCode === 'starter') return 'starter'
      if (snapshot.planCode === 'trial' || snapshot.status === 'trial') return 'trial'
    }
    return resolveTenantAccountType(subscription)
  }, [snapshot, subscription])

  const accountTypeMeta: TenantAccountTypeMeta = useMemo(() => {
    const base = TENANT_ACCOUNT_TYPE_METADATA[accountType] || TENANT_ACCOUNT_TYPE_METADATA.trial
    if (accountType === 'trial' && currentPlan) {
      const trialDays = currentPlan.trial_days || 14
      return {
        ...base,
        nameEn: currentPlan.name || `Free Trial (${trialDays} Days)`,
        nameBn: currentPlan.name_bn || `${toBengaliDigits(trialDays)} দিনের ফ্রি ট্রায়াল`,
        maxUsers: currentPlan.max_users,
        maxBranches: currentPlan.max_branches,
        descriptionEn: currentPlan.description || base.descriptionEn,
      }
    }
    if (currentPlan) {
      return {
        ...base,
        nameEn: currentPlan.name || base.nameEn,
        nameBn: currentPlan.name_bn || base.nameBn,
        maxUsers: currentPlan.max_users,
        maxBranches: currentPlan.max_branches,
        priceMonthly: currentPlan.price_monthly,
        priceYearly: currentPlan.price_yearly,
        descriptionEn: currentPlan.description || base.descriptionEn,
      }
    }
    return base
  }, [accountType, currentPlan])

  const isSuspended = subscription.status === 'suspended'
  const isPastDue = subscription.status === 'past_due'
  const isTrial = useMemo(() => {
    const effCode = snapshot?.planCode || subscription.plan_code
    const effStatus = snapshot?.status || subscription.status
    if (effCode === 'business' || effCode === 'enterprise' || effCode === 'starter') {
      return false
    }
    if (effStatus === 'active' || effStatus === 'suspended' || effStatus === 'cancelled' || effStatus === 'expired') {
      return false
    }
    return effStatus === 'trial' || effStatus === 'trialing' || effCode === 'trial'
  }, [snapshot?.planCode, snapshot?.status, subscription.plan_code, subscription.status])

  const totalTrialDays = currentPlan?.trial_days || 14

  const [isMounted, setIsMounted] = useState(false)
  const [nowTick, setNowTick] = useState(0)

  useEffect(() => {
    setIsMounted(true)
    setNowTick(Date.now())
    // 60-second background tick instead of aggressive 10s tick to prevent unnecessary re-render cycles
    const timer = setInterval(() => {
      setNowTick(Date.now())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const trialExpiresAt = useMemo(() => {
    if (subscription.trial_ends_at) return subscription.trial_ends_at
    if (isTrial && subscription.current_period_end) return subscription.current_period_end
    if (isTrial) {
      const start = subscription.current_period_start || new Date().toISOString()
      return new Date(new Date(start).getTime() + totalTrialDays * 86400000).toISOString()
    }
    return null
  }, [subscription.trial_ends_at, subscription.current_period_end, subscription.current_period_start, isTrial, totalTrialDays])

  const planExpiresAt = useMemo(() => {
    if (isTrial) return trialExpiresAt
    return subscription.current_period_end || null
  }, [isTrial, trialExpiresAt, subscription.current_period_end])

  const daysRemainingInTrial = useMemo(() => {
    if (!isTrial) return 0
    if (!isMounted || !nowTick) return totalTrialDays
    return getTrialDaysRemaining(trialExpiresAt)
  }, [trialExpiresAt, isTrial, nowTick, isMounted, totalTrialDays])

  const timeRemainingInTrial = useMemo(() => {
    if (!isTrial) return getSubscriptionTimeRemaining(null)
    if (!isMounted || !nowTick) {
      return {
        totalMs: totalTrialDays * 86400000,
        days: totalTrialDays,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: false,
        formattedEn: `${totalTrialDays}d left`,
        formattedBn: `${toBengaliDigits(totalTrialDays)} দিন বাকি`,
        statusBadgeEn: `${totalTrialDays}d left`,
        statusBadgeBn: `${toBengaliDigits(totalTrialDays)} দিন বাকি`,
      }
    }
    return getSubscriptionTimeRemaining(trialExpiresAt)
  }, [trialExpiresAt, isTrial, nowTick, isMounted, totalTrialDays])

  const daysRemainingInPlan = useMemo(() => {
    if (!isMounted || !nowTick) return 30
    return getTrialDaysRemaining(planExpiresAt)
  }, [planExpiresAt, nowTick, isMounted])

  const timeRemainingInPlan = useMemo(() => {
    if (!isMounted || !nowTick) {
      return {
        totalMs: 30 * 86400000,
        days: 30,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: false,
        formattedEn: '30d left',
        formattedBn: '৩০ দিন বাকি',
        statusBadgeEn: '30d left',
        statusBadgeBn: '৩০ দিন বাকি',
      }
    }
    return getSubscriptionTimeRemaining(planExpiresAt)
  }, [planExpiresAt, nowTick, isMounted])

  const isTrialExpired = useMemo(() => {
    return isTrial && (timeRemainingInTrial.isExpired || subscription.status === 'expired')
  }, [isTrial, timeRemainingInTrial.isExpired, subscription.status])

  const isPlanExpired = useMemo(() => {
    return !isTrial && (timeRemainingInPlan.isExpired || subscription.status === 'expired')
  }, [isTrial, timeRemainingInPlan.isExpired, subscription.status])

  const trialProgressPercent = useMemo(() => {
    if (!isTrial || !trialExpiresAt || !isMounted || !nowTick) return 0
    const end = new Date(trialExpiresAt).getTime()
    const start = new Date(subscription.current_period_start || (end - totalTrialDays * 86400000)).getTime()
    const totalDuration = Math.max(1, end - start)
    const elapsed = Math.max(0, (nowTick || Date.now()) - start)
    return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)))
  }, [isTrial, trialExpiresAt, subscription.current_period_start, totalTrialDays, nowTick, isMounted])

  const hasFeature = useCallback(
    (feature: FeatureCode) => {
      if (isTrialExpired || isSuspended || isPlanExpired) return false
      if (snapshot && Array.isArray(snapshot.features)) {
        return snapshot.features.includes(feature)
      }
      if (currentPlan && Array.isArray(currentPlan.features)) {
        return currentPlan.features.includes(feature)
      }
      return checkFeatureAccess(subscription.plan_code, feature, plans)
    },
    [snapshot, currentPlan, subscription.plan_code, plans, isTrialExpired, isSuspended, isPlanExpired]
  )

  const checkCanCreate = useCallback(
    (limitType: ConfigurableLimitType): LimitCheckResult => {
      if (isSuspended) {
        return {
          allowed: false,
          reason: 'Tenant account is suspended by platform administration.',
          reasonBn: 'প্ল্যাটফর্ম অ্যাডমিন দ্বারা অ্যাকাউন্ট স্থগিত করা হয়েছে।',
          current: 0,
          limit: 0,
          percentage: 100,
          warning: true,
          exceeded: true,
        }
      }

      if (isTrialExpired) {
        return {
          allowed: false,
          reason: `Your ${totalTrialDays}-day free trial has expired. Upgrade your plan to continue adding records.`,
          reasonBn: `আপনার ${toBengaliDigits(totalTrialDays)} দিনের ফ্রি ট্রায়ালের মেয়াদ শেষ হয়েছে। কাজ চালিয়ে যেতে প্ল্যান আপগ্রেড করুন।`,
          current: 0,
          limit: 0,
          percentage: 100,
          warning: true,
          exceeded: true,
          nextPlan: getNextTierPlan(currentPlanCode, plans),
        }
      }

      if (isPlanExpired) {
        return {
          allowed: false,
          reason: `Your subscription plan (${currentPlan?.name || 'Current Plan'}) has expired. Please renew or upgrade your subscription to continue adding records.`,
          reasonBn: `আপনার সাবস্ক্রিপশন প্ল্যানের (${currentPlan?.name_bn || 'বর্তমান প্ল্যান'}) মেয়াদ শেষ হয়েছে। কাজ চালিয়ে যেতে অনুগ্রহ করে সাবস্ক্রিপশন নবায়ন বা আপগ্রেড করুন।`,
          current: 0,
          limit: 0,
          percentage: 100,
          warning: true,
          exceeded: true,
          nextPlan: getNextTierPlan(currentPlanCode, plans),
        }
      }

      const status = getLimitStatus(limitType)
      const nextPlan = getNextTierPlan(currentPlanCode, plans)

      if (status.exceeded) {
        const resourceMap: Record<ConfigurableLimitType, { en: string; bn: string }> = {
          max_users: { en: 'Users', bn: 'ইউজার' },
          max_branches: { en: 'Branches', bn: 'শাখা' },
          monthly_orders: { en: 'Monthly Orders', bn: 'মাসিক অর্ডার' },
          max_customers: { en: 'Customers', bn: 'কাস্টমার' },
          max_products: { en: 'Products', bn: 'প্রোডাক্ট' },
          storage_gb: { en: 'Storage (GB)', bn: 'ক্লাউড স্টোরেজ' },
        }
        const res = resourceMap[limitType] || { en: limitType, bn: limitType }
        const limitDisplayBn = toBengaliDigits(status.limit)
        const currentDisplayBn = toBengaliDigits(status.current)
        return {
          allowed: false,
          reason: `Plan Limit Reached: Your current plan allows up to ${status.limit} ${res.en} quota (currently at ${status.current}). Please upgrade your subscription to continue.`,
          reasonBn: `প্ল্যান লিমিট পূর্ণ: আপনার বর্তমান প্ল্যানে সর্বোচ্চ ${limitDisplayBn} ${res.bn} কোটা অনুমোদিত (বর্তমানে ${currentDisplayBn})। চালিয়ে যেতে অনুগ্রহ করে সাবস্ক্রিপশন আপগ্রেড করুন।`,
          current: status.current,
          limit: status.limit,
          percentage: status.percentage,
          warning: true,
          exceeded: true,
          nextPlan,
        }
      }

      return {
        allowed: true,
        current: status.current,
        limit: status.limit,
        percentage: status.percentage,
        warning: status.warning,
        exceeded: false,
        nextPlan,
      }
    },
    [isSuspended, isTrialExpired, getLimitStatus, currentPlan, currentPlanCode, plans, totalTrialDays]
  )

  // Real Gateway Checkout Initiation
  const initiateCheckout = async (
    input: Omit<SubscriptionCheckoutInput, 'companyId'>
  ): Promise<SubscriptionCheckoutResult> => {
    const res = await initiateSubscriptionCheckoutAction({
      ...input,
      companyId,
    })

    if (res.success && res.data) {
      return res.data
    }

    return {
      success: false,
      error: res.error || 'Failed to initiate checkout',
    }
  }

  // Real Server-Side Payment Verification
  const verifyPayment = async (params: {
    internalTrxId?: string
    providerTrxId?: string
    gatewayReference?: string
    provider?: string
  }): Promise<SubscriptionVerificationResult> => {
    const res = await verifySubscriptionPaymentAction(params)
    if (res.success && res.data) {
      await refreshSubscription()
      refreshUsage()
      return res.data
    }

    return {
      success: false,
      status: 'failed',
      error: res.error || 'Payment verification failed',
    }
  }

  // Schedule Downgrade at period end
  const scheduleDowngrade = async (nextPlanCode: PlanCode) => {
    const res = await schedulePlanDowngradeAction(nextPlanCode, companyId)
    if (res.success) {
      await refreshSubscription()
      return { success: true, effectiveAt: res.data?.effectiveAt }
    }
    return { success: false, error: res.error }
  }

  // Cancel subscription
  const cancelSub = async (immediately = false, reason?: string) => {
    const res = await cancelSubscriptionAction(immediately, reason, companyId)
    if (res.success) {
      await refreshSubscription()
      return { success: true }
    }
    return { success: false, error: res.error }
  }

  // Reactivate subscription
  const reactivateSub = async () => {
    const res = await reactivateSubscriptionAction(companyId)
    if (res.success) {
      await refreshSubscription()
      return { success: true }
    }
    return { success: false, error: res.error }
  }

  return (
    <SubscriptionContext.Provider
      value={{
        snapshot,
        isLoading,
        subscription,
        currentPlan,
        currentPlanCode,
        accountType,
        accountTypeMeta,
        allPlans: plans,
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
        trialProgressPercent,
        planExpiresAt,
        trialExpiresAt,
        hasFeature,
        getLimitStatus,
        checkCanCreate,
        initiateCheckout,
        verifyPayment,
        scheduleDowngrade,
        cancelSub,
        reactivateSub,
        refreshSubscription,
        isUpgradeModalOpen,
        upgradeModalInitialTarget,
        upgradeModalTriggerFeature,
        openUpgradeModal,
        closeUpgradeModal,
        isLimitExceededModalOpen,
        limitModalType,
        openLimitExceededModal,
        closeLimitExceededModal,
        refreshUsage,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) {
    const livePlans = DEFAULT_PLANS
    const liveTrialPlan = livePlans.find((p: SubscriptionPlanRecord) => p.code === 'trial') || DEFAULT_TRIAL_PLAN
    const trialDays = liveTrialPlan.trial_days || 14
    const accType: TenantAccountType = 'trial'
    const trialEndsAt = new Date(Date.now() + trialDays * 86400000).toISOString()
    const timeRemaining = getSubscriptionTimeRemaining(trialEndsAt)
    return {
      snapshot: null,
      isLoading: false,
      subscription: {
        id: 'sub-standalone',
        company_id: 'default',
        plan_id: liveTrialPlan.id,
        plan_code: 'trial' as PlanCode,
        status: 'trial' as const,
        billing_interval: 'monthly' as const,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        trial_ends_at: trialEndsAt,
        payment_method_type: null,
        last_payment_reference: null,
        custom_limits_override: null,
        cancel_at_period_end: false,
        next_plan_id: null,
        change_effective_at: null,
      } as CompanySubscriptionRecord,
      currentPlan: liveTrialPlan,
      currentPlanCode: 'trial' as PlanCode,
      accountType: accType,
      accountTypeMeta: {
        type: 'trial' as const,
        nameEn: liveTrialPlan.name || `Free Trial (${trialDays} Days)`,
        nameBn: liveTrialPlan.name_bn || `${toBengaliDigits(trialDays)} দিনের ফ্রি ট্রায়াল`,
        badgeTextEn: 'Trial',
        badgeTextBn: 'ফ্রি ট্রায়াল',
        color: 'amber' as const,
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
        priceMonthly: 0,
        priceYearly: 0,
        maxUsers: liveTrialPlan.max_users,
        maxBranches: liveTrialPlan.max_branches,
        descriptionEn: liveTrialPlan.description || '',
        descriptionBn: liveTrialPlan.name_bn || '',
      } as TenantAccountTypeMeta,
      allPlans: livePlans,
      usage: {
        users_count: 1,
        users_limit: liveTrialPlan.max_users,
        branches_count: 1,
        branches_limit: liveTrialPlan.max_branches,
        storage_used_gb: 0.1,
        storage_limit_gb: liveTrialPlan.storage_gb,
        orders_this_month: 0,
        orders_limit: liveTrialPlan.monthly_orders,
        customers_count: 0,
        customers_limit: liveTrialPlan.max_customers,
        products_count: 0,
        products_limit: liveTrialPlan.max_products,
      },
      isSuspended: false,
      isPastDue: false,
      isTrial: true,
      isTrialExpired: false,
      isPlanExpired: false,
      daysRemainingInTrial: trialDays,
      daysRemainingInPlan: trialDays,
      timeRemainingInTrial: timeRemaining,
      timeRemainingInPlan: timeRemaining,
      trialProgressPercent: 0,
      planExpiresAt: trialEndsAt,
      trialExpiresAt: trialEndsAt,
      hasFeature: (feature: FeatureCode) => checkFeatureAccess('trial', feature, livePlans),
      getLimitStatus: (limitType: ConfigurableLimitType) =>
        checkResourceLimit(limitType, 1, liveTrialPlan),
      checkCanCreate: (limitType: ConfigurableLimitType): LimitCheckResult => {
        const res = checkResourceLimit(limitType, 1, liveTrialPlan)
        return {
          allowed: res.allowed,
          current: res.current,
          limit: res.limit,
          percentage: res.percentage,
          warning: res.warning,
          exceeded: res.exceeded,
        }
      },
      initiateCheckout: async () => ({ success: false, error: 'Provider not initialized' }),
      verifyPayment: async () => ({ success: false, status: 'failed' as const, error: 'Provider not initialized' }),
      scheduleDowngrade: async () => ({ success: false, error: 'Provider not initialized' }),
      cancelSub: async () => ({ success: false, error: 'Provider not initialized' }),
      reactivateSub: async () => ({ success: false, error: 'Provider not initialized' }),
      refreshSubscription: async () => {},
      isUpgradeModalOpen: false,
      upgradeModalInitialTarget: undefined,
      upgradeModalTriggerFeature: undefined,
      openUpgradeModal: () => {},
      closeUpgradeModal: () => {},
      isLimitExceededModalOpen: false,
      limitModalType: null,
      openLimitExceededModal: () => {},
      closeLimitExceededModal: () => {},
      refreshUsage: () => {},
    }
  }
  return ctx
}
