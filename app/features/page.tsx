'use client'

import React, { useState } from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { SolutionSection } from '@/components/marketing/solution-section'
import { FeatureDeepDiveSection } from '@/components/marketing/feature-deep-dive-section'
import { FinalCTASection } from '@/components/marketing/final-cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { DemoModal } from '@/components/marketing/demo-modal'
import { useI18n } from '@/i18n/context'

export default function PublicFeaturesPage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const { tBilingual } = useI18n()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white font-sans antialiased overflow-x-hidden">
      <MarketingNavbar onOpenDemo={() => setDemoOpen(true)} />

      <main className="pt-20">
        {/* Banner */}
        <div className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 text-center px-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
              Complete Feature Architecture
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white bangla-text">
              {tBilingual(
                'Built Exclusively for Print & Signage Manufacturing.',
                'প্রিন্টিং ও সাইনেজ ম্যানুফ্যাকচারিংয়ের জন্য বিশেষভাবে নির্মিত।'
              )}
            </h1>
            <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed bangla-text">
              {tBilingual(
                'Explore the 9 operational pillars powering modern print shops across Bangladesh. SFT estimates, live machine Kanbans, roll stock, and automatic WhatsApp dues.',
                'বাংলাদেশের আধুনিক প্রেস ও সাইনেজ প্রতিষ্ঠানগুলোর দৈনন্দিন কাজের প্রতিটি খুঁটিনাটি নিখুঁতভাবে পরিচালনার জন্য প্রস্তুত।'
              )}
            </p>
          </div>
        </div>

        <SolutionSection />
        <FeatureDeepDiveSection />
        <FinalCTASection onOpenDemo={() => setDemoOpen(true)} />
      </main>

      <MarketingFooter />
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  )
}
