'use client'

import React from 'react'
import {
 CheckCircle2,
 DollarSign,
 Languages,
 MapPin,
 FileCheck,
 CreditCard,
 MessageSquare,
 Smartphone,
 ShieldCheck,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { BANGLADESH_SPECIFIC_FEATURES } from '@/lib/marketing/marketing-data'

export function BangladeshFeaturesSection() {
 const { tBilingual } = useI18n()

 const FEATURE_ICONS: Record<number, React.ElementType> = {
    0: DollarSign,
    1: Languages,
    2: MapPin,
    3: FileCheck,
    4: CreditCard,
    5: MessageSquare,
    6: ShieldCheck,
    7: Smartphone,
  }

 return (
    <section className="py-16 sm:py-24 bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success-surface text-success bg-success-surface/60 text-success border border-success-border/70 border-success-border/60 uppercase tracking-wider">
            <span>{tBilingual('Bangladesh First', 'বাংলাদেশ ফার্স্ট')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight bangla-text">
            {tBilingual('Built for Businesses in Bangladesh.', 'বাংলাদেশের প্রেস ও কারখানার বাস্তব উপযোগী করে নির্মিত।')}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed bangla-text">
            {tBilingual(
              'No foreign currency confusion or unnatural translations. Every invoice, payment, and challan follows Bangladeshi business standards.',
              'কোনো বিদেশি মুদ্রার ঝামেলা বা কৃত্রিম অনুবাদ নয়। প্রতিটি ইনভয়েস, পেমেন্ট ও চালান দেশীয় ব্যবসায়িক নিয়ম অনুযায়ী প্রস্তুত।'
            )}
          </p>
        </div>

        {/* 8 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {BANGLADESH_SPECIFIC_FEATURES.map((feat, idx) => {
 const Icon = FEATURE_ICONS[idx] || CheckCircle2
 return (
              <div
 key={idx}
 className="p-5 sm:p-6 rounded-xl border border-border bg-muted hover:bg-card hover:border-input transition-all shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="h-9 w-9 rounded-xl bg-success-surface bg-success-surface/80 text-success text-success flex items-center justify-center border border-success-border border-success-border/60">
                      <Icon className="h-4.5 w-4.5"/>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-success-surface/80 text-success bg-success-surface text-success border border-success-border/40">
                      {feat.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground bangla-text mb-1.5">
                    {tBilingual(feat.titleEn, feat.titleBn)}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed bangla-text">
                    {tBilingual(feat.descEn, feat.descBn)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
