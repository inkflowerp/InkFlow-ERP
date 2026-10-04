'use client'

import React from 'react'
import {
 XCircle,
 CheckCircle2,
 ArrowRight,
 AlertCircle,
 Sparkles,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { PROBLEMS_BEFORE_AFTER } from '@/lib/marketing/marketing-data'

export function CoreProblemsSection() {
 const { tBilingual } = useI18n()

 const QUICK_COMPARISON = [
    { before: 'WhatsApp Chits', after: 'Centralized Digital Quotes' },
    { before: 'Torn Paper Memos', after: 'Digital Job Tickets' },
    { before: 'Manual Phone Calls', after: 'Live Floor Kanban' },
    { before: 'Guessed Roll Wastage', after: 'Tracked SqFt Deductions' },
    { before: 'Forgotten Credit Dues', after: 'WhatsApp Due Reminders' },
    { before: 'Uncalculated Margins', after: 'True Job Net Profit' },
  ]

 return (
    <section className="py-16 sm:py-24 bg-muted border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-danger-surface text-destructive bg-danger-surface/60 text-destructive border border-danger-border/80 border-danger-border/60 uppercase tracking-wider">
            <AlertCircle className="h-3.5 w-3.5"/>
            <span>{tBilingual('Operational Friction', 'দৈনন্দিন কাজের বাধা')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight bangla-text">
            {tBilingual("Your Print Business Shouldn't Run on Memory.",
              'আপনার প্রেসের পুরো ব্যবসা স্মৃতির ওপর নির্ভর করে চলা উচিত নয়।'
            )}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed bangla-text">
            {tBilingual(
              'When quotes live in WhatsApp chats, job sizes on loose slips, and customer credit in memory, mistakes and lost profits are inevitable. Here is how PrintERP transforms the chaos into order.',
              'কোটেশন যখন হোয়াটসঅ্যাপে, কাজের মাপ ছেঁড়া চিরকুটে আর বাকি টাকা স্মৃতির ওপর থাকে, তখন কাজের ভুল ও লোকসান ঠেকানো অসম্ভব। প্রিন্টইআরপি এই বিশৃঙ্খলাকে শৃঙ্খলায় রূপান্তর করে।'
            )}
          </p>
        </div>

        {/* Quick Before vs After Badge Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {QUICK_COMPARISON.map((item, idx) => (
            <div
 key={idx}
 className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-destructive text-destructive font-semibold line-through decoration-rose-400/80 opacity-75">
                <XCircle className="h-3.5 w-3.5 shrink-0"/>
                <span className="truncate">{item.before}</span>
              </div>
              <div className="flex items-center gap-1.5 text-primary text-primary font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success"/>
                <span className="truncate">{item.after}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed 6 Problem Cards with Side-by-Side Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {PROBLEMS_BEFORE_AFTER.map((card, idx) => (
            <div
 key={idx}
 className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-primary text-primary uppercase tracking-wider block mb-2">
                  {tBilingual(card.categoryEn, card.categoryBn)}
                </span>

                {/* Before Box */}
                <div className="p-3 rounded-xl bg-danger-surface/60 bg-danger-surface border border-danger-border border-danger-border/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-destructive text-destructive uppercase tracking-wider">
                    <XCircle className="h-3 w-3 shrink-0"/>
                    <span>{tBilingual('Before: Scattered Manual Way', 'পূর্বে: ছড়িয়ে-ছিটিয়ে থাকা পদ্ধতি')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed bangla-text">
                    {tBilingual(card.beforeEn, card.beforeBn)}
                  </p>
                </div>

                {/* Arrow Divider */}
                <div className="flex justify-center py-1.5 text-muted-foreground">
                  <ArrowRight className="h-4 w-4 rotate-90"/>
                </div>

                {/* After Box */}
                <div className="p-3 rounded-xl bg-success-surface/60 bg-success-surface border border-success-border border-success-border/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-success text-success uppercase tracking-wider">
                    <CheckCircle2 className="h-3 w-3 shrink-0"/>
                    <span>{tBilingual('With PrintERP: Connected & Clear', 'প্রিন্টইআরপিতে: সমন্বিত ও পরিষ্কার')}</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed font-medium bangla-text">
                    {tBilingual(card.afterEn, card.afterBn)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
