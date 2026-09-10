'use client'

import { useMemo } from 'react'
import { FeatureCode } from '@/types/subscription.types'
import {
  checkFeatureAccess,
  FEATURE_METADATA,
  getMinimumPlanForFeature,
  FeatureMeta,
} from '@/lib/subscription/subscription-constants'
import { useSubscription } from './use-subscription'

export interface FeatureGateResult {
  hasAccess: boolean
  currentPlanCode: string
  requiredPlan: {
    code: string
    name: string
    name_bn: string
    price_monthly: number
  }
  featureMeta: FeatureMeta
}

export function useFeatureGate(feature: FeatureCode): FeatureGateResult {
  const { currentPlanCode, allPlans, hasFeature, isTrialExpired, isSuspended } = useSubscription()

  return useMemo(() => {
    const hasAccess = hasFeature(feature)
    const featureMeta = FEATURE_METADATA[feature] || {
      code: feature,
      name: feature,
      name_bn: feature,
      description: 'Platform enterprise feature',
      minPlan: 'business',
      category: 'advanced',
    }
    const minPlan = getMinimumPlanForFeature(feature)

    return {
      hasAccess,
      currentPlanCode,
      requiredPlan: {
        code: minPlan.code,
        name: minPlan.name,
        name_bn: minPlan.name_bn,
        price_monthly: minPlan.price_monthly,
      },
      featureMeta,
    }
  }, [currentPlanCode, feature, allPlans, hasFeature, isTrialExpired, isSuspended])
}
