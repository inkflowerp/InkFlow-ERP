'use client'

import React from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Clock,
  Ban,
  ArrowRight,
  Crown,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'

export function SubscriptionStatusBanner() {
  const {
    subscription,
    isSuspended,
    isPastDue,
    isTrial,
    isTrialExpired,
    daysRemainingInTrial,
    currentPlan,
    openUpgradeModal,
  } = useSubscription()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'app'

  if (subscription.status === 'active' && !isTrial) {
    return null
  }

  if (isSuspended) {
    return (
      <div className="bg-red-600 text-white px-4 py-2.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-medium">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 shrink-0 animate-pulse text-red-200" />
            <span className="bangla-text">
              {tBilingual(
                'Account Suspended: Your tenant workspace has been suspended by the platform administrator. Operational write actions are restricted.',
                'সতর্কতা: আপনার প্রিন্টইআরপি অ্যাকাউন্ট প্ল্যাটফর্ম অ্যাডমিন দ্বারা স্থগিত (Suspended) করা হয়েছে। নতুন কাজ বুকিং বন্ধ রয়েছে।'
              )}
            </span>
          </div>

          <Link href={`/${slug}/settings/subscription`}>
            <Button size="sm" variant="secondary" className="h-7 text-xs bg-white text-red-700 hover:bg-red-50 font-bold bangla-text">
              {tBilingual('Clear Dues & Reactivate', 'বকেয়া পরিশোধ করুন')}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isPastDue) {
    return (
      <div className="bg-amber-500 text-slate-950 px-4 py-2 shadow-sm font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-slate-900" />
            <span className="bangla-text">
              {tBilingual(
                `Payment Past Due: The renewal payment for ${currentPlan.name} is past due. Please pay to avoid automatic service suspension.`,
                `পেমেন্ট ওভারডিউ: আপনার ${currentPlan.name_bn}-এর বিল পরিশোধ বাকি রয়েছে। অনুগ্রহ করে অবিলম্বে পরিশোধ করুন।`
              )}
            </span>
          </div>

          <Link href={`/${slug}/settings/subscription`}>
            <Button size="sm" className="h-7 text-xs bg-slate-950 text-white hover:bg-slate-900 font-bold bangla-text">
              {tBilingual('Pay Invoice Now', 'এখনই পরিশোধ করুন')}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isTrialExpired) {
    return (
      <div className="bg-red-600 text-white px-4 py-2.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-white animate-bounce" />
            <span className="bangla-text font-bold">
              {tBilingual(
                'Free Trial Expired: Your 14-day trial period has ended. Please choose a subscription plan to resume adding orders, users, and customers.',
                'ফ্রি ট্রায়াল শেষ: আপনার ১৪ দিনের ফ্রি ট্রায়ালের মেয়াদ শেষ হয়েছে। নতুন কাজ বুকিং ও কার্যক্রম চালিয়ে যেতে অনুগ্রহ করে প্ল্যান আপগ্রেড করুন।'
              )}
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => openUpgradeModal('business')}
            className="h-7 text-xs bg-white text-red-700 hover:bg-red-50 font-black bangla-text shadow-sm"
          >
            <Crown className="mr-1 h-3.5 w-3.5 text-amber-500" />
            {tBilingual('Upgrade Plan Now', 'এখনই আপগ্রেড করুন')}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  if (isTrial) {
    const isEndingSoon = daysRemainingInTrial <= 3
    return (
      <div
        className={
          isEndingSoon
            ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2 shadow-sm'
            : 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white px-4 py-2 shadow-sm'
        }
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-medium">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-amber-200" />
            <span className="bangla-text">
              {isEndingSoon
                ? tBilingual(
                    `Trial Ending Soon: Only ${daysRemainingInTrial} days remaining. Upgrade today to keep continuous access and unlock unlimited orders.`,
                    `সতর্কতা: ফ্রি ট্রায়ালের আর মাত্র ${daysRemainingInTrial} দিন বাকি রয়েছে! নিরবচ্ছিন্ন সেবার জন্য এখনই আপগ্রেড করুন।`
                  )
                : tBilingual(
                    `Free Trial Active: ${daysRemainingInTrial} days remaining. Upgrade now to secure your workspace data and unlimited features.`,
                    `ফ্রি ট্রায়াল সক্রিয়: আর ${daysRemainingInTrial} দিন বাকি রয়েছে। প্রফেশনাল প্ল্যানে আপগ্রেড করুন।`
                  )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openUpgradeModal('business')}
              className="h-7 text-xs bg-white text-indigo-900 hover:bg-indigo-50 font-black bangla-text shadow-xs"
            >
              <Crown className="mr-1 h-3 w-3 text-amber-500" />
              {tBilingual('Upgrade Plan', 'প্ল্যান আপগ্রেড')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
