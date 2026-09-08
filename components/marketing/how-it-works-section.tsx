'use client'

import React, { useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Workflow,
  Sparkles,
  Users,
  Printer,
  Truck,
  CreditCard,
  DollarSign,
  Layers,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { WORKFLOW_STEPS } from '@/lib/marketing/marketing-data'

export function HowItWorksSection() {
  const { tBilingual } = useI18n()
  const [activeStep, setActiveStep] = useState<number>(0)

  return (
    <section id="how-it-works" className="py-16 sm:py-20 md:py-28 bg-slate-950 relative overflow-hidden border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider bangla-text">
            <Workflow className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span>{tBilingual('End-to-End Pipeline', 'শুরু থেকে শেষ পর্যন্ত নিরবচ্ছিন্ন প্রবাহ')}</span>
          </div>

          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight bangla-text">
            {tBilingual(
              'From Customer Request to Delivery — One Simple Workflow.',
              'কাস্টমার রিকোয়েস্ট থেকে সাইট ডেলিভারি—একটি সুশৃঙ্খল প্রক্রিয়া।'
            )}
          </h2>

          <p className="text-sm sm:text-lg text-slate-400 leading-relaxed bangla-text">
            {tBilingual(
              'Instead of isolated silos where sales forgets to tell designers, and operators print the wrong file, PrintERP connects every department into a single shared source of truth.',
              'সেলস, গ্রাফিক ডিজাইনার, মেশিন অপারেটর এবং ডেলিভারি টিম যাতে বিচ্ছিন্ন না থাকে, সেজন্য প্রিন্টইআরপি প্রতিটি ধাপকে এক সুতোয় বেঁধে দেয়।'
            )}
          </p>
        </div>

        {/* 11-Step Interactive Visual Timeline */}
        <div className="mt-10 sm:mt-14 relative">
          {/* Horizontal Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-4 right-4 h-0.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-500 -translate-y-1/2 opacity-30 pointer-events-none" />

          {/* Stepper Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {WORKFLOW_STEPS.map((s, idx) => {
              const isSelected = activeStep === idx
              return (
                <div
                  key={s.step}
                  onClick={() => setActiveStep(idx)}
                  className={`cursor-pointer rounded-xl p-3 sm:p-4 border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-950/50 scale-[1.02] sm:scale-[1.03]'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <span className="font-mono text-[11px] sm:text-xs font-black text-cyan-400">
                      {s.step}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isSelected ? 'bg-cyan-400 animate-ping' : 'bg-slate-700'
                      }`}
                    />
                  </div>

                  <div className="space-y-0.5 sm:space-y-1">
                    <h4 className="font-bold text-xs sm:text-sm text-white leading-tight bangla-text">
                      {tBilingual(s.titleEn, s.titleBn)}
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-2 leading-tight bangla-text">
                      {tBilingual(s.descEn, s.descBn)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Highlight Focus Card for Active Step */}
        <div className="mt-6 sm:mt-8 max-w-3xl mx-auto p-4 sm:p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-slate-950/90 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-black text-base sm:text-lg shrink-0 border border-cyan-500/40">
              {WORKFLOW_STEPS[activeStep].step}
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-cyan-400 uppercase tracking-wider">
                ACTIVE STEP IN WORKFLOW
              </div>
              <div className="text-base sm:text-lg font-bold text-white bangla-text">
                {tBilingual(WORKFLOW_STEPS[activeStep].titleEn, WORKFLOW_STEPS[activeStep].titleBn)}
              </div>
              <div className="text-xs sm:text-sm text-slate-300 mt-0.5 bangla-text">
                {tBilingual(WORKFLOW_STEPS[activeStep].descEn, WORKFLOW_STEPS[activeStep].descBn)}
              </div>
            </div>
          </div>

          <div className="text-[11px] sm:text-xs font-semibold text-slate-400 shrink-0 flex items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 w-full sm:w-auto">
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 shrink-0" />
            <span>Auto-Logged in Audit Trail</span>
          </div>
        </div>
      </div>
    </section>
  )
}
