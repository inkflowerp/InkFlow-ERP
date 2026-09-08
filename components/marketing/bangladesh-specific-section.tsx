'use client'

import React from 'react'
import {
  Sparkles,
  DollarSign,
  Globe2,
  Building2,
  FileText,
  CreditCard,
  Smartphone,
  CheckCircle2,
  MapPin,
  FileSpreadsheet,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { BANGLADESH_FEATURES } from '@/lib/marketing/marketing-data'

export function BangladeshSpecificSection() {
  const { tBilingual } = useI18n()

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-slate-900/70 relative overflow-hidden border-t border-slate-800">
      {/* Subtle Bangladesh Geometric Outline / Watermark Accent */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-emerald-500/5 blur-[100px] sm:blur-[160px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider bangla-text">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            <span>{tBilingual('Engineered for Local Commercial Reality', 'দেশীয় বাণিজ্যিক বাস্তবতার সাথে শতভাগ মানানসই')}</span>
          </div>

          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight bangla-text">
            {tBilingual(
              'Made for Bangladesh.',
              'বাংলাদেশের প্রেস ব্যবসার উপযোগী করে তৈরি।'
            )}
          </h2>

          <p className="text-sm sm:text-lg text-slate-400 leading-relaxed bangla-text">
            {tBilingual(
              'Foreign enterprise software fails in Bangladesh because it does not understand BDT Taka numbering, Bangla customer names, 13-digit BIN tax rules, cash advance culture, or WhatsApp delivery challans. PrintERP was built from the ground up for our market.',
              'বিদেশি সফটওয়্যারগুলো দেশীয় প্রেস কালচার, টাকার হিসাব, বাংলা নাম, ১৩ সংখ্যার বিআইএন বা নগদ অগ্রিমের বাস্তবতাকে বোঝে না। প্রিন্টইআরপি তৈরিই হয়েছে বাংলাদেশের প্রেস ও সাইনেজ শিল্পের প্রয়োজনে।'
            )}
          </p>
        </div>

        {/* 11 Bangladesh Features Grid */}
        <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {BANGLADESH_FEATURES.map((item, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 md:p-6 rounded-2xl border border-slate-800 bg-slate-950/80 hover:border-emerald-500/40 hover:bg-slate-900/90 transition-all flex flex-col justify-between group shadow-md"
            >
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Local Feature
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors bangla-text">
                  {tBilingual(item.titleEn, item.titleBn)}
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed bangla-text">
                  {tBilingual(item.descEn, item.descBn)}
                </p>
              </div>

              <div className="pt-3.5 sm:pt-4 mt-4 sm:mt-5 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>NBR & Industry Verified</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
