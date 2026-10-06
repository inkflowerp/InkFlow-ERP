'use client'

import React, { useState } from 'react'
import { HelpCircle, ChevronDown } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { DEFAULT_LANDING_FAQ } from '@/lib/marketing/landing-defaults'
import type { LandingFaqItem } from '@/types/landing-page.types'

interface FAQSectionProps {
  items?: LandingFaqItem[]
}

export function FAQSection({ items }: FAQSectionProps) {
  const { tBilingual } = useI18n()
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const activeFaqs = (items && items.length > 0 ? items : DEFAULT_LANDING_FAQ)
    .filter((f) => f.enabled !== false)
    .sort((a, b) => a.order - b.order)

  const toggleFAQ = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx)
  }

  return (
    <section id="faq" className="py-14 sm:py-20 bg-muted/40 border-t border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span>{tBilingual('FAQ', 'প্রশ্নোত্তর')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {tBilingual('Frequently Asked Questions.', 'সাধারণ প্রশ্নোত্তর।')}
          </h2>
        </div>

        {/* Clean Accordion List */}
        <div className="space-y-2.5">
          {activeFaqs.map((faq, idx) => {
            const isOpen = openIdx === idx

            return (
              <div
                key={faq.id || idx}
                className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(idx)}
                  className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-4 cursor-pointer focus:outline-hidden"
                  aria-expanded={isOpen}
                >
                  <span className="text-xs sm:text-sm font-bold text-foreground pr-2">
                    {tBilingual(faq.questionEn, faq.questionBn)}
                  </span>
                  <div
                    className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-4.5 pb-4 pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/50 animate-in fade-in-0 duration-150">
                    <p className="pt-2">{tBilingual(faq.answerEn, faq.answerBn)}</p>
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
