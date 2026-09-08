'use client'

import React, { useState } from 'react'
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageSquare,
  Search,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { FAQS } from '@/lib/marketing/marketing-data'

const CATEGORIES = [
  { id: 'all', labelEn: 'All Questions', labelBn: 'সকল প্রশ্নোত্তর' },
  { id: 'local', labelEn: 'Bangla & BDT', labelBn: 'বাংলা ও টাকা হিসাব' },
  { id: 'production', labelEn: 'Production & Rolls', labelBn: 'প্রোডাকশন ও রোল ইনভেন্টরি' },
  { id: 'billing', labelEn: 'Dues & Accounting', labelBn: 'বকেয়া ও একাউন্টিং' },
]

export function FAQSection() {
  const { tBilingual } = useI18n()
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const toggleFAQ = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx)
  }

  // Assign category indices for clean filtering
  const filteredFaqs = FAQS.filter((_, idx) => {
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'local') return [0, 1, 3, 4].includes(idx)
    if (selectedCategory === 'production') return [2, 5, 6, 11].includes(idx)
    if (selectedCategory === 'billing') return [7, 8, 9, 10].includes(idx)
    return true
  })

  return (
    <section id="faq" className="py-16 sm:py-20 md:py-28 bg-slate-900/80 relative overflow-hidden border-t border-slate-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider bangla-text">
            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{tBilingual('Got Questions? We Have Answers', 'সাধারণ জিজ্ঞাসা ও উত্তর')}</span>
          </div>

          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight bangla-text">
            {tBilingual(
              'Frequently Asked Questions.',
              'সচরাচর জিজ্ঞাসিত প্রশ্নোত্তর।'
            )}
          </h2>

          <p className="text-sm sm:text-lg text-slate-400 leading-relaxed bangla-text">
            {tBilingual(
              'Everything you need to know about PrintERP software, Bengali localization, BDT pricing, and migration from paper slips or Excel.',
              'প্রিন্টইআরপি ব্যবহারের নিয়ম, বাংলা ভাষা, বাংলাদেশি টাকা হিসাব এবং এক্সেল থেকে ডেটা আনার বিস্তারিত তথ্য।'
            )}
          </p>
        </div>

        {/* Category Pills */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id)
                setOpenIdx(null)
              }}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer bangla-text ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tBilingual(cat.labelEn, cat.labelBn)}
            </button>
          ))}
        </div>

        {/* 12 Accessible Accordion Questions */}
        <div className="mt-8 space-y-2.5 sm:space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIdx === idx
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(idx)}
                  className="w-full p-4 sm:p-5 md:p-6 text-left flex items-center justify-between gap-3 sm:gap-4 hover:bg-slate-900/60 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-sm sm:text-base md:text-lg text-white bangla-text leading-snug">
                    {tBilingual(faq.qEn, faq.qBn)}
                  </span>
                  <div
                    className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isOpen ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 md:px-6 md:pb-6 text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3.5 sm:pt-4 bg-slate-900/30 animate-in fade-in-0 duration-200 bangla-text">
                    {tBilingual(faq.aEn, faq.aBn)}
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
