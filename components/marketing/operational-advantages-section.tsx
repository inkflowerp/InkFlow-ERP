'use client'

import React from 'react'
import {
  Scissors,
  Boxes,
  Clock,
  TrendingUp,
  CreditCard,
  Flame,
  CheckCircle2,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { KEY_OPERATIONAL_ADVANTAGES } from '@/lib/marketing/marketing-data'

export function OperationalAdvantagesSection() {
  const { tBilingual } = useI18n()

  return (
    <section className="py-16 sm:py-24 bg-muted border-t border-border dark:border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 uppercase tracking-wider">
            <span>{tBilingual('Print-Native Architecture', 'প্রিন্ট-বান্ধব স্থাপত্য')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground dark:text-white tracking-tight leading-tight bangla-text">
            {tBilingual(
              'Built Around How Print Businesses Actually Work.',
              'প্রিন্ট প্রেস বাস্তবে যেভাবে চলে, ঠিক সেভাবেই তৈরি।'
            )}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed bangla-text">
            {tBilingual(
              'Traditional ERPs fail in printing presses because print orders are custom manufacturing projects. PrintERP is architected around measurements, rolls, machine queues, and local credit culture.',
              'সাধারণ রিটেইল সফটওয়্যার প্রেসে অচল, কারণ এখানে প্রতিটি কাজ কাস্টম প্রজেক্ট। প্রিন্টইআরপি পরিমাপ, রোল স্টক, মেশিন কিউ ও বাস্তব প্রেস কালচারের ওপর ভিত্তি করে নির্মিত।'
            )}
          </p>
        </div>

        {/* 6 Core Differentiator Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {KEY_OPERATIONAL_ADVANTAGES.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/60">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="text-base font-bold text-foreground dark:text-white bangla-text mb-2">
                    {tBilingual(item.titleEn, item.titleBn)}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed bangla-text">
                    {tBilingual(item.descEn, item.descBn)}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-border flex items-center gap-1.5 text-2xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{tBilingual('Print-Specific Logic', 'প্রেসের নিজস্ব লজিক')}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
