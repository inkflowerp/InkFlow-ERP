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
  CheckCircle2,
} from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'

export function SubscriptionStatusBanner() {
  const { subscription, isSuspended, isPastDue, isTrial, daysRemainingInTrial, currentPlan } =
    useSubscription()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'app'

  if (subscription.status === 'active') {
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
                'Account Suspended: Your tenant workspace has been suspended by the platform administrator. New job bookings and production are restricted.',
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

  if (isTrial) {
    return (
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white px-4 py-2 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-medium">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-indigo-200" />
            <span className="bangla-text">
              {tBilingual(
                `Free Trial Active: ${daysRemainingInTrial} days remaining. Upgrade now to retain all business data and access.`,
                `ফ্রি ট্রায়াল: আর ${daysRemainingInTrial} দিন বাকি রয়েছে। নিরবচ্ছিন্ন সেবার জন্য আপগ্রেড করুন।`
              )}
            </span>
          </div>

          <Link href={`/${slug}/settings/subscription`}>
            <Button size="sm" variant="secondary" className="h-7 text-xs bg-white text-indigo-900 hover:bg-indigo-50 font-bold bangla-text">
              <Crown className="mr-1 h-3 w-3 text-amber-500" />
              {tBilingual('Select Plan', 'প্ল্যান নির্বাচন করুন')}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return null
}
