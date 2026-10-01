'use client'

import React from 'react'
import {
  FileText,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Printer,
  Boxes,
  Truck,
  CreditCard,
  ArrowRight,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { CONNECTED_WORKFLOW_STEPS } from '@/lib/marketing/marketing-data'

export function HowShopsWorkSection() {
  const { tBilingual } = useI18n()

  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-card border-t border-border dark:border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 uppercase tracking-wider">
            <span>{tBilingual('Connected Operations', 'সংযুক্ত পরিচালনা')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground dark:text-white tracking-tight leading-tight bangla-text">
            {tBilingual('One Order. One Connected Workflow.', 'একটি অর্ডার। একটি নিরবচ্ছিন্ন কাজের ধারা।')}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed bangla-text">
            {tBilingual(
              'From first customer contact to quotation, design approval, press printing, roll inventory, delivery, and payment — everything stays in sync without phone calls or paper slips.',
              'কাস্টমার অনুসন্ধান থেকে কোটেশন, ডিজাইন প্রুফ, মেশিন প্রিন্ট, রোল স্টক, চালান ও বকেয়া আদায়—সবকিছু চলবে একটি সমন্বিত সিস্টেমে।'
            )}
          </p>
        </div>

        {/* 8-Step Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {CONNECTED_WORKFLOW_STEPS.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="relative p-5 sm:p-6 rounded-2xl border border-border bg-muted hover:bg-card hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-md group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform border border-blue-100 dark:border-blue-900/60">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground tabular-nums">
                      STEP {item.step}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-foreground dark:text-white bangla-text mb-1.5">
                    {tBilingual(item.titleEn, item.titleBn)}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed bangla-text">
                    {tBilingual(item.descEn, item.descBn)}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-border dark:border-border/80 flex items-center justify-between text-2xs font-semibold text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <span>{tBilingual('Automated Gate', 'স্বয়ংক্রিয় ধাপ')}</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
