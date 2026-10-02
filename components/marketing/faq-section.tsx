'use client'

import React, { useState } from 'react'
import {
 HelpCircle,
 ChevronDown,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { FAQS } from '@/lib/marketing/marketing-data'

export function FAQSection() {
 const { tBilingual } = useI18n()
 const [openIdx, setOpenIdx] = useState<number | null>(0)

 const toggleFAQ = (idx: number) => {
 setOpenIdx(openIdx === idx ? null : idx)
  }

 return (
    <section id="faq"className="py-16 sm:py-24 bg-muted border-t border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14">
        {/* Section Header */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 uppercase tracking-wider">
            <HelpCircle className="h-3.5 w-3.5"/>
            <span>{tBilingual('Clear Answers', 'সাধারণ প্রশ্নোত্তর')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight bangla-text">
            {tBilingual('Frequently Asked Questions.', 'সচরাচর জিজ্ঞাসিত প্রশ্নোত্তর।')}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed bangla-text">
            {tBilingual(
              'Clear, direct answers about PrintERP features, roll tracking, Bengali localization, BDT pricing, and getting started.',
              'প্রিন্টইআরপির ফিচার, রোল স্টক, বাংলা ভাষা, টাকা হিসাব এবং সহজে শুরু করার স্পষ্ট উত্তর।'
            )}
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
 const isOpen = openIdx === idx

 return (
              <div
 key={idx}
 className="rounded-xl border border-border bg-card overflow-hidden transition-all shadow-2xs">
                <button
 type="button"onClick={() => toggleFAQ(idx)}
 className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-bold text-foreground bangla-text pr-2">
                    {tBilingual(faq.qEn, faq.qBn)}
                  </span>
                  <div
 className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${
 isOpen
                        ? 'rotate-180 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <ChevronDown className="h-4 w-4"/>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border /60 bangla-text animate-in fade-in-0 duration-150">
                    <p>{tBilingual(faq.aEn, faq.aBn)}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
