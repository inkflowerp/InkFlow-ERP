'use client'

import React from 'react'
import Link from 'next/link'
import {
  Clock,
  Crown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Building,
  ShoppingCart,
  HardDrive,
  Flame,
  AlertTriangle,
} from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { toBengaliDigits } from '@/hooks/use-public-plans'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function TrialDashboardCard() {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const {
    isLoading,
    isTrial,
    isTrialExpired,
    daysRemainingInTrial,
    timeRemainingInTrial,
    trialProgressPercent,
    currentPlan,
    usage,
    openUpgradeModal,
  } = useSubscription()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'app'

  if (!mounted || isLoading || !isTrial) return null

  const trialDaysTotal = currentPlan?.trial_days || 14
  const trialDaysBn = toBengaliDigits(trialDaysTotal)
  const daysRemBn = toBengaliDigits(daysRemainingInTrial)
  const isUrgent = daysRemainingInTrial <= 3 || isTrialExpired

  const formatLimit = (count: number, limit: number) => {
    const isUnlimited = limit <= 0 || limit >= 99999
    const countStr = locale === 'bn' ? toBengaliDigits(count) : count
    const limitStr = isUnlimited
      ? tBilingual('Unlimited', 'আনলিমিটেড')
      : locale === 'bn'
      ? toBengaliDigits(limit)
      : limit
    return `${countStr}/${limitStr}`
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5 transition-all shadow-sm mb-6',
        isUrgent
          ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 border-amber-400 dark:border-amber-700/60'
          : 'bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-blue-500/10 border-indigo-200 dark:border-indigo-900/60'
      )}
    >
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Trial details & countdown */}
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                'text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5',
                isUrgent
                  ? 'bg-amber-600 text-white'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
              )}
            >
              <Crown className="h-3 w-3 mr-1" />
              {tBilingual('PrintERP Free Trial', 'প্রিন্টইআরপি ফ্রি ট্রায়াল')}
            </Badge>

            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              {isTrialExpired
                ? tBilingual('Trial Expired', 'ট্রায়াল মেয়াদ শেষ')
                : timeRemainingInTrial && timeRemainingInTrial.days === 0
                ? tBilingual(timeRemainingInTrial.formattedEn, timeRemainingInTrial.formattedBn)
                : tBilingual(
                    `${daysRemainingInTrial} Days Remaining`,
                    `আর ${daysRemBn} দিন বাকি রয়েছে`
                  )}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bangla-text">
            {isTrialExpired
              ? tBilingual(
                  `Your ${trialDaysTotal}-day free trial has expired. Upgrade your plan now to restore full write operations, keep all your data, and scale your printing business.`,
                  `আপনার ${trialDaysBn} দিনের ফ্রি ট্রায়ালের মেয়াদ শেষ হয়েছে। নিরবচ্ছিন্ন সেবা অব্যাহত রাখতে এবং নতুন ডাটা এন্ট্রি করতে এখনই সাবস্ক্রিপশন প্ল্যান নির্বাচন করুন।`
                )
              : tBilingual(
                  `You have full access to PrintERP modules during this ${trialDaysTotal}-day evaluation. Upgrade before the trial ends to ensure seamless operations with no data loss.`,
                  `আপনি ট্রায়াল মেয়াদে সকল প্রিমিয়াম ফিচার ব্যবহার করতে পারছেন। মেয়াদ শেষের পূর্বেই আপনার সুবিধাজনক প্ল্যানে আপগ্রেড করুন।`
                )}
          </p>

          {/* Trial Progress Bar */}
          <div className="space-y-1 pt-1 max-w-sm">
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              <span>{tBilingual('Trial Duration', 'ট্রায়াল অগ্রগতি')}</span>
              <span>{locale === 'bn' ? toBengaliDigits(trialProgressPercent) : trialProgressPercent}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-2 rounded-full transition-all',
                  isUrgent ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                )}
                style={{ width: `${trialProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Quota snapshot & Upgrade CTAs */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 w-full lg:w-auto">
          {/* 4 Mini Limit Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-1.5 w-full text-left">
            <div className="bg-white/80 dark:bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[11px]">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">{tBilingual('Users', 'ইউজার')}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{formatLimit(usage.users_count, usage.users_limit)}</span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[11px]">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">{tBilingual('Orders / Mo', 'অর্ডার / মাস')}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{formatLimit(usage.orders_this_month, usage.orders_limit)}</span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[11px]">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">{tBilingual('Customers', 'কাস্টমার')}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{formatLimit(usage.customers_count, usage.customers_limit)}</span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[11px]">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">{tBilingual('Branches', 'শাখা')}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{formatLimit(usage.branches_count, usage.branches_limit)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              onClick={() => openUpgradeModal('business')}
              className={cn(
                'w-full sm:w-auto font-bold shadow-sm bangla-text',
                isUrgent
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
              )}
            >
              <Crown className="mr-1.5 h-3.5 w-3.5 text-amber-300" />
              {tBilingual('Upgrade Plan Now', 'এখনই প্ল্যান আপগ্রেড করুন')}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>

            <Link href={`/${slug}/settings/subscription`} className="hidden sm:inline-block">
              <Button size="sm" variant="outline" className="text-xs bangla-text">
                {tBilingual('Compare Plans', 'প্ল্যান দেখুন')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
