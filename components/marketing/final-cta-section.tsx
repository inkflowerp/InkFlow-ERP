'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { usePublicSubscriptionPlans, toBengaliDigits } from '@/hooks/use-public-plans'
import { useDemoModal } from '@/components/marketing/demo-modal-context'

interface FinalCTASectionProps {
  onOpenDemo?: () => void
}

export function FinalCTASection({ onOpenDemo }: FinalCTASectionProps) {
  const { tBilingual } = useI18n()
  const { trialDays } = usePublicSubscriptionPlans()
  const demoModalCtx = useDemoModal()

  const handleOpenDemo = onOpenDemo || demoModalCtx?.openDemo
  const trialDaysBn = toBengaliDigits(trialDays)

  return (
    <section className="py-16 sm:py-24 bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-8 sm:p-12 md:p-16 text-center space-y-5 sm:space-y-6 shadow-sm">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 uppercase tracking-wider">
            <span>{tBilingual('Get Started Today', 'আজই শুরু করুন')}</span>
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight max-w-2xl mx-auto bangla-text">
            {tBilingual(
              'Ready to Bring Your Print Business Under Control?',
              'আপনার পুরো প্রিন্ট ব্যবসা নিয়ন্ত্রণে আনতে প্রস্তুত?'
            )}
          </h2>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed bangla-text">
            {tBilingual(
              'Start managing sales, production, inventory, payments and delivery from one connected system.',
              'সেলস, প্রোডাকশন, ইনভেন্টরি, পেমেন্ট ও ডেলিভারি পরিচালনা শুরু করুন একটি সমন্বিত আধুনিক সিস্টেমে।'
            )}
          </p>

          {/* Actions */}
          <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md mx-auto">
            <Link href="/register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-12 px-7 text-sm sm:text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer bangla-text">
                <span>{tBilingual('Start Free Trial', 'ফ্রি ট্রায়াল শুরু করুন')}</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            {handleOpenDemo && (
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenDemo}
                className="w-full sm:w-auto h-12 px-6 text-sm font-semibold border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer bangla-text"
              >
                <Calendar className="mr-2 h-4 w-4 text-blue-600" />
                <span>{tBilingual('Book a Demo', 'লাইভ ডেমো বুক করুন')}</span>
              </Button>
            )}
          </div>

          {/* Trust Guarantees */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{tBilingual('No credit card required', 'কোনো কার্ডের প্রয়োজন নেই')}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{tBilingual(`${trialDays}-day full evaluation`, `${trialDaysBn} দিনের মূল্যায়ন ট্রায়াল`)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{tBilingual('Dhaka onboarding support', 'ঢাকা টিম থেকে অনবোর্ডিং সাপোর্ট')}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
