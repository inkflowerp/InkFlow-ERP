'use client'

import React, { useState } from 'react'
import {
  Sparkles,
  Printer,
  Boxes,
  Layers,
  Wrench,
  Truck,
  Building2,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { INDUSTRY_SOLUTIONS } from '@/lib/marketing/marketing-data'

export function IndustrySolutionsSection() {
  const { tBilingual } = useI18n()
  const [selectedIndustry, setSelectedIndustry] = useState<string>('flex_banner')

  const activeInd = INDUSTRY_SOLUTIONS.find((i) => i.id === selectedIndustry) || INDUSTRY_SOLUTIONS[0]

  return (
    <section id="solutions" className="py-16 sm:py-20 md:py-28 bg-slate-900/80 relative overflow-hidden border-t border-slate-800">
      {/* Subtle Glow */}
      <div className="absolute top-1/4 right-1/4 w-[320px] sm:w-[600px] h-[300px] sm:h-[400px] bg-fuchsia-600/5 blur-[100px] sm:blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400 text-xs font-bold uppercase tracking-wider bangla-text">
            <Building2 className="h-3.5 w-3.5 text-fuchsia-400 shrink-0" />
            <span>{tBilingual('Specialized Bangladesh Verticals', '১২টি নির্দিষ্ট প্রিন্ট ও সাইনেজ খাত')}</span>
          </div>

          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight bangla-text">
            {tBilingual(
              'Built for the Way Print Businesses Actually Work.',
              'প্রিন্ট প্রেস যেভাবে বাস্তবে পরিচালিত হয়, ঠিক সেভাবেই তৈরি।'
            )}
          </h2>

          <p className="text-sm sm:text-lg text-slate-400 leading-relaxed bangla-text">
            {tBilingual(
              'Whether you operate a 10ft wide solvent press in Arambagh, an offset packaging unit in Fakirapool, or an outdoor signboard laser shop in Chittagong, PrintERP adapts to your specific machine workflows.',
              'আরামবাগের ব্যানার শপ, ফকিরাপুলের অফসেট প্রেস কিংবা চট্টগ্রামের সাইনবোর্ড ফ্যাব্রিকেশন কারখানা—প্রিন্টইআরপি আপনার সুনির্দিষ্ট কাজের ধরন অনুযায়ী কাজ করে।'
            )}
          </p>
        </div>

        {/* Active Vertical Spotlight Callout */}
        <div className="mt-8 sm:mt-10 p-4 sm:p-6 rounded-2xl border border-cyan-500/40 bg-slate-950/90 shadow-xl max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in-0 duration-200">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0 border border-cyan-500/30">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                Selected Vertical Workflow
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white truncate bangla-text">
                {tBilingual(activeInd.titleEn, activeInd.titleBn)}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1 bangla-text">
                {tBilingual(activeInd.descEn, activeInd.descBn)}
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-cyan-950/50 border border-cyan-800/40 text-cyan-300 text-xs font-semibold shrink-0 flex items-center gap-1.5 self-start sm:self-auto bangla-text">
            <Check className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>{tBilingual(activeInd.highlightEn, activeInd.highlightBn)}</span>
          </div>
        </div>

        {/* 12 Industry Solutions Grid */}
        <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {INDUSTRY_SOLUTIONS.map((ind) => {
            const isSelected = selectedIndustry === ind.id
            return (
              <div
                key={ind.id}
                onClick={() => setSelectedIndustry(ind.id)}
                className={`cursor-pointer rounded-2xl p-5 sm:p-6 border transition-all duration-300 flex flex-col justify-between ${
                  isSelected
                    ? 'border-cyan-400 bg-slate-900 shadow-xl shadow-cyan-950/30 ring-1 ring-cyan-400/50'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-cyan-400 animate-ping' : 'bg-slate-700'}`} />
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Vertical
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors bangla-text">
                    {tBilingual(ind.titleEn, ind.titleBn)}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed bangla-text">
                    {tBilingual(ind.descEn, ind.descBn)}
                  </p>
                </div>

                {/* Specific Feature Highlight Pill */}
                <div className="pt-3.5 sm:pt-4 mt-4 sm:mt-5 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400 bangla-text">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{tBilingual(ind.highlightEn, ind.highlightBn)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
