'use client'

import React from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { FAQSection } from '@/components/marketing/faq-section'
import { FinalCTASection } from '@/components/marketing/final-cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { MarketingDemoProvider } from '@/components/marketing/demo-modal-context'
import { useI18n } from '@/i18n/context'

export default function PublicFAQPage() {
  const { tBilingual } = useI18n()

  return (
    <MarketingDemoProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white font-sans antialiased overflow-x-hidden">
        <MarketingNavbar />

        <main className="pt-20">
          <div className="py-16 sm:py-20 bg-white dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-center px-4">
            <div className="max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full border border-blue-200/70 dark:border-blue-800/60">
                Knowledge Base
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white bangla-text tracking-tight">
                {tBilingual('Frequently Asked Questions', 'প্রিন্টইআরপি সাধারণ প্রশ্নোত্তর')}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed bangla-text">
                {tBilingual(
                  'Got questions about how PrintERP handles flex rolls, Bengali invoices, BDT payments, or multi-branch printing? Find all the answers below.',
                  'রোল ট্র্যাকিং, বাংলা চালান, টাকা পেমেন্ট ও একাধিক ব্রাঞ্চ নিয়ে সাধারণ সব প্রশ্নের উত্তর এখানে পাবেন।'
                )}
              </p>
            </div>
          </div>

          <FAQSection />
          <FinalCTASection />
        </main>

        <MarketingFooter />
      </div>
    </MarketingDemoProvider>
  )
}

