'use client'

import React from 'react'
import Link from 'next/link'
import { Lock, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FeatureCode, PlanCode } from '@/types/subscription.types'
import {
  checkFeatureAccess,
  DEMO_TENANT_SUBSCRIPTION,
  DEFAULT_PLANS,
} from '@/services/subscription.service'

export function useFeatureGate(feature: FeatureCode) {
  // In demo state, default to the tenant's current plan (Business)
  const currentPlan: PlanCode = DEMO_TENANT_SUBSCRIPTION.plan_code
  const hasAccess = checkFeatureAccess(currentPlan, feature)

  // Find lowest plan that supports this feature
  const supportingPlan = DEFAULT_PLANS.find((p) => p.features.includes(feature))
  const requiredPlan: PlanCode = supportingPlan ? supportingPlan.code : 'enterprise'

  return {
    hasAccess,
    currentPlan,
    requiredPlan,
  }
}

interface FeatureGateProps {
  feature: FeatureCode
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { company } = useTenant()
  const slug = company?.slug || 'padma-digital'
  const { hasAccess, requiredPlan } = useFeatureGate(feature)

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="p-8 my-4 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 text-center space-y-4 max-w-xl mx-auto">
      <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600">
        <Lock className="h-6 w-6" />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-center gap-2">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Feature Restricted
          </h3>
          <Badge className="bg-amber-200 text-amber-900 uppercase text-[10px] font-bold">
            Requires {requiredPlan}
          </Badge>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Your current plan does not include this capability. Upgrade your company subscription to unlock unlimited access.
        </p>
      </div>

      <div className="pt-1">
        <Link href={`/${slug}/settings/subscription`}>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Upgrade to {requiredPlan.toUpperCase()} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
