'use client'

import React, { useState } from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { FAQSection } from '@/components/marketing/faq-section'
import { FinalCTASection } from '@/components/marketing/final-cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { DemoModal } from '@/components/marketing/demo-modal'
import { useI18n } from '@/i18n/context'

export default function PublicFAQPage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const { tBilingual } = useI18n()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white font-sans antialiased overflow-x-hidden">
      <MarketingNavbar onOpenDemo={() => setDemoOpen(true)} />

      <main className="pt-20">
        <div className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 text-center px-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
              Knowledge Base
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white bangla-text">
              {tBilingual('Frequently Asked Questions', 'প্রিন্টইআরপি সাধারণ প্রশ্নোত্তর')}
            </h1>
            <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed bangla-text">
              {tBilingual(
                'Got questions about how PrintERP handles flex rolls, Bengali invoices, BDT payments, or multi-branch printing? Find all the answers below.',
                'রোল ট্র্যাকিং, বাংলা চালান, টাকা পেমেন্ট ও একাধিক ব্রাঞ্চ নিয়ে সাধারণ সব প্রশ্নের উত্তর এখানে পাবেন।'
              )}
            </p>
          </div>
        </div>

        <FAQSection />
        <FinalCTASection onOpenDemo={() => setDemoOpen(true)} />
      </main>

      <MarketingFooter />
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  )
}
