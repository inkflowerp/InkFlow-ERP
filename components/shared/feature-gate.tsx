'use client'

import React from 'react'
import { FeatureCode } from '@/types/subscription.types'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureGate as SubscriptionFeatureGate } from '@/components/subscriptions/feature-gate'
import { UpgradePrompt } from '@/components/subscriptions/upgrade-prompt'

export { useFeatureGate, UpgradePrompt }

interface FeatureGateProps {
  feature: FeatureCode
  children: React.ReactNode
  fallback?: React.ReactNode
  hideIfForbidden?: boolean
  compact?: boolean
  className?: string
}

export function FeatureGate({
  feature,
  children,
  fallback,
  hideIfForbidden = false,
  compact = false,
  className = '',
}: FeatureGateProps) {
  return (
    <SubscriptionFeatureGate
      feature={feature}
      fallback={fallback}
      hideIfForbidden={hideIfForbidden}
      compact={compact}
      className={className}
    >
      {children}
    </SubscriptionFeatureGate>
  )
}

