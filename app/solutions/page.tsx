'use client'

import React, { useState } from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { IndustrySolutionsSection } from '@/components/marketing/industry-solutions-section'
import { HowItWorksSection } from '@/components/marketing/how-it-works-section'
import { FinalCTASection } from '@/components/marketing/final-cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { DemoModal } from '@/components/marketing/demo-modal'
import { useI18n } from '@/i18n/context'

export default function PublicSolutionsPage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const { tBilingual } = useI18n()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white font-sans antialiased overflow-x-hidden">
      <MarketingNavbar onOpenDemo={() => setDemoOpen(true)} />

      <main className="pt-20">
        <div className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 text-center px-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-fuchsia-400 uppercase tracking-wider bg-fuchsia-950/60 px-3 py-1 rounded-full border border-fuchsia-500/30">
              Industry Verticals
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white bangla-text">
              {tBilingual(
                'Solutions Tailored to Your Specific Print Craft.',
                'আপনার সুনির্দিষ্ট প্রেস বা কারখানার কাজের উপযোগী সমাধান।'
              )}
            </h1>
            <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed bangla-text">
              {tBilingual(
                'From wide flex solvent printers to multi-color offset presses, acrylic CNC laser shops, and nationwide billboard contractors.',
                'লার্জ ফরম্যাট সলভেন্ট ব্যানার থেকে শুরু করে মাল্টিকালর অফসেট প্রেস, এক্রিলিক লেজার শপ ও দেশব্যাপী সাইনবোর্ড ফিটিং কনট্রাক্টর।'
              )}
            </p>
          </div>
        </div>

        <IndustrySolutionsSection />
        <HowItWorksSection />
        <FinalCTASection onOpenDemo={() => setDemoOpen(true)} />
      </main>

      <MarketingFooter />
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  )
}
