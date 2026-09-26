'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Clock, CheckCircle2, AlertTriangle, Ban, HelpCircle } from 'lucide-react'
import { SubscriptionSnapshot } from '@/types/subscription.types'
import { useSubscription } from '@/hooks/use-subscription'
import { toBengaliDigits } from '@/hooks/use-public-plans'
import { useI18n } from '@/i18n/context'

interface SubscriptionBadgeProps {
  snapshot?: SubscriptionSnapshot | null
  showDetails?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SubscriptionBadge({
  snapshot: propSnapshot,
  showDetails = false,
  size = 'md',
  className = '',
}: SubscriptionBadgeProps) {
  const context = useSubscription()
  const { locale } = useI18n()
  const isBn = locale === 'bn'

  const snapshot = propSnapshot ?? context.snapshot
  const planName = isBn
    ? (snapshot?.planNameBn || snapshot?.planName || context.currentPlan?.name_bn || context.currentPlan?.name || 'সাবস্ক্রিপশন')
    : (snapshot?.planName || context.currentPlan?.name || 'Subscription')

  const status = snapshot?.status || context.subscription?.status || 'unknown'
  const isTrial = snapshot?.planCode === 'trial' || context.isTrial

  // Style mappings based on status and plan
  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700'
  let icon = <HelpCircle className="h-3 w-3" />

  if (status === 'suspended') {
    badgeColor = 'bg-red-950/80 text-red-300 border-red-800'
    icon = <Ban className="h-3 w-3 text-red-400" />
  } else if (status === 'past_due') {
    badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-800'
    icon = <AlertTriangle className="h-3 w-3 text-amber-400" />
  } else if (isTrial) {
    badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/30'
    icon = <Clock className="h-3 w-3 text-amber-400" />
  } else if (status === 'active') {
    const code = snapshot?.planCode || context.currentPlanCode
    if (code === 'enterprise') {
      badgeColor = 'bg-purple-500/10 text-purple-300 border-purple-500/30'
      icon = <Sparkles className="h-3 w-3 text-purple-400" />
    } else if (code === 'business') {
      badgeColor = 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
      icon = <Sparkles className="h-3 w-3 text-indigo-400" />
    } else {
      badgeColor = 'bg-blue-500/10 text-blue-300 border-blue-500/30'
      icon = <CheckCircle2 className="h-3 w-3 text-blue-400" />
    }
  }

  const sizeClasses = {
    sm: 'text-2xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2 font-bold',
  }[size]

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center font-medium rounded-full border shadow-sm ${badgeColor} ${sizeClasses} ${className}`}
    >
      {icon}
      <span>{planName}</span>
      {showDetails && isTrial && context.daysRemainingInTrial > 0 && (
        <span className="opacity-80 font-normal">
          ({isBn ? `${toBengaliDigits(context.daysRemainingInTrial)} দিন বাকি` : `${context.daysRemainingInTrial}d left`})
        </span>
      )}
    </Badge>
  )
}

export function SubscriptionSummary({ snapshot: propSnapshot }: { snapshot?: SubscriptionSnapshot | null }) {
  const context = useSubscription()
  const { locale } = useI18n()
  const isBn = locale === 'bn'

  const snapshot = propSnapshot ?? context.snapshot
  const limits = snapshot?.limits ?? {
    maxUsers: context.currentPlan?.max_users ?? 0,
    maxBranches: context.currentPlan?.max_branches ?? 0,
    storageGb: context.currentPlan?.storage_gb ?? 0,
    monthlyOrders: context.currentPlan?.monthly_orders ?? 0,
    maxCustomers: context.currentPlan?.max_customers ?? 0,
    maxProducts: context.currentPlan?.max_products ?? 0,
  }

  const featuresCount = snapshot?.features?.length ?? context.currentPlan?.features?.length ?? 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
        <div className="text-slate-400 text-2xs">{isBn ? 'ইউজার সিট' : 'User Seats'}</div>
        <div className="font-bold text-white font-mono mt-0.5">
          {isBn ? toBengaliDigits(limits.maxUsers) : limits.maxUsers}
        </div>
      </div>
      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
        <div className="text-slate-400 text-2xs">{isBn ? 'শাখা' : 'Branches'}</div>
        <div className="font-bold text-white font-mono mt-0.5">
          {isBn ? toBengaliDigits(limits.maxBranches) : limits.maxBranches}
        </div>
      </div>
      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
        <div className="text-slate-400 text-2xs">{isBn ? 'স্টোরেজ' : 'Storage'}</div>
        <div className="font-bold text-white font-mono mt-0.5">
          {isBn ? `${toBengaliDigits(limits.storageGb)} জিবি` : `${limits.storageGb} GB`}
        </div>
      </div>
      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
        <div className="text-slate-400 text-2xs">{isBn ? 'মাসিক অর্ডার' : 'Monthly Orders'}</div>
        <div className="font-bold text-white font-mono mt-0.5">
          {isBn ? toBengaliDigits(limits.monthlyOrders) : limits.monthlyOrders.toLocaleString()}
        </div>
      </div>
      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
        <div className="text-slate-400 text-2xs">{isBn ? 'কাস্টমার লিমিট' : 'Customer Limit'}</div>
        <div className="font-bold text-white font-mono mt-0.5">
          {isBn ? toBengaliDigits(limits.maxCustomers) : limits.maxCustomers.toLocaleString()}
        </div>
      </div>
      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
        <div className="text-slate-400 text-2xs">{isBn ? 'সক্রিয় মডিউল' : 'Active Modules'}</div>
        <div className="font-bold text-emerald-400 font-mono mt-0.5">
          {isBn ? `${toBengaliDigits(featuresCount)} টি` : `${featuresCount} modules`}
        </div>
      </div>
    </div>
  )
}
