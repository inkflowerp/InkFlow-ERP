'use client'

import React from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { WhatPrintErpManagesSection } from '@/components/marketing/what-printerp-manages-section'
import { FeatureDeepDiveSection } from '@/components/marketing/feature-deep-dive-section'
import { FinalCTASection } from '@/components/marketing/final-cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { MarketingDemoProvider } from '@/components/marketing/demo-modal-context'
import { useI18n } from '@/i18n/context'

export default function PublicFeaturesPage() {
  const { tBilingual } = useI18n()

  return (
    <MarketingDemoProvider>
      <div className="min-h-screen bg-muted text-foreground selection:bg-primary selection:text-white font-sans antialiased overflow-x-hidden">
        <MarketingNavbar />

        <main className="pt-20">
          {/* Banner */}
          <div className="py-16 sm:py-20 bg-card border-b border-border text-center px-4">
            <div className="mx-auto space-y-3">
              <span className="text-xs font-bold text-primary text-primary uppercase tracking-wider bg-primary/10 bg-primary/10 px-3 py-1 rounded-full border border-primary/20/70 border-border/60">
                Complete Feature Architecture
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground dark:text-white bangla-text tracking-tight">
                {tBilingual(
                  'Built Exclusively for Print & Signage Manufacturing.',
                  'প্রিন্টিং ও সাইনেজ ম্যানুফ্যাকচারিংয়ের জন্য বিশেষভাবে নির্মিত।'
                )}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed bangla-text">
                {tBilingual(
                  'Explore the 9 operational pillars powering modern print shops across Bangladesh. SFT estimates, live machine Kanbans, roll stock, and automatic WhatsApp dues.',
                  'বাংলাদেশের আধুনিক প্রেস ও সাইনেজ প্রতিষ্ঠানগুলোর দৈনন্দিন কাজের প্রতিটি খুঁটিনাটি নিখুঁতভাবে পরিচালনার জন্য প্রস্তুত।'
                )}
              </p>
            </div>
          </div>

          <WhatPrintErpManagesSection />
          <FeatureDeepDiveSection />
          <FinalCTASection />
        </main>

        <MarketingFooter />
      </div>
    </MarketingDemoProvider>
  )
}

