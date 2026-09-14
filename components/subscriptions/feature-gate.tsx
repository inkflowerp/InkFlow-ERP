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
  const { hasAccess, isLoading } = useFeatureGate(feature)

  if (hasAccess) {
    return <>{children}</>
  }

  if (isLoading) {
    if (compact) {
      return (
        <div className={`h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 animate-pulse ${className}`} />
      )
    }
    return (
      <div className={`p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 flex flex-col items-center justify-center space-y-3 animate-pulse ${className}`}>
        <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    )
  }

  if (hideIfForbidden) {
    return null
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return <UpgradePrompt feature={feature} compact={compact} className={className} />
}
