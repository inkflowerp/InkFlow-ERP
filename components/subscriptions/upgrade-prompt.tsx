'use client'

import React from 'react'
import Link from 'next/link'
import {
  Lock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Zap,
  CheckCircle2,
  PhoneCall,
  Crown,
} from 'lucide-react'
import { FeatureCode } from '@/types/subscription.types'
import { FEATURE_METADATA, getMinimumPlanForFeature } from '@/lib/subscription/subscription-constants'
import { useSubscription } from '@/hooks/use-subscription'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'

interface UpgradePromptProps {
  feature: FeatureCode
  title?: string
  description?: string
  compact?: boolean
  className?: string
}

export function UpgradePrompt({
  feature,
  title,
  description,
  compact = false,
  className = '',
}: UpgradePromptProps) {
  const { currentPlan, allPlans } = useSubscription()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'app'

  const meta = FEATURE_METADATA[feature] || {
    code: feature,
    name: title || feature,
    name_bn: title || feature,
    description: description || 'This feature requires a higher tier plan.',
    minPlan: 'business',
    category: 'advanced',
  }

  const requiredPlan =
    (allPlans && allPlans.find((p) => p.code === meta.minPlan)) ||
    getMinimumPlanForFeature(feature)

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200 ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <div className="text-xs bangla-text">
            <span className="font-bold">
              {tBilingual(meta.name, meta.name_bn)}
            </span>
            <span className="text-slate-500 dark:text-slate-400 ml-1.5">
              — {tBilingual(`Included in ${requiredPlan.name}`, `এটি ${requiredPlan.name_bn}-এ অন্তর্ভুক্ত`)}
            </span>
          </div>
        </div>

        <Link href={`/${slug}/settings/subscription`}>
          <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold bangla-text">
            {tBilingual('Upgrade', 'আপগ্রেড')}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <Card className={`relative overflow-hidden border-indigo-200 dark:border-indigo-950/60 bg-gradient-to-b from-white via-indigo-50/30 to-white dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 shadow-xl ${className}`}>
      {/* Decorative gradient blur background */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      <CardHeader className="text-center pb-2 pt-8">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 mb-4">
          <Lock className="h-8 w-8" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Badge variant="outline" className="text-[11px] font-mono border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 bangla-text">
            {tBilingual(`${currentPlan.name} (Current)`, `${currentPlan.name_bn} (বর্তমান)`)}
          </Badge>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <Badge className="text-[11px] font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white bangla-text">
            <Crown className="h-3 w-3 mr-1" />
            {tBilingual(`${requiredPlan.name} Required`, `${requiredPlan.name_bn} প্রয়োজন`)}
          </Badge>
        </div>

        <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white bangla-text">
          {tBilingual(meta.name, meta.name_bn)}
        </CardTitle>

        <CardDescription className="text-sm max-w-md mx-auto text-slate-600 dark:text-slate-300 mt-1 bangla-text">
          {tBilingual(meta.description, meta.description_bn || meta.description)}
        </CardDescription>
      </CardHeader>

      <CardContent className="max-w-lg mx-auto pt-4 pb-6 space-y-4">
        <div className="rounded-xl bg-slate-100/80 dark:bg-slate-800/60 p-4 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bangla-text">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            {tBilingual(`Included with ${requiredPlan.name}:`, `${requiredPlan.name_bn}-এর মূল সুবিধাসমূহ:`)}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-200 bangla-text">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>
                {requiredPlan.max_users <= 0 || requiredPlan.max_users >= 99999
                  ? tBilingual('Unlimited', 'আনলিমিটেড')
                  : requiredPlan.max_users}{' '}
                {tBilingual('Team User Accounts', 'জন ব্যবহারকারী')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>
                {requiredPlan.max_branches <= 0 || requiredPlan.max_branches >= 99999
                  ? tBilingual('Unlimited', 'আনলিমিটেড')
                  : requiredPlan.max_branches}{' '}
                {tBilingual('Branches & Factory Hubs', 'টি শাখা ও কারখানা')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>
                {requiredPlan.storage_gb <= 0 || requiredPlan.storage_gb >= 99999
                  ? tBilingual('Unlimited', 'আনলিমিটেড')
                  : `${requiredPlan.storage_gb} GB`}{' '}
                {tBilingual('Secure Cloud Storage', 'ক্লাউড স্টোরেজ')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>
                {requiredPlan.monthly_orders <= 0 || requiredPlan.monthly_orders >= 99999
                  ? tBilingual('Unlimited', 'আনলিমিটেড')
                  : requiredPlan.monthly_orders.toLocaleString()}{' '}
                {tBilingual('Monthly Job Orders', 'টি মাসিক অর্ডার')}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center bangla-text">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tBilingual('Starting from ', 'শুরু মাত্র ')}
          </span>
          <span className="text-lg font-black text-slate-900 dark:text-white">
            <CurrencyDisplay amount={requiredPlan.price_monthly} />
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tBilingual(' / month (৳ BDT)', ' / প্রতি মাসে')}
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row items-center justify-center gap-3 pb-8">
        <Link href={`/${slug}/settings/subscription`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-6 shadow-md shadow-indigo-500/20 bangla-text">
            <Zap className="mr-2 h-4 w-4" />
            {tBilingual(`Upgrade to ${requiredPlan.name}`, `${requiredPlan.name_bn} এ আপগ্রেড করুন`)}
          </Button>
        </Link>

        <Link href={`/${slug}/settings/subscription`} className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto text-xs bangla-text">
            {tBilingual('Compare All Plans', 'প্ল্যান তুলনা দেখুন')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
