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

const LIMIT_LABELS: Record<ConfigurableLimitType, { en: string; bn: string; resourceNameEn: string; resourceNameBn: string; icon: React.ElementType }> = {
 max_users: { en: 'Team Users Limit Reached', bn: 'সর্বোচ্চ ইউজার অ্যাকাউন্টের সীমা পূর্ণ', resourceNameEn: 'Users', resourceNameBn: 'ইউজার', icon: Users },
 max_branches: { en: 'Branches & Hubs Limit Reached', bn: 'সর্বোচ্চ শাখা/কারখানার সীমা পূর্ণ', resourceNameEn: 'Branches', resourceNameBn: 'শাখা', icon: Building },
 monthly_orders: { en: 'Monthly Order Quota Exhausted', bn: 'চলতি মাসের সর্বোচ্চ অর্ডার কোটা পূর্ণ', resourceNameEn: 'Monthly Orders', resourceNameBn: 'মাসিক অর্ডার', icon: ShoppingCart },
 max_customers: { en: 'Customer Directory Limit Reached', bn: 'গ্রাহক তালিকার সর্বোচ্চ সীমা পূর্ণ', resourceNameEn: 'Customers', resourceNameBn: 'কাস্টমার', icon: Users },
 max_products: { en: 'Inventory & Materials Limit Reached', bn: 'ইনভেন্টরি ও প্রোডাক্টের সর্বোচ্চ সীমা পূর্ণ', resourceNameEn: 'Products & Materials', resourceNameBn: 'প্রোডাক্ট ও মেটেরিয়াল', icon: Package },
 storage_gb: { en: 'Cloud Storage Capacity Reached', bn: 'ক্লাউড স্টোরেজ ধারণক্ষমতা পূর্ণ', resourceNameEn: 'Cloud Storage (GB)', resourceNameBn: 'ক্লাউড স্টোরেজ (জিবি)', icon: HardDrive },
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
 resourceNameEn: 'Resources',
 resourceNameBn: 'রিসোর্স',
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
 size="md"hideFooter
 title={
        <div className="flex items-center gap-3 text-warning text-warning">
          <div className="p-2.5 rounded-xl bg-warning/10 bg-warning-surface/60 border border-warning-border/20 text-warning text-warning shadow-sm shrink-0">
            <Lock className="h-5 w-5"/>
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground bangla-text leading-snug">
              {tBilingual(meta.en, meta.bn)}
            </h3>
            <p className="text-xs text-muted-foreground font-medium">
              {tBilingual(
                `Plan Limit Reached on ${currentPlan.name}`,
                `${currentPlan.name_bn}-এ প্ল্যান লিমিট পূর্ণ`
              )}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Quota Gauge */}
        <div className="rounded-xl dark: dark: border border-warning-border/80 border-warning-border/60 p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground bangla-text">
            <span className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-warning text-warning"/>
              {tBilingual('Current Usage:', 'বর্তমান ব্যবহারের পরিমাণ:')}
            </span>
            <Badge className="bg-warning hover:bg-warning text-foreground font-bold px-2.5 py-0.5 shadow-sm text-xs">
              {currentDisplay} / {limitDisplay} ({status.percentage}%)
            </Badge>
          </div>

          <div className="w-full bg-warning/80 bg-warning-surface/80 rounded-full h-2.5 overflow-hidden p-0.5 border border-warning-border/40 border-warning-border/40">
            <div className=" h-1.5 rounded-full w-full transition-all duration-500 shadow-sm"/>
          </div>

          <p className="text-xs font-medium text-foreground bangla-text leading-relaxed">
            {tBilingual(
              `Plan Limit Reached: Your current plan allows up to ${limitDisplay} ${meta.resourceNameEn} quota (currently at ${currentDisplay}). Please upgrade your subscription to continue.`,
              `প্ল্যান লিমিট পূর্ণ: আপনার বর্তমান প্ল্যানে সর্বোচ্চ ${limitDisplay} ${meta.resourceNameBn} কোটা অনুমোদিত (বর্তমানে ${currentDisplay})। চালিয়ে যেতে অনুগ্রহ করে সাবস্ক্রিপশন আপগ্রেড করুন।`
            )}
          </p>
        </div>

        {/* Upgrade Suggestion Box */}
        <div className="rounded-xl text-white p-4 space-y-2.5 shadow-xs border border-primary/20/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-warning/20 text-warning">
                <Sparkles className="h-3.5 w-3.5"/>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground bangla-text">
                {tBilingual('Recommended Upgrade', 'প্রস্তাবিত আপগ্রেড')}
              </span>
            </div>
            <Badge className="bg-primary hover:bg-primary text-white text-xs font-bold px-2.5 py-0.5 border border-border/30 shadow-sm">
              {tBilingual(nextPlan.name, nextPlan.name_bn)}
            </Badge>
          </div>

          <div className="text-xs text-muted-foreground bangla-text leading-relaxed">
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
 type="button"variant="outline"size="sm"onClick={closeLimitExceededModal}
 className="h-9 px-4 text-xs font-semibold bangla-text rounded-xl">
            {tBilingual('Close', 'বন্ধ করুন')}
          </Button>

          <Button
 type="button"size="sm"onClick={handleUpgradeClick}
 className="h-9 px-4 hover: hover: text-white font-bold text-xs bangla-text shadow-xs shadow-blue-600/20 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
            <Zap className="mr-1.5 h-3.5 w-3.5 text-warning fill-amber-300"/>
            {tBilingual(`Upgrade to ${nextPlan.name}`, `${nextPlan.name_bn} এ আপগ্রেড করুন`)}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5"/>
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}
