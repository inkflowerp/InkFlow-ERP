'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
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
  if (num === undefined || num === null) return ''
  return String(num)
    .split('')
    .map((char) => BENGALI_DIGITS[char] || char)
    .join('')
}

export interface PublicPlansContextType {
  plans: SubscriptionPlanRecord[]
  trialPlan: SubscriptionPlanRecord
  trialDays: number
  trialDaysBn: string
  paidPlans: SubscriptionPlanRecord[]
  starterPlan: SubscriptionPlanRecord
  businessPlan: SubscriptionPlanRecord
  enterprisePlan: SubscriptionPlanRecord
  lowestPrice: number
  isLoading: boolean
  refreshPlans: () => Promise<void>
  toBengaliDigits: (num: number | string | undefined | null) => string
}

const PublicPlansContext = createContext<PublicPlansContextType | null>(null)

// Global memory cache to prevent flashes during client-side SPA transitions
let cachedPlansData: PublicPlansData | null = null

export function PublicPlansProvider({
  initialData,
  children,
}: {
  initialData?: PublicPlansData | null
  children: React.ReactNode
}) {
  const seed = initialData || cachedPlansData
  if (initialData) {
    cachedPlansData = initialData
  }

  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>(() => seed?.plans || DEFAULT_PLANS)
  const [trialPlan, setTrialPlan] = useState<SubscriptionPlanRecord>(() => seed?.trialPlan || DEFAULT_TRIAL_PLAN)
  const [trialDays, setTrialDays] = useState<number>(() => seed?.trialDays || seed?.trialPlan?.trial_days || 14)
  const [paidPlans, setPaidPlans] = useState<SubscriptionPlanRecord[]>(() => {
    if (seed?.paidPlans && seed.paidPlans.length > 0) return seed.paidPlans
    return DEFAULT_PLANS.filter((p) => p.code !== 'trial')
  })
  const [lowestPrice, setLowestPrice] = useState<number>(() => seed?.lowestPrice || 1999)
  const [isLoading, setIsLoading] = useState<boolean>(!seed)

  const applyPlansData = useCallback((data: PublicPlansData) => {
    cachedPlansData = data
    setPlans(data.plans)
    setTrialPlan(data.trialPlan)
    setTrialDays(data.trialDays || data.trialPlan?.trial_days || 14)
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
      // Fallback gracefully
    } finally {
      setIsLoading(false)
    }
  }, [applyPlansData])

  useEffect(() => {
    // If no initialData provided, or to keep fresh in background:
    if (!initialData) {
      fetchPlans()
    }

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
    } catch {}

    return () => {
      window.removeEventListener('printerp_plans_sync', handlePlansSync)
      window.removeEventListener('printerp_data_sync', handleDataSync)
      if (channel) {
        try {
          const supabase = createClient()
          supabase.removeChannel(channel)
        } catch {}
      }
    }
  }, [fetchPlans, initialData])

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

  const trialDaysBn = useMemo(() => toBengaliDigits(trialDays), [trialDays])

  const value = useMemo<PublicPlansContextType>(
    () => ({
      plans,
      trialPlan,
      trialDays,
      trialDaysBn,
      paidPlans,
      starterPlan,
      businessPlan,
      enterprisePlan,
      lowestPrice,
      isLoading,
      refreshPlans: fetchPlans,
      toBengaliDigits,
    }),
    [
      plans,
      trialPlan,
      trialDays,
      trialDaysBn,
      paidPlans,
      starterPlan,
      businessPlan,
      enterprisePlan,
      lowestPrice,
      isLoading,
      fetchPlans,
    ]
  )

  return <PublicPlansContext.Provider value={value}>{children}</PublicPlansContext.Provider>
}

export function usePublicSubscriptionPlans(initialData?: PublicPlansData | null) {
  const context = useContext(PublicPlansContext)
  if (context) {
    return context
  }

  // Fallback standalone hook if used outside PublicPlansProvider
  const seed = initialData || cachedPlansData
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>(() => seed?.plans || DEFAULT_PLANS)
  const [trialPlan, setTrialPlan] = useState<SubscriptionPlanRecord>(() => seed?.trialPlan || DEFAULT_TRIAL_PLAN)
  const [trialDays, setTrialDays] = useState<number>(() => seed?.trialDays || seed?.trialPlan?.trial_days || 14)
  const [paidPlans, setPaidPlans] = useState<SubscriptionPlanRecord[]>(() => {
    if (seed?.paidPlans && seed.paidPlans.length > 0) return seed.paidPlans
    return DEFAULT_PLANS.filter((p) => p.code !== 'trial')
  })
  const [lowestPrice, setLowestPrice] = useState<number>(() => seed?.lowestPrice || 1999)
  const [isLoading, setIsLoading] = useState<boolean>(!seed)

  const applyPlansData = useCallback((data: PublicPlansData) => {
    cachedPlansData = data
    setPlans(data.plans)
    setTrialPlan(data.trialPlan)
    setTrialDays(data.trialDays || data.trialPlan?.trial_days || 14)
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
    } finally {
      setIsLoading(false)
    }
  }, [applyPlansData])

  useEffect(() => {
    if (!seed) {
      fetchPlans()
    }

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

    let channel: any = null
    try {
      const supabase = createClient()
      channel = supabase
        .channel('public:marketing_subscription_plans_standalone')
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
    } catch {}

    return () => {
      window.removeEventListener('printerp_plans_sync', handlePlansSync)
      window.removeEventListener('printerp_data_sync', handleDataSync)
      if (channel) {
        try {
          const supabase = createClient()
          supabase.removeChannel(channel)
        } catch {}
      }
    }
  }, [fetchPlans, seed])

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

  const trialDaysBn = useMemo(() => toBengaliDigits(trialDays), [trialDays])

  return {
    plans,
    trialPlan,
    trialDays,
    trialDaysBn,
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
