'use client'

import React from 'react'
import {
 Printer,
 Building2,
 ArrowRight,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { INDUSTRY_SECTORS } from '@/lib/marketing/marketing-data'

export function IndustrySolutionsSection() {
 const { tBilingual } = useI18n()

 return (
    <section id="solutions"className="py-16 sm:py-24 bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 uppercase tracking-wider">
            <Building2 className="h-3.5 w-3.5"/>
            <span>{tBilingual('Print & Signage Verticals', 'প্রিন্ট ও সাইনেজ খাত')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight bangla-text">
            {tBilingual(
              'Tailored for Every Printing & Signage Sector.',
              'আপনার প্রেসের সুনির্দিষ্ট কাজের ধরনের উপযোগী।'
            )}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed bangla-text">
            {tBilingual(
              'Whether running wide-format solvent banners in Arambagh, offset packaging in Fakirapool, or acrylic laser cutting in Chattogram, PrintERP adapts to your craft.',
              'আরামবাগের ব্যানার শপ, ফকিরাপুলের অফসেট প্রেস কিংবা চট্টগ্রামের সাইনবোর্ড ফ্যাব্রিকেশন—প্রিন্টইআরপি আপনার কারখানার কাজের ধরন অনুযায়ী মানানসই।'
            )}
          </p>
        </div>

        {/* 12 Industry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {INDUSTRY_SECTORS.map((sector) => {
 const Icon = sector.icon || Printer
 return (
              <div
 key={sector.id}
 className="p-5 rounded-xl border border-border bg-muted hover:bg-card hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-sm group flex flex-col justify-between">
                <div>
                  <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-blue-100 dark:border-blue-900/60">
                    <Icon className="h-4 w-4"/>
                  </div>
                  <h3 className="text-sm font-bold text-foreground bangla-text mb-1">
                    {tBilingual(sector.titleEn, sector.titleBn)}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed bangla-text">
                    {tBilingual(sector.descEn, sector.descBn)}
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
