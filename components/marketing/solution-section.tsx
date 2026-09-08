'use client'

import React from 'react'
import {
  Sparkles,
  ArrowRight,
  Printer,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { CORE_FEATURES } from '@/lib/marketing/marketing-data'

export function SolutionSection() {
  const { tBilingual } = useI18n()

  return (
    <section id="features" className="py-16 sm:py-20 md:py-28 bg-slate-900/60 relative overflow-hidden border-t border-slate-800">
      {/* Background Ambience */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[320px] sm:w-[500px] md:w-[800px] h-[300px] sm:h-[500px] bg-cyan-600/5 blur-[100px] sm:blur-[160px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider bangla-text">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>{tBilingual('Integrated Architecture', 'সম্পূর্ণ ইন্টিগ্রেটেড সিস্টেম')}</span>
          </div>

          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight bangla-text">
            {tBilingual(
              'Everything Your Print Business Needs.',
              'আপনার প্রেস ও সাইনেজ ব্যবসার পূর্ণাঙ্গ সমাধান।'
            )}
          </h2>

          <p className="text-sm sm:text-lg text-slate-400 leading-relaxed bangla-text">
            {tBilingual(
              'Nine tightly coupled modules designed explicitly around the reality of printing presses, solvent workshops, signage fabrication, and fitting operations in Bangladesh.',
              'বাংলাদেশের প্রিন্টিং প্রেস, সলভেন্ট ব্যানার, সাইনবোর্ড ফ্যাব্রিকেশন ও ইনস্টলেশন কাজের বাস্তবতার সাথে সামঞ্জস্য রেখে তৈরি ৯টি স্বয়ংসম্পূর্ণ মডিউল।'
            )}
          </p>
        </div>

        {/* 9 Feature Cards Grid (3x3) */}
        <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {CORE_FEATURES.map((f, idx) => {
            const Icon = f.icon
            return (
              <div
                key={idx}
                className="group relative rounded-2xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6 md:p-7 hover:border-cyan-500/40 hover:bg-slate-900/90 transition-all duration-300 flex flex-col justify-between shadow-lg shadow-black/20 hover:shadow-cyan-950/30"
              >
                {/* Card Top Icon & Tag */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-105 group-hover:bg-cyan-500/30 transition-all shrink-0">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-900 text-cyan-400 border border-slate-800 bangla-text shrink-0">
                      {tBilingual(f.tagEn, f.tagBn)}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-300 transition-colors bangla-text">
                    {tBilingual(f.titleEn, f.titleBn)}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed bangla-text">
                    {tBilingual(f.descEn, f.descBn)}
                  </p>
                </div>

                {/* Bottom subtle detail */}
                <div className="pt-4 sm:pt-5 mt-4 sm:mt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 group-hover:text-cyan-400 transition-colors">
                  <span className="font-mono text-[10px] sm:text-[11px]">Module {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                  <span className="flex items-center gap-1 font-semibold text-[11px] sm:text-xs">
                    Explore Deep-Dive <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
