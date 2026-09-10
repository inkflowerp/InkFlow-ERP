'use client'

import React, { useState, useEffect } from 'react'
import {
  Clock,
  Crown,
  ArrowRight,
  AlertTriangle,
  X,
  ChevronUp,
  ChevronDown,
  Flame,
} from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { toBengaliDigits } from '@/hooks/use-public-plans'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const SNOOZE_STORAGE_KEY = 'printerp_trial_popup_snooze'

export function TrialNotificationPopup() {
  const {
    isTrial,
    isTrialExpired,
    daysRemainingInTrial,
    trialProgressPercent,
    currentPlan,
    openUpgradeModal,
  } = useSubscription()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()

  const [isDismissed, setIsDismissed] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)

  // Determine if snooze has passed
  useEffect(() => {
    if (!isTrial) {
      setIsDismissed(true)
      return
    }

    try {
      const snoozedUntil = sessionStorage.getItem(SNOOZE_STORAGE_KEY)
      if (snoozedUntil) {
        const snoozeTime = parseInt(snoozedUntil, 10)
        if (Date.now() < snoozeTime) {
          setIsDismissed(true)
          return
        }
      }
    } catch {}

    // Show popup if trial is expired or ending soon (<= 7 days)
    if (isTrialExpired || daysRemainingInTrial <= 7) {
      // Delay popup appearance slightly for smooth load
      const timer = setTimeout(() => {
        setIsDismissed(false)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [isTrial, isTrialExpired, daysRemainingInTrial])

  const handleDismiss = (durationHours: number = 2) => {
    setIsDismissed(true)
    try {
      const snoozeUntil = Date.now() + durationHours * 60 * 60 * 1000
      sessionStorage.setItem(SNOOZE_STORAGE_KEY, snoozeUntil.toString())
    } catch {}
  }

  if (!isTrial || isDismissed) {
    return null
  }

  const trialDaysTotal = currentPlan?.trial_days || 14
  const trialDaysBn = toBengaliDigits(trialDaysTotal)
  const daysRemBn = toBengaliDigits(daysRemainingInTrial)
  const isUrgent = isTrialExpired || daysRemainingInTrial <= 3

  // Minimized Pill View
  if (isMinimized) {
    return (
      <aside
        aria-label="Trial Notification"
        className="fixed bottom-20 md:bottom-5 right-4 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300"
      >
        <button
          onClick={() => setIsMinimized(false)}
          className={cn(
            'flex items-center gap-2.5 px-3.5 py-2 rounded-full shadow-xl border text-xs font-semibold backdrop-blur-md transition-all cursor-pointer hover:scale-105',
            isTrialExpired
              ? 'bg-red-950/90 text-red-200 border-red-500/50 shadow-red-950/50'
              : isUrgent
              ? 'bg-amber-950/90 text-amber-200 border-amber-500/50 shadow-amber-950/50'
              : 'bg-slate-900/90 text-indigo-200 border-indigo-500/50 shadow-slate-950/50'
          )}
        >
          {isTrialExpired ? (
            <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
          ) : (
            <Flame className="h-4 w-4 text-amber-400 animate-pulse" />
          )}
          <span className="bangla-text">
            {isTrialExpired
              ? tBilingual('Trial Expired', 'ট্রায়াল শেষ')
              : tBilingual(`${daysRemainingInTrial}d Trial Left`, `${daysRemBn} দিন বাকি`)}
          </span>
          <ChevronUp className="h-3.5 w-3.5 opacity-70" />
        </button>
      </aside>
    )
  }

  // Expanded Floating Notification Card
  return (
    <aside
      aria-label="Trial Notification"
      className={cn(
        'fixed bottom-20 md:bottom-5 right-4 left-4 sm:left-auto sm:w-[380px] z-40',
        'rounded-2xl border shadow-2xl backdrop-blur-xl p-4 transition-all duration-300',
        'animate-in fade-in slide-in-from-bottom-4',
        isTrialExpired
          ? 'bg-slate-950/95 text-slate-100 border-red-500/40 shadow-red-950/40'
          : isUrgent
          ? 'bg-slate-950/95 text-slate-100 border-amber-500/40 shadow-amber-950/40'
          : 'bg-slate-950/95 text-slate-100 border-indigo-500/40 shadow-indigo-950/40'
      )}
    >
      {/* Background Accent Glow */}
      <div
        className={cn(
          'absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20',
          isTrialExpired ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-indigo-500'
        )}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border-0',
              isTrialExpired
                ? 'bg-red-600 text-white'
                : isUrgent
                ? 'bg-amber-600 text-white'
                : 'bg-indigo-600 text-white'
            )}
          >
            {isTrialExpired ? (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {tBilingual('Trial Expired', 'ট্রায়াল শেষ')}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {tBilingual(`${trialDaysTotal}-Day Trial`, `${trialDaysBn} দিনের ট্রায়াল`)}
              </span>
            )}
          </Badge>

          {!isTrialExpired && (
            <span className="text-[11px] font-bold text-amber-300 bangla-text">
              {tBilingual(
                `${daysRemainingInTrial} ${daysRemainingInTrial === 1 ? 'day' : 'days'} remaining`,
                `${daysRemBn} দিন বাকি`
              )}
            </span>
          )}
        </div>

        {/* Action Controls (Minimize & Dismiss) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title={tBilingual('Minimize', 'ছোট করুন')}
            aria-label="Minimize popup"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDismiss(4)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title={tBilingual('Dismiss for 4 hours', 'বন্ধ করুন')}
            aria-label="Close popup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="mt-2.5 space-y-2 relative z-10">
        <h4 className="text-sm font-bold text-white bangla-text leading-snug">
          {isTrialExpired
            ? tBilingual(
                'Your Free Trial Has Expired',
                'আপনার ফ্রি ট্রায়ালের মেয়াদ শেষ হয়েছে'
              )
            : isUrgent
            ? tBilingual(
                'Your Trial is Ending Soon!',
                'আপনার ট্রায়ালের মেয়াদ শীঘ্রই শেষ হচ্ছে!'
              )
            : tBilingual(
                'Enjoying your PrintERP Trial?',
                'প্রিন্টইআরপি ট্রায়াল উপভোগ করছেন?'
              )}
        </h4>

        <p className="text-xs text-slate-300 bangla-text leading-relaxed">
          {isTrialExpired
            ? tBilingual(
                'New orders, challans, and customer creations are restricted. Upgrade now to unlock all unlimited features without interruption.',
                'নতুন অর্ডার ও চালান তৈরি স্থগিত রয়েছে। নিরবচ্ছিন্ন সেবার জন্য এখনই আপনার পছন্দের প্ল্যানে আপগ্রেড করুন।'
              )
            : isUrgent
            ? tBilingual(
                `You have ${daysRemainingInTrial} days left to test all ERP features. Upgrade today to preserve seamless multi-department operations.`,
                `আর মাত্র ${daysRemBn} দিন বাকি। কোনো বিরতি ছাড়াই সম্পূর্ণ সেবা চালু রাখতে এখনই প্ল্যান বেছে নিন।`
              )
            : tBilingual(
                'You have full access to POS, Job Orders, Inventory, and Accounting. Upgrade anytime to secure long-term pricing.',
                'আপনি পিওএস, জব অর্ডার, ইনভেন্টরি ও অ্যাকাউন্টিংয়ের সম্পূর্ণ সুবিধা পাচ্ছেন। যেকোনো সময় আপগ্রেড করতে পারেন।'
              )}
        </p>

        {/* Progress Bar for Active Trial */}
        {!isTrialExpired && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span className="bangla-text">{tBilingual('Trial Period', 'ট্রায়াল অগ্রগতি')}</span>
              <span className="bangla-text">
                {locale === 'bn' ? toBengaliDigits(trialProgressPercent) : trialProgressPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  isUrgent ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                )}
                style={{ width: `${trialProgressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 relative z-10">
        <button
          onClick={() => handleDismiss(12)}
          className="text-[11px] text-slate-400 hover:text-slate-200 bangla-text cursor-pointer transition-colors"
        >
          {tBilingual('Remind me later', 'পরে মনে করান')}
        </button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              openUpgradeModal()
              setIsMinimized(true)
            }}
            className={cn(
              'h-8 text-xs font-bold bangla-text cursor-pointer shadow-lg px-3.5',
              isTrialExpired
                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white'
            )}
          >
            <Crown className="mr-1.5 h-3.5 w-3.5" />
            {tBilingual('Upgrade Plan', 'প্ল্যান আপগ্রেড করুন')}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
