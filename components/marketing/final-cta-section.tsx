'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Sparkles,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { usePublicSubscriptionPlans, toBengaliDigits } from '@/hooks/use-public-plans'

interface FinalCTASectionProps {
  onOpenDemo?: () => void
}

export function FinalCTASection({ onOpenDemo }: FinalCTASectionProps) {
  const { tBilingual } = useI18n()
  const { trialDays } = usePublicSubscriptionPlans()

  const trialDaysBn = toBengaliDigits(trialDays)

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-slate-950 relative overflow-hidden border-t border-slate-900">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[500px] md:w-[700px] h-[250px] sm:h-[350px] bg-gradient-to-r from-cyan-600/15 via-blue-600/20 to-fuchsia-600/15 blur-[100px] sm:blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="rounded-2xl sm:rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-10 md:p-16 text-center space-y-4 sm:space-y-6 shadow-2xl shadow-cyan-950/40">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-bold uppercase tracking-wider bangla-text">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>{tBilingual('Get Started in Under 2 Minutes', 'মাত্র ২ মিনিটে শুরু করুন')}</span>
          </div>

          {/* Heading */}
          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight max-w-2xl mx-auto bangla-text">
            {tBilingual(
              'Ready to Take Your Print Business to the Next Level?',
              'আপনার প্রেস ব্যবসাকে পরবর্তী ধাপে নিয়ে যেতে প্রস্তুত?'
            )}
          </h2>

          {/* Copy */}
          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed bangla-text">
            {tBilingual(
              'Replace scattered spreadsheets, paper notes and manual calculations with one simple system built for your business.',
              'কাগজের রসিদ, এক্সেল শিট আর আনুমানিক হিসাবের দিন শেষ করুন। প্রেস ও সাইনেজ ব্যবসার জন্য বিশেষভাবে তৈরি পূর্ণাঙ্গ সফটওয়্যার ব্যবহার শুরু করুন আজই।'
            )}
          </p>

          {/* Action Buttons */}
          <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-md sm:max-w-none mx-auto">
            <Link href="/register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-12 sm:h-13 px-6 sm:px-8 text-sm sm:text-base font-bold bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/25 border border-cyan-400/30 group cursor-pointer bangla-text">
                <span>{tBilingual(`Start ${trialDays}-Day Free Trial`, `${trialDaysBn} দিনের ফ্রি ট্রায়াল শুরু`)}</span>
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            {onOpenDemo && (
              <Button
                type="button"
                variant="outline"
                onClick={onOpenDemo}
                className="w-full sm:w-auto h-12 sm:h-13 px-5 sm:px-7 text-sm sm:text-base font-semibold border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white cursor-pointer bangla-text"
              >
                <Calendar className="mr-2 h-4 w-4 text-cyan-400" />
                <span>{tBilingual('Book a Personalized Demo', 'পার্সোনালাইজড ডেমো বুক করুন')}</span>
              </Button>
            )}
          </div>

          {/* Guarantees */}
          <div className="pt-4 sm:pt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] sm:text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 shrink-0" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 shrink-0" />
              Instant automated tenant setup
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 shrink-0" />
              Free onboarding data migration
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
