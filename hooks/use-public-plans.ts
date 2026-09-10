'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getPublicSubscriptionPlansAction, PublicPlansData } from '@/actions/subscription.actions'
import { DEFAULT_PLANS, DEFAULT_TRIAL_PLAN } from '@/lib/subscription/subscription-constants'
import { SubscriptionPlanRecord } from '@/types/subscription.types'
import { createClient } from '@/lib/supabase/client'

// Bengali numeral translation map
const BENGALI_DIGITS: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
}

export function toBengaliDigits(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '১৪'
  return String(num)
    .split('')
    .map((char) => BENGALI_DIGITS[char] || char)
    .join('')
}

export function usePublicSubscriptionPlans(initialData?: PublicPlansData | null) {
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>(() => initialData?.plans || DEFAULT_PLANS)
  const [trialPlan, setTrialPlan] = useState<SubscriptionPlanRecord>(() => initialData?.trialPlan || DEFAULT_TRIAL_PLAN)
  const [trialDays, setTrialDays] = useState<number>(() => initialData?.trialDays || 14)
  const [paidPlans, setPaidPlans] = useState<SubscriptionPlanRecord[]>(() => {
    if (initialData?.paidPlans && initialData.paidPlans.length > 0) return initialData.paidPlans
    return DEFAULT_PLANS.filter((p) => p.code !== 'trial')
  })
  const [lowestPrice, setLowestPrice] = useState<number>(() => initialData?.lowestPrice || 1999)
  const [isLoading, setIsLoading] = useState<boolean>(!initialData)

  const applyPlansData = useCallback((data: PublicPlansData) => {
    setPlans(data.plans)
    setTrialPlan(data.trialPlan)
    setTrialDays(data.trialDays || 14)
    setPaidPlans(data.paidPlans)
    setLowestPrice(data.lowestPrice || 1999)
  }, [])

  const fetchPlans = useCallback(async () => {
    try {
      const res = await getPublicSubscriptionPlansAction()
      if (res.success && res.data) {
        applyPlansData(res.data)
      }
    } catch {
      // Fallback gracefully to default constants
    } finally {
      setIsLoading(false)
    }
  }, [applyPlansData])

  useEffect(() => {
    fetchPlans()

    // 1. Same-session custom event listeners
    const handlePlansSync = () => {
      fetchPlans()
    }

    const handleDataSync = (e: Event) => {
      const customEvent = e as CustomEvent
      if (
        !customEvent.detail?.key ||
        customEvent.detail?.key.includes('plan') ||
        customEvent.detail?.key.includes('subscription')
      ) {
        fetchPlans()
      }
    }

    window.addEventListener('printerp_plans_sync', handlePlansSync)
    window.addEventListener('printerp_data_sync', handleDataSync)

    // 2. Supabase Realtime channel for instant multi-tab & cross-client live updates
    let channel: any = null
    try {
      const supabase = createClient()
      channel = supabase
        .channel('public:marketing_subscription_plans')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'subscription_plans' },
          () => {
            fetchPlans()
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'platform_system_settings' },
          () => {
            fetchPlans()
          }
        )
        .subscribe()
    } catch {
      // Non-blocking in offline/restricted network environments
    }

    return () => {
      window.removeEventListener('printerp_plans_sync', handlePlansSync)
      window.removeEventListener('printerp_data_sync', handleDataSync)
      if (channel) {
        try {
          const supabase = createClient()
          supabase.removeChannel(channel)
        } catch {
          // Ignore
        }
      }
    }
  }, [fetchPlans])

  const starterPlan = useMemo(
    () => paidPlans.find((p) => p.code === 'starter') || paidPlans[0] || DEFAULT_PLANS[1],
    [paidPlans]
  )

  const businessPlan = useMemo(
    () => paidPlans.find((p) => p.code === 'business') || paidPlans[1] || DEFAULT_PLANS[2],
    [paidPlans]
  )

  const enterprisePlan = useMemo(
    () => paidPlans.find((p) => p.code === 'enterprise') || paidPlans[2] || DEFAULT_PLANS[3],
    [paidPlans]
  )

  return {
    plans,
    trialPlan,
    trialDays,
    paidPlans,
    starterPlan,
    businessPlan,
    enterprisePlan,
    lowestPrice,
    isLoading,
    refreshPlans: fetchPlans,
    toBengaliDigits,
  }
}
