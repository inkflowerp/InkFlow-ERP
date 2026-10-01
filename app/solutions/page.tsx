'use client'

import React from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { IndustrySolutionsSection } from '@/components/marketing/industry-solutions-section'
import { HowShopsWorkSection } from '@/components/marketing/how-shops-work-section'
import { OperationalAdvantagesSection } from '@/components/marketing/operational-advantages-section'
import { FinalCTASection } from '@/components/marketing/final-cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { MarketingDemoProvider } from '@/components/marketing/demo-modal-context'
import { useI18n } from '@/i18n/context'

export default function PublicSolutionsPage() {
  const { tBilingual } = useI18n()

  return (
    <MarketingDemoProvider>
      <div className="min-h-screen bg-muted text-foreground selection:bg-blue-600 selection:text-white font-sans antialiased overflow-x-hidden">
        <MarketingNavbar />

        <main className="pt-20">
          <div className="py-16 sm:py-20 bg-card border-b border-border text-center px-4">
            <div className="max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full border border-blue-200/70 dark:border-blue-800/60">
                Industry Verticals
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground dark:text-white bangla-text tracking-tight">
                {tBilingual(
                  'Solutions Tailored to Your Specific Print Craft.',
                  'আপনার সুনির্দিষ্ট প্রেস বা কারখানার কাজের উপযোগী সমাধান।'
                )}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed bangla-text">
                {tBilingual(
                  'From wide flex solvent printers to multi-color offset presses, acrylic CNC laser shops, and nationwide billboard contractors.',
                  'লার্জ ফরম্যাট সলভেন্ট ব্যানার থেকে শুরু করে মাল্টিকালর অফসেট প্রেস, এক্রিলিক লেজার শপ ও দেশব্যাপী সাইনবোর্ড ফিটিং কনট্রাক্টর।'
                )}
              </p>
            </div>
          </div>

          <IndustrySolutionsSection />
          <HowShopsWorkSection />
          <OperationalAdvantagesSection />
          <FinalCTASection />
        </main>

        <MarketingFooter />
      </div>
    </MarketingDemoProvider>
  )
}

