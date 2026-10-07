'use client'

import React, { useState } from 'react'
import {
  FileText,
  AlertTriangle,
  HelpCircle,
  PhoneCall,
  FileQuestion,
  Clock,
  Scissors,
  XCircle,
  CheckCircle2,
  FileCheck2,
  Boxes,
  MonitorCheck,
  CreditCard,
  QrCode,
  ArrowRight,
  Sparkles,
  Columns2,
  Rows3,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import type { LandingComparisonConfig } from '@/types/landing-page.types'

interface ComparisonSectionProps {
  config?: LandingComparisonConfig
}

export function WithoutPrintFlowSection({ config }: ComparisonSectionProps) {
  const { tBilingual } = useI18n()
  const [layoutMode, setLayoutMode] = useState<'columns' | 'cards'>('columns')

  const eyebrowEn = config?.eyebrowEn || 'Operational Comparison'
  const eyebrowBn = config?.eyebrowBn || 'কাজের বাস্তব পার্থক্য'

  const headlineEn =
    config?.headlineEn || 'Old Press Chaos vs. The PrintFlow Way'
  const headlineBn =
    config?.headlineBn || 'প্রচলিত প্রেসের বিশৃঙ্খলা বনাম আধুনিক প্রিন্টফ্লো'

  const descEn =
    config?.descriptionEn ||
    'Replace torn paper slips, roll shortages, and forgotten dues with a single connected system.'
  const descBn =
    config?.descriptionBn ||
    'ছেঁড়া কাগজের স্লিপ, রোলের সংকট ও বকেয়ার ঝামেলা ভুলে শুরু করুন আধুনিক ক্লাউড প্রেস।'

  const withoutTitleEn = config?.withoutTitleEn || 'Without PrintFlow (Traditional Paper Chaos)'
  const withoutTitleBn = config?.withoutTitleBn || 'প্রিন্টফ্লো ছাড়া অবস্থা (কাগজের বিশৃঙ্খলা)'

  const withTitleEn = config?.withTitleEn || 'With PrintFlow (Connected Cloud System)'
  const withTitleBn = config?.withTitleBn || 'প্রিন্টফ্লো সহ (সংযুক্ত ক্লাউড সিস্টেম)'

  const DEFAULT_PAIRS = [
    {
      id: 'cmp-1',
      categoryEn: 'Job Tickets & Instructions',
      categoryBn: 'জব টিকিট ও কাজের নির্দেশ',
      beforeIcon: FileText,
      afterIcon: FileCheck2,
      beforeEn: 'Torn paper slips stained by solvent ink. Misprints and lost specs come out of your own pocket.',
      beforeBn: 'ছেঁড়া কাগজে হাতে লেখা স্লিপ কালিতে নষ্ট বা হারিয়ে যায়; ভুল প্রিন্টের লোকসান নিজের পকেট থেকে যায়।',
      afterEn: 'Barcoded digital job tickets with dimensions, roll code, and artwork preview. 100% accurate.',
      afterBn: 'নিখুঁত মাপ, রোল কোড ও আর্টওয়ার্ক প্রাকদর্শন সম্বলিত ডিজিটাল বারকোড জব টিকিট। ০% ভুল প্রিন্ট।',
      beforeTagEn: 'Misprints & Waste',
      beforeTagBn: 'ভুল প্রিন্ট ও লোকসান',
      afterTagEn: '100% Accurate Jobs',
      afterTagBn: '১০০% নিখুঁত কাজ',
    },
    {
      id: 'cmp-2',
      categoryEn: 'Roll Media Inventory',
      categoryBn: 'রোল স্টক ও কাঁচামাল',
      beforeIcon: HelpCircle,
      afterIcon: Boxes,
      beforeEn: 'Flex rolls run out unexpectedly at 10 PM mid-job. Press sits idle while scrambling for stock.',
      beforeBn: 'রাত ১০টায় জরুরি প্রিন্টের মাঝপথে রোল শেষ। মেশিন বন্ধ থাকে আর মেটেরিয়াল খুঁজতে ছোটাছুটি।',
      afterEn: 'Master rolls tracked by width & length. Real-time SFT deductions and low-stock alerts.',
      afterBn: 'প্রস্থ ও দৈর্ঘ্য অনুযায়ী রিয়েল-টাইম স্কয়ারফিট স্টক হিসাব এবং রোল শেষ হওয়ার আগেই অ্যালার্ট।',
      beforeTagEn: 'Emergency Outages',
      beforeTagBn: 'মাঝপথে কাজ বন্ধ',
      afterTagEn: 'Live SFT Balance',
      afterTagBn: 'লাইভ স্কয়ারফিট স্টক',
    },
    {
      id: 'cmp-3',
      categoryEn: 'Remnant Offcut Scrap',
      categoryBn: 'কাটিং স্ক্র্যাপ ও অপচয়',
      beforeIcon: Scissors,
      afterIcon: Scissors,
      beforeEn: 'Leftover 3–5ft roll cutoffs thrown into trash as garbage. Thousands of Takas lost weekly.',
      beforeBn: 'অর্ডারের পর বেঁচে যাওয়া ৩–৫ ফুটের কাটিং টুকরো ফেলে দেওয়া হয়; প্রতি মাসে হাজার টাকার অপচয়।',
      afterEn: 'Scrap Salvage Engine catalogs remnant offcuts so operators reuse them for stickers & standees.',
      afterBn: 'কাটিং স্ক্র্যাপ ইঞ্জিন ব্যবহারযোগ্য টুকরো সংরক্ষণ করে ছোট স্টিকার প্রিন্ট করে বাড়তি লাভ।',
      beforeTagEn: 'Daily Scrap Loss',
      beforeTagBn: 'হাজার টাকার অপচয়',
      afterTagEn: '100% Scrap Reused',
      afterTagBn: 'স্ক্র্যাপ থেকে বাড়তি লাভ',
    },
    {
      id: 'cmp-4',
      categoryEn: 'Floor Progress Chasing',
      categoryBn: 'মেশিনের খোঁজ ও ফোন কল',
      beforeIcon: PhoneCall,
      afterIcon: MonitorCheck,
      beforeEn: 'Calling operators every 20 minutes to ask if the print is ready, interrupting machine focus.',
      beforeBn: 'কাজ শুরু হইছে কি না জানতে অপারেটরকে সারাদিন ফোন কল; কাজের মনোযোগ নষ্ট হয়।',
      afterEn: 'Live machine queue shows real-time Flora, Konica & CNC bed progress with zero phone calls.',
      afterBn: 'লাইভ ফ্লোর স্ক্রিনে ফ্লোরা, কনিকা ও সিএনসি মেশিনের অগ্রগতি এক নজরে দৃশ্যমান; কোনো ফোন ছাড়াই।',
      beforeTagEn: 'Constant Phone Calls',
      beforeTagBn: 'অবিরাম ফোন কল',
      afterTagEn: 'Live Machine Screen',
      afterTagBn: 'এক স্ক্রিনে লাইভ স্ট্যাটাস',
    },
    {
      id: 'cmp-5',
      categoryEn: 'Customer Credit & Dues',
      categoryBn: 'বকেয়া খাতা ও পেমেন্ট',
      beforeIcon: FileQuestion,
      afterIcon: CreditCard,
      beforeEn: 'Customer credit forgotten in paper khatas. Overdue balances sit uncollected for months.',
      beforeBn: 'খাতায় লিখে রাখা বাকি টাকা আদায় করতে ভুলে যাওয়া; মাসের পর মাস লাখ টাকা বকেয়া পড়ে থাকা।',
      afterEn: 'Instant due ledger with 1-click WhatsApp reminders and embedded bKash payment QR codes.',
      afterBn: 'গ্রাহকভিত্তিক বকেয়া হিসাব এবং মাত্র ১ ক্লিকে হোয়াটসঅ্যাপে বিকাশ কিউআরসহ স্বয়ংক্রিয় রিমাইন্ডার।',
      beforeTagEn: 'Uncollected Cash',
      beforeTagBn: 'বকেয়া টাকা আটকে থাকা',
      afterTagEn: '1-Click Recovery',
      afterTagBn: 'দ্রুত বকেয়া আদায়',
    },
    {
      id: 'cmp-6',
      categoryEn: 'Employee Attendance & Payroll',
      categoryBn: 'হাজিরা খাতা ও ওভারটাইম',
      beforeIcon: Clock,
      afterIcon: QrCode,
      beforeEn: 'Paper registers allow buddy punching, late arrival disputes, and disputed overtime payroll.',
      beforeBn: 'খাতায় সই করে প্রক্সি হাজিরা, দেরিতে আসা নিয়ে তর্ক এবং মাসের শেষে ওভারটাইম নিয়ে ঝামেলা।',
      afterEn: 'Camera QR check-in on mobile/tablet with shop geofencing and automatic payroll.',
      afterBn: 'মোবাইল বা ট্যাবলেটের ক্যামেরায় কিউআর স্ক্যান করে মুহূর্তেই হাজিরা ও নিখুঁত বেতন হিসাব।',
      beforeTagEn: 'Proxy Disputes',
      beforeTagBn: 'প্রক্সি হাজিরা ও ঝামেলা',
      afterTagEn: 'Smart QR Terminal',
      afterTagBn: 'স্মার্ট কিউআর হাজিরা',
    },
  ]

  const items = (config?.items && config.items.length > 0 ? config.items : DEFAULT_PAIRS).map((item, idx) => {
    const fallback = DEFAULT_PAIRS[idx] || DEFAULT_PAIRS[0]
    return {
      ...fallback,
      ...item,
      beforeIcon: fallback.beforeIcon,
      afterIcon: fallback.afterIcon,
    }
  })

  return (
    <section id="comparison" className="py-14 sm:py-20 bg-muted/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{tBilingual(eyebrowEn, eyebrowBn)}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight">
            {tBilingual(headlineEn, headlineBn)}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {tBilingual(descEn, descBn)}
          </p>

          {/* View Switcher */}
          <div className="hidden sm:inline-flex items-center gap-1 p-1 rounded-lg bg-card border border-border shadow-2xs mt-2">
            <button
              type="button"
              onClick={() => setLayoutMode('columns')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                layoutMode === 'columns'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span>{tBilingual('Split Columns View', 'পাশাপাশি কলাম ভিউ')}</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('cards')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                layoutMode === 'cards'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Rows3 className="h-3.5 w-3.5" />
              <span>{tBilingual('Row Cards View', 'রো কার্ড ভিউ')}</span>
            </button>
          </div>
        </div>

        {/* LAYOUT 1: SPLIT 2-COLUMN SIDE-BY-SIDE VIEW */}
        {layoutMode === 'columns' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 max-w-6xl mx-auto items-start">
            {/* LEFT COLUMN: WITHOUT PRINTFLOW */}
            <div className="rounded-2xl border-2 border-destructive/30 bg-card p-4 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0 border border-destructive/20">
                    <AlertTriangle className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      {tBilingual(withoutTitleEn, withoutTitleBn)}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {tBilingual('Traditional paper-based struggles', 'প্রচলিত প্রেসের প্রতিদিনের ভোগান্তি')}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/15 text-destructive border border-destructive/30 shrink-0">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>The Pain</span>
                </span>
              </div>

              {/* 6 Pain Items */}
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const BeforeIcon = item.beforeIcon
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 space-y-1.5 hover:border-destructive/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <BeforeIcon className="h-4 w-4 text-destructive shrink-0" />
                          <h4 className="text-xs font-bold text-foreground">
                            {tBilingual(item.categoryEn, item.categoryBn)}
                          </h4>
                        </div>
                        <span className="text-xs font-bold text-destructive bg-destructive/15 px-2 py-0.5 rounded border border-destructive/30 shrink-0">
                          {tBilingual(item.beforeTagEn || 'Friction', item.beforeTagBn || 'ঝামেলা')}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tBilingual(item.beforeEn, item.beforeBn)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: WITH PRINTFLOW */}
            <div className="rounded-2xl border-2 border-success-surface bg-card p-4 sm:p-6 space-y-4 shadow-xs ring-1 ring-success-surface/30">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-success-surface text-success flex items-center justify-center shrink-0 border border-success-surface">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      {tBilingual(withTitleEn, withTitleBn)}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {tBilingual('Automated digital operating system', 'ডিজিটাল সংযুক্ত ক্লাউড সিস্টেম')}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success-surface text-success border border-success-surface shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>The Solution</span>
                </span>
              </div>

              {/* 6 Solution Items */}
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const AfterIcon = item.afterIcon
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-success-surface bg-success-surface/10 space-y-1.5 hover:border-success-surface transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AfterIcon className="h-4 w-4 text-primary shrink-0" />
                          <h4 className="text-xs font-bold text-foreground">
                            {tBilingual(item.categoryEn, item.categoryBn)}
                          </h4>
                        </div>
                        <span className="text-xs font-bold text-success bg-success-surface px-2 py-0.5 rounded border border-success-surface shrink-0">
                          {tBilingual(item.afterTagEn || 'Saved', item.afterTagBn || 'সমাধান')}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tBilingual(item.afterEn, item.afterBn)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* LAYOUT 2: DIRECT ROW-BY-ROW COMPARISON CARDS */
          <div className="space-y-3.5 max-w-5xl mx-auto">
            {items.map((item, idx) => {
              const BeforeIcon = item.beforeIcon
              const AfterIcon = item.afterIcon
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold text-primary font-mono">
                      COMPARISON 0{idx + 1}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">
                      {tBilingual(item.categoryEn, item.categoryBn)}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Before */}
                    <div className="p-3.5 rounded-lg bg-destructive/5 border border-destructive/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-destructive flex items-center gap-1.5">
                          <BeforeIcon className="h-3.5 w-3.5" />
                          <span>Without PrintFlow</span>
                        </span>
                        <span className="text-xs text-destructive font-bold bg-destructive/15 px-2 py-0.5 rounded border border-destructive/30">
                          {tBilingual(item.beforeTagEn || '', item.beforeTagBn || '')}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed pt-0.5">
                        {tBilingual(item.beforeEn, item.beforeBn)}
                      </p>
                    </div>

                    {/* After */}
                    <div className="p-3.5 rounded-lg bg-success-surface/10 border border-success-surface space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-success flex items-center gap-1.5">
                          <AfterIcon className="h-3.5 w-3.5 text-primary" />
                          <span>With PrintFlow</span>
                        </span>
                        <span className="text-xs text-success font-bold bg-success-surface px-2 py-0.5 rounded border border-success-surface">
                          {tBilingual(item.afterTagEn || '', item.afterTagBn || '')}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed pt-0.5">
                        {tBilingual(item.afterEn, item.afterBn)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
