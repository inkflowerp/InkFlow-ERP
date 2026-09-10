'use client'

import React from 'react'
import {
  AlertTriangle,
  Lock,
  ArrowRight,
  Sparkles,
  Users,
  Building,
  HardDrive,
  ShoppingCart,
  Layers,
  Package,
  Crown,
  Zap,
} from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { toBengaliDigits } from '@/hooks/use-public-plans'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfigurableLimitType } from '@/types/subscription.types'
import { getNextTierPlan } from '@/lib/subscription/subscription-constants'

const LIMIT_LABELS: Record<ConfigurableLimitType, { en: string; bn: string; icon: React.ElementType }> = {
  max_users: { en: 'Team Users Limit Reached', bn: 'সর্বোচ্চ ইউজার অ্যাকাউন্টের সীমা পূর্ণ', icon: Users },
  max_branches: { en: 'Branches & Hubs Limit Reached', bn: 'সর্বোচ্চ শাখা/কারখানার সীমা পূর্ণ', icon: Building },
  monthly_orders: { en: 'Monthly Order Quota Exhausted', bn: 'চলতি মাসের সর্বোচ্চ অর্ডার কোটা পূর্ণ', icon: ShoppingCart },
  max_customers: { en: 'Customer Directory Limit Reached', bn: 'গ্রাহক তালিকার সর্বোচ্চ সীমা পূর্ণ', icon: Users },
  max_products: { en: 'Inventory & Materials Limit Reached', bn: 'ইনভেন্টরি ও প্রোডাক্টের সর্বোচ্চ সীমা পূর্ণ', icon: Package },
  storage_gb: { en: 'Cloud Storage Capacity Reached', bn: 'ক্লাউড স্টোরেজ ধারণক্ষমতা পূর্ণ', icon: HardDrive },
}

export function LimitExceededModal() {
  const {
    isLimitExceededModalOpen,
    closeLimitExceededModal,
    limitModalType,
    currentPlan,
    currentPlanCode,
    allPlans,
    getLimitStatus,
    openUpgradeModal,
  } = useSubscription()
  const { locale, tBilingual } = useI18n()

  if (!isLimitExceededModalOpen || !limitModalType) return null

  const meta = LIMIT_LABELS[limitModalType] || {
    en: 'Resource Limit Reached',
    bn: 'রিসোর্স লিমিট পূর্ণ',
    icon: Lock,
  }
  const Icon = meta.icon
  const status = getLimitStatus(limitModalType)
  const nextPlan = getNextTierPlan(currentPlanCode, allPlans)
  const nextPlanLimit = nextPlan[limitModalType]

  const isNextUnlimited = nextPlanLimit <= 0 || nextPlanLimit >= 99999
  const nextLimitLabelEn = isNextUnlimited ? 'Unlimited' : String(nextPlanLimit)
  const nextLimitLabelBn = isNextUnlimited ? 'আনলিমিটেড' : toBengaliDigits(nextPlanLimit)

  const currentDisplay = locale === 'bn' ? toBengaliDigits(status.current) : status.current
  const limitDisplay = status.limit <= 0 || status.limit >= 99999
    ? tBilingual('Unlimited', 'আনলিমিটেড')
    : locale === 'bn'
    ? toBengaliDigits(status.limit)
    : status.limit

  const handleUpgradeClick = () => {
    closeLimitExceededModal()
    openUpgradeModal(nextPlan.code)
  }

  return (
    <ModalDialog
      open={isLimitExceededModalOpen}
      onOpenChange={(open) => !open && closeLimitExceededModal()}
      size="md"
      title={
        <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white bangla-text">
              {tBilingual(meta.en, meta.bn)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tBilingual(
                `Restricted on ${currentPlan.name}`,
                `${currentPlan.name_bn}-এ সীমা নিয়ন্ত্রিত`
              )}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5 py-2">
        {/* Quota Gauge */}
        <div className="rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 bangla-text">
            <span>{tBilingual('Current Quota Usage:', 'বর্তমান ব্যবহারের পরিমাণ:')}</span>
            <Badge className="bg-amber-500 text-slate-950 font-bold">
              {currentDisplay} / {limitDisplay} ({status.percentage}%)
            </Badge>
          </div>

          <div className="w-full bg-amber-200 dark:bg-amber-900/50 rounded-full h-2.5 overflow-hidden">
            <div className="bg-amber-600 dark:bg-amber-500 h-2.5 rounded-full w-full" />
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 bangla-text">
            {tBilingual(
              `Your organization has reached the maximum allowed limit for this resource under your current subscription (${currentPlan.name}). To add more, please upgrade to a higher tier plan.`,
              `আপনার বর্তমান সাবস্ক্রিপশন প্ল্যানে (${currentPlan.name_bn}) এই রিসোর্সের সর্বোচ্চ সীমা পূর্ণ হয়ে গিয়েছে। অতিরিক্ত যুক্ত করতে প্ল্যান আপগ্রেড করুন।`
            )}
          </p>
        </div>

        {/* Upgrade Suggestion Box */}
        <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 bangla-text">
                {tBilingual('Recommended Upgrade', 'প্রস্তাবিত আপগ্রেড')}
              </span>
            </div>
            <Badge className="bg-blue-500 text-white text-[10px] font-bold">
              {tBilingual(nextPlan.name, nextPlan.name_bn)}
            </Badge>
          </div>

          <div className="text-xs text-slate-200 space-y-1.5 bangla-text">
            <p>
              {tBilingual(
                `Upgrading to the ${nextPlan.name} increases your limit from ${limitDisplay} to ${nextLimitLabelEn} and unlocks full team productivity.`,
                `${nextPlan.name_bn}-এ আপগ্রেড করলে এই সীমা ${limitDisplay} থেকে বৃদ্ধি পেয়ে ${nextLimitLabelBn} হবে।`
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={closeLimitExceededModal}
          >
            {tBilingual('Close', 'বন্ধ করুন')}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleUpgradeClick}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold bangla-text shadow-sm"
          >
            <Zap className="mr-1.5 h-3.5 w-3.5 text-amber-300" />
            {tBilingual(`Upgrade to ${nextPlan.name}`, `${nextPlan.name_bn} এ আপগ্রেড করুন`)}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}
