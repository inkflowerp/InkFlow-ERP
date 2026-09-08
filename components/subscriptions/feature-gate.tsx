'use client'

import React from 'react'
import { FeatureCode } from '@/types/subscription.types'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { UpgradePrompt } from './upgrade-prompt'

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
  const { hasAccess } = useFeatureGate(feature)

  if (hasAccess) {
    return <>{children}</>
  }

  if (hideIfForbidden) {
    return null
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return <UpgradePrompt feature={feature} compact={compact} className={className} />
}
