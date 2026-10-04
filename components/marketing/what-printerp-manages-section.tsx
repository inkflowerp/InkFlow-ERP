'use client'

import React from 'react'
import {
 FileText,
 Printer,
 Boxes,
 Users,
 CreditCard,
 Building2,
 CheckCircle2,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { WHAT_PRINTERP_MANAGES } from '@/lib/marketing/marketing-data'

export function WhatPrintErpManagesSection() {
 const { tBilingual } = useI18n()

 const CATEGORY_ICONS: Record<string, React.ElementType> = {
 sales: FileText,
 production: Printer,
 inventory: Boxes,
 workforce: Users,
 finance: CreditCard,
 management: Building2,
  }

 return (
    <section id="features"className="py-16 sm:py-24 bg-muted border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary bg-primary/10 text-primary border border-primary/20/70 border-border/60 uppercase tracking-wider">
            <span>{tBilingual('Operations Map', 'অপারেশনস ম্যাপ')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight bangla-text">
            {tBilingual('What PrintERP Actually Manages.', 'প্রিন্টইআরপি আপনার ব্যবসায়ের ঠিক কী কী পরিচালনা করে।')}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed bangla-text">
            {tBilingual(
              'A compact operations map connecting the six essential pillars of your print and signage workshop into one clear, scannable control center.',
              'আপনার প্রেস ও কারখানার ৬টি অপরিহার্য অপারেশনাল স্তম্ভকে একটি সমন্বিত ও স্বচ্ছ কন্ট্রোল সেন্টারে সংযুক্ত করা হয়েছে।'
            )}
          </p>
        </div>

        {/* 6 Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHAT_PRINTERP_MANAGES.map((cat) => {
 const Icon = CATEGORY_ICONS[cat.id] || FileText
 const items = tBilingual(
 JSON.stringify(cat.itemsEn),
 JSON.stringify(cat.itemsBn)
            )
 const parsedItems: string[] = JSON.parse(items)

 return (
              <div
 key={cat.id}
 className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm hover:border-input transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 pb-3 border-b border-border">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 bg-primary/10 text-primary text-primary flex items-center justify-center shrink-0 border border-border border-border/60">
                      <Icon className="h-5 w-5"/>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground bangla-text">
                        {tBilingual(cat.titleEn, cat.titleBn)}
                      </h3>
                      <span className="text-xs text-muted-foreground uppercase font-semibold">
                        {tBilingual('Core Operations', 'মূল কার্যপরিধি')}
                      </span>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2.5">
                    {parsedItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary text-primary shrink-0 mt-0.5"/>
                        <span className="leading-snug bangla-text">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-border text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>{tBilingual('Fully Connected', 'সম্পূর্ণ সমন্বিত')}</span>
                  <span className="text-primary text-primary font-bold">PrintERP Core</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
