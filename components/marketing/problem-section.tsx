'use client'

import React, { useState } from 'react'
import {
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
  MessageSquare,
  FileText,
  PhoneCall,
  Calculator,
  Printer,
  Boxes,
  TrendingUp,
  CreditCard,
  Layers,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { PROBLEMS_BEFORE, SOLUTIONS_AFTER } from '@/lib/marketing/marketing-data'

export function ProblemSection() {
  const { tBilingual } = useI18n()
  const [activeTab, setActiveTab] = useState<'comparison' | 'before' | 'after'>('comparison')

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-slate-950 relative overflow-hidden border-t border-slate-900">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-0 w-72 sm:w-96 h-72 sm:h-96 bg-red-500/5 blur-[100px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-500/5 blur-[100px] sm:blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider bangla-text">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
            <span>{tBilingual('The Chaos in Traditional Printing', 'প্রেস ব্যবসার নিত্যদিনের বিশৃঙ্খলা')}</span>
          </div>

          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight bangla-text">
            {tBilingual(
              'Still Running Your Print Shop on Excel, WhatsApp & Paper?',
              'এখনও কি এক্সেল, হোয়াটসঅ্যাপ আর কাঁচা রসিদে প্রেস চালাচ্ছেন?'
            )}
          </h2>

          <p className="text-sm sm:text-lg text-slate-400 leading-relaxed bangla-text">
            {tBilingual(
              'Traditional print shops in Bangladesh lose up to 18% of monthly profits through miscalculated measurements, uncollected customer credit, untracked roll wastage, and misplaced paper slips.',
              'কাগজের রসিদ হারিয়ে যাওয়া, ভুল স্কয়ারফিট হিসাব, অনাদায়ী বকেয়া এবং মিডিয়া ও কালির অপচয়ের কারণে প্রতি মাসে প্রেসের ১৮% পর্যন্ত মুনাফা নষ্ট হয়।'
            )}
          </p>
        </div>

        {/* Visual Quick Channels Before vs After Cards */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 max-w-4xl mx-auto">
          {/* Quick Pill: Before */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-red-900/40 bg-gradient-to-br from-red-950/30 to-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <XCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-red-400">
                  BEFORE PRINT ERP
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5 leading-snug">
                  Paper • Excel • WhatsApp • Phone Calls • Manual Math
                </div>
              </div>
            </div>
          </div>

          {/* Quick Pill: After */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/30 to-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400">
                  AFTER PRINT ERP
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5 leading-snug">
                  Quotation • Orders • Production • Rolls • Dues • Profit
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deep Comparison Side-by-Side Grid */}
        <div className="mt-8 sm:mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* LEFT: THE OLD CHAOTIC WAY (BEFORE) */}
          <div className="rounded-2xl border border-red-900/40 bg-slate-900/50 p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white bangla-text">
                    {tBilingual('The Paper & WhatsApp Trap', 'কাগজ ও হোয়াটসঅ্যাপের ফাঁদ')}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-red-300/80">Disconnected, error-prone and stressful</p>
                </div>
              </div>
              <span className="text-[10px] sm:text-xs font-mono font-bold text-red-400 bg-red-950/60 px-2 sm:px-2.5 py-1 rounded border border-red-800/40 shrink-0">
                OLD WAY
              </span>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {PROBLEMS_BEFORE.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/50 hover:border-red-900/40 transition-colors"
                >
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                    <XCircle className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-200 bangla-text">
                      {tBilingual(item.titleEn, item.titleBn)}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed bangla-text">
                      {tBilingual(item.descEn, item.descBn)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: THE MODERN PRINTERP WAY (AFTER) */}
          <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-cyan-950/20 via-slate-900/60 to-slate-900/90 p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 relative overflow-hidden shadow-xl shadow-cyan-950/20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white bangla-text">
                    {tBilingual('The PrintERP Single-Screen Way', 'প্রিন্টইআরপির এক স্ক্রিন সমাধান')}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-cyan-300/80">Synchronized, automated and profitable</p>
                </div>
              </div>
              <span className="text-[10px] sm:text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 sm:px-2.5 py-1 rounded border border-cyan-800/40 shrink-0">
                PRINTERP OS
              </span>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {SOLUTIONS_AFTER.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl border border-cyan-500/20 bg-slate-950/60 hover:border-cyan-500/40 transition-colors shadow-xs"
                >
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white bangla-text">
                      {tBilingual(item.titleEn, item.titleBn)}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed bangla-text">
                      {tBilingual(item.descEn, item.descBn)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
