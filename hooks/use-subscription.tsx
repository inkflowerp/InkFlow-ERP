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
  resolveTenantAccountType,
} from '@/types/subscription.types'
import {
  DEFAULT_PLANS,
  DEMO_TENANT_SUBSCRIPTION,
  DEMO_RESOURCE_USAGE,
  TENANT_ACCOUNT_TYPE_METADATA,
  checkFeatureAccess,
  checkResourceLimit,
  getTenantResourceUsage,
} from '@/services/subscription.service'
import { FeatureCode } from '@/types/subscription.types'

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
  daysRemainingInTrial: number
  hasFeature: (feature: FeatureCode) => boolean
  getLimitStatus: (limitType: ConfigurableLimitType) => {
    limit: number
    current: number
    exceeded: boolean
    warning: boolean
    percentage: number
  }
  upgradeSubscription: (params: {
    planCode: PlanCode
    interval: BillingInterval
    paymentMethod: PaymentGatewayType
    reference: string
  }) => Promise<boolean>
  simulatePlan: (planCode: PlanCode) => void
  simulateStatus: (status: CompanySubscriptionRecord['status']) => void
  simulateAccountType: (accountType: TenantAccountType) => void
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null)

const STORAGE_KEY_SUB = 'printerp_tenant_sub'
const STORAGE_KEY_PLANS = 'printerp_plans'

import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [plans] = useState<SubscriptionPlanRecord[]>(DEFAULT_PLANS)
  const [subscription, setSubscription] = useState<CompanySubscriptionRecord>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_SUB)
        if (saved) return JSON.parse(saved)
      } catch {
        // fallback
      }
    }
    return DEMO_TENANT_SUBSCRIPTION
  })
  const [usage] = useState<TenantResourceUsage>(() => {
    if (typeof window !== 'undefined') {
      try {
        return getTenantResourceUsage(subscription.company_id || 'default')
      } catch {
        // ignore
      }
    }
    return DEMO_RESOURCE_USAGE
  })

  // Persist subscription updates to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_SUB, JSON.stringify(subscription))
      } catch {
        // ignore
      }
    }
  }, [subscription])

  const currentPlan = useMemo(() => {
    return plans.find((p) => p.code === subscription.plan_code) || plans[1]
  }, [plans, subscription.plan_code])

  const accountType: TenantAccountType = useMemo(() => {
    return resolveTenantAccountType(subscription)
  }, [subscription])

  const accountTypeMeta: TenantAccountTypeMeta = useMemo(() => {
    return TENANT_ACCOUNT_TYPE_METADATA[accountType] || TENANT_ACCOUNT_TYPE_METADATA.starter
  }, [accountType])

  const isSuspended = subscription.status === 'suspended'
  const isPastDue = subscription.status === 'past_due'
  const isTrial = subscription.status === 'trial'

  const daysRemainingInTrial = useMemo(() => {
    if (!subscription.trial_ends_at) return 0
    const diff = new Date(subscription.trial_ends_at).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [subscription.trial_ends_at])

  const hasFeature = useCallback(
    (feature: FeatureCode) => {
      return checkFeatureAccess(subscription.plan_code, feature, plans)
    },
    [subscription.plan_code, plans]
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

  const upgradeSubscription = async ({
    planCode,
    interval,
    paymentMethod,
    reference,
  }: {
    planCode: PlanCode
    interval: BillingInterval
    paymentMethod: PaymentGatewayType
    reference: string
  }): Promise<boolean> => {
    const nextMonth = new Date()
    if (interval === 'yearly') {
      nextMonth.setFullYear(nextMonth.getFullYear() + 1)
    } else {
      nextMonth.setMonth(nextMonth.getMonth() + 1)
    }

    const updated: CompanySubscriptionRecord = {
      ...subscription,
      plan_code: planCode,
      status: 'active',
      billing_interval: interval,
      current_period_start: new Date().toISOString(),
      current_period_end: nextMonth.toISOString(),
      trial_ends_at: null,
      payment_method_type: paymentMethod,
      last_payment_reference: reference,
    }

    setSubscription(updated)
    return true
  }

  const simulatePlan = useCallback(
    (planCode: PlanCode) => {
      setSubscription((prev) => ({
        ...prev,
        plan_code: planCode,
      }))
    },
    []
  )

  const simulateStatus = useCallback(
    (status: CompanySubscriptionRecord['status']) => {
      setSubscription((prev) => ({
        ...prev,
        status,
      }))
    },
    []
  )

  const simulateAccountType = useCallback(
    (accType: TenantAccountType) => {
      if (accType === 'trial') {
        setSubscription((prev) => ({
          ...prev,
          status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
        }))
      } else {
        setSubscription((prev) => ({
          ...prev,
          plan_code: accType,
          status: 'active',
          trial_ends_at: null,
        }))
      }
    },
    []
  )

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        currentPlan,
        currentPlanCode: subscription.plan_code,
        accountType,
        accountTypeMeta,
        allPlans: plans,
        usage,
        isSuspended,
        isPastDue,
        isTrial,
        daysRemainingInTrial,
        hasFeature,
        getLimitStatus,
        upgradeSubscription,
        simulatePlan,
        simulateStatus,
        simulateAccountType,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) {
    const defaultPlan = DEFAULT_PLANS[1]
    const accType: TenantAccountType = 'business'
    return {
      subscription: DEMO_TENANT_SUBSCRIPTION,
      currentPlan: defaultPlan,
      currentPlanCode: 'business' as PlanCode,
      accountType: accType,
      accountTypeMeta: TENANT_ACCOUNT_TYPE_METADATA.business,
      allPlans: DEFAULT_PLANS,
      usage: DEMO_RESOURCE_USAGE,
      isSuspended: false,
      isPastDue: false,
      isTrial: false,
      daysRemainingInTrial: 0,
      hasFeature: (feature: FeatureCode) => checkFeatureAccess('business', feature, DEFAULT_PLANS),
      getLimitStatus: (limitType: ConfigurableLimitType) =>
        checkResourceLimit(limitType, 1, defaultPlan),
      upgradeSubscription: async () => true,
      simulatePlan: () => {},
      simulateStatus: () => {},
      simulateAccountType: () => {},
    }
  }
  return ctx
}
