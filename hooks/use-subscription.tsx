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
} from '@/lib/subscription/subscription-constants'
import { FeatureCode } from '@/types/subscription.types'
import { useTenant } from '@/hooks/use-tenant'
import {
  getTenantSubscriptionAction,
  getPublicSubscriptionPlansAction,
  initiateSubscriptionCheckoutAction,
  verifySubscriptionPaymentAction,
  schedulePlanDowngradeAction,
  cancelSubscriptionAction,
  reactivateSubscriptionAction,
} from '@/actions/subscription.actions'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export interface LimitCheckResult {
  allowed: boolean
  reason?: string
  current: number
  limit: number
  percentage: number
  warning: boolean
  exceeded: boolean
  nextPlan?: SubscriptionPlanRecord
}

interface SubscriptionContextType {
  subscription: CompanySubscriptionRecord
  currentPlan: SubscriptionPlanRecord
  currentPlanCode: PlanCode
  accountType: TenantAccountType
  accountTypeMeta: TenantAccountTypeMeta
  allPlans: SubscriptionPlanRecord[]
  usage: TenantResourceUsage
  isSuspended: boolean
  isPastDue: boolean
  isTrial: boolean
  isTrialExpired: boolean
  daysRemainingInTrial: number
  trialProgressPercent: number
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

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { company } = useTenant()
  const companyId = company?.id || 'default'
  const companySlug = company?.slug || 'app'

  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>(DEFAULT_PLANS)
  const [subscription, setSubscription] = useState<CompanySubscriptionRecord>(() => {
    if (typeof window !== 'undefined') {
      try {
        const localSubs = PrintERPDataStore.get<CompanySubscriptionRecord[]>(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS) || []
        const found = localSubs.find((s) => s.company_id === companyId || s.company_id === `co-${companySlug}`)
        if (found) return found
      } catch {}
    }
    return {
      ...DEFAULT_TENANT_SUBSCRIPTION,
      id: `sub-${companyId}`,
      company_id: companyId,
    }
  })

  const refreshSubscription = useCallback(async () => {
    try {
      const [subRes, plansRes] = await Promise.all([
        getTenantSubscriptionAction(companyId, companySlug),
        getPublicSubscriptionPlansAction(),
      ])
      if (subRes.success && subRes.data) {
        setSubscription(subRes.data)
      }
      if (plansRes.success && plansRes.data?.plans && plansRes.data.plans.length > 0) {
        setPlans(plansRes.data.plans)
      }
    } catch {}
  }, [companyId, companySlug])

  useEffect(() => {
    refreshSubscription()
  }, [refreshSubscription])

  // Compute resource usage dynamically
  const [usageTick, setUsageTick] = useState(0)
  const refreshUsage = useCallback(() => {
    setUsageTick((prev) => prev + 1)
  }, [])

  const currentPlan = useMemo(() => {
    if (subscription.plan_code === 'trial' || subscription.status === 'trial') {
      return plans.find((p) => p.code === 'trial') || getTrialPlan(plans)
    }
    return plans.find((p) => p.code === subscription.plan_code) || getTrialPlan(plans)
  }, [plans, subscription.plan_code, subscription.status])

  const currentPlanCode: PlanCode = useMemo(() => {
    if (subscription.plan_code === 'trial' || subscription.status === 'trial') {
      return 'trial'
    }
    return subscription.plan_code
  }, [subscription.plan_code, subscription.status])

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

  const openLimitExceededModal = useCallback((limitType: ConfigurableLimitType) => {
    setLimitModalType(limitType)
    setIsLimitExceededModalOpen(true)
  }, [])

  const closeLimitExceededModal = useCallback(() => {
    setIsLimitExceededModalOpen(false)
    setLimitModalType(null)
  }, [])

  const accountType: TenantAccountType = useMemo(() => {
    return resolveTenantAccountType(subscription)
  }, [subscription])

  const accountTypeMeta: TenantAccountTypeMeta = useMemo(() => {
    return TENANT_ACCOUNT_TYPE_METADATA[accountType] || TENANT_ACCOUNT_TYPE_METADATA.trial
  }, [accountType])

  const isSuspended = subscription.status === 'suspended'
  const isPastDue = subscription.status === 'past_due'
  const isTrial = subscription.status === 'trial' || subscription.plan_code === 'trial'

  const totalTrialDays = currentPlan?.trial_days || 14
  const daysRemainingInTrial = useMemo(() => {
    return getTrialDaysRemaining(subscription.trial_ends_at, isTrial ? totalTrialDays : 0)
  }, [subscription.trial_ends_at, isTrial, totalTrialDays])

  const isTrialExpired = useMemo(() => {
    return isTrial && (daysRemainingInTrial <= 0 || subscription.status === 'expired')
  }, [isTrial, daysRemainingInTrial, subscription.status])

  const trialProgressPercent = useMemo(() => {
    if (!isTrial) return 0
    const elapsed = Math.max(0, totalTrialDays - daysRemainingInTrial)
    return Math.min(100, Math.round((elapsed / totalTrialDays) * 100))
  }, [isTrial, totalTrialDays, daysRemainingInTrial])

  const hasFeature = useCallback(
    (feature: FeatureCode) => {
      if (isTrialExpired || isSuspended) return false
      return checkFeatureAccess(subscription.plan_code, feature, plans)
    },
    [subscription.plan_code, plans, isTrialExpired, isSuspended]
  )

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

  const checkCanCreate = useCallback(
    (limitType: ConfigurableLimitType): LimitCheckResult => {
      if (isSuspended) {
        return {
          allowed: false,
          reason: 'Tenant account is suspended by platform administration.',
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
        return {
          allowed: false,
          reason: `You have reached the ${limitType.replace('_', ' ')} limit (${status.current}/${status.limit}) for your ${currentPlan.name}.`,
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
    [isSuspended, isTrialExpired, getLimitStatus, currentPlan, currentPlanCode, plans]
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
        daysRemainingInTrial,
        trialProgressPercent,
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
    const defaultPlan = DEFAULT_TRIAL_PLAN
    const accType: TenantAccountType = 'trial'
    return {
      subscription: DEMO_TENANT_SUBSCRIPTION,
      currentPlan: defaultPlan,
      currentPlanCode: 'trial' as PlanCode,
      accountType: accType,
      accountTypeMeta: TENANT_ACCOUNT_TYPE_METADATA.trial,
      allPlans: DEFAULT_PLANS,
      usage: DEMO_RESOURCE_USAGE,
      isSuspended: false,
      isPastDue: false,
      isTrial: true,
      isTrialExpired: false,
      daysRemainingInTrial: 14,
      trialProgressPercent: 0,
      hasFeature: (feature: FeatureCode) => checkFeatureAccess('trial', feature, DEFAULT_PLANS),
      getLimitStatus: (limitType: ConfigurableLimitType) =>
        checkResourceLimit(limitType, 1, defaultPlan),
      checkCanCreate: () => ({
        allowed: true,
        current: 1,
        limit: 5,
        percentage: 20,
        warning: false,
        exceeded: false,
      }),
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
