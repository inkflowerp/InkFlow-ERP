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

  const eyebrowEn = config?.eyebrowEn || 'Side-by-Side Operational Comparison'
  const eyebrowBn = config?.eyebrowBn || 'পাশাপাশি কাজের পার্থক্য'

  const headlineEn =
    config?.headlineEn || 'Without PrintFlow vs With PrintFlow: See the Difference Side by Side.'
  const headlineBn =
    config?.headlineBn || 'প্রিন্টফ্লো ছাড়া অবস্থা বনাম প্রিন্টফ্লো সহ আধুনিক রূপান্তর।'

  const descEn =
    config?.descriptionEn ||
    'See how traditional Bangladeshi print shops lose profit daily through paper slips and guesswork, and how PrintFlow transforms every single workflow.'
  const descBn =
    config?.descriptionBn ||
    'দেখুন কীভাবে প্রচলিত প্রেস কাগজের চিরকুট আর অনুমানের হিসাবে প্রতিদিন ক্ষতিগ্রস্ত হয়, এবং প্রিন্টফ্লো কীভাবে প্রতিটি কাজকে স্বয়ংক্রিয় ও লাভজনক করে তোলে।'

  const withoutTitleEn = config?.withoutTitleEn || 'Without PrintFlow (Traditional Press Chaos)'
  const withoutTitleBn = config?.withoutTitleBn || 'প্রিন্টফ্লো ছাড়া অবস্থা (প্রচলিত প্রেসের যন্ত্রণা)'

  const withTitleEn = config?.withTitleEn || 'With PrintFlow (Connected Cloud System)'
  const withTitleBn = config?.withTitleBn || 'প্রিন্টফ্লো সহ (সংযুক্ত ক্লাউড সিস্টেম)'

  const DEFAULT_PAIRS = [
    {
      id: 'cmp-1',
      categoryEn: 'Job Tickets & Instructions',
      categoryBn: 'কাজের নির্দেশনা ও স্লিপ',
      beforeIcon: FileText,
      afterIcon: FileCheck2,
      beforeEn: 'Job orders written on torn paper get stained by solvent ink, torn, or lost on the shop floor. Costly reprints come out of your own pocket.',
      beforeBn: 'ছেঁড়া কাগজে হাতে লেখা স্লিপ সলভেন্ট কালিতে নষ্ট হয়ে যায় বা ফ্লোরে হারিয়ে যায়। ভুল প্রিন্ট হলে পুরো লোকসান আপনার নিজের পকেট থেকে যায়।',
      afterEn: 'Centralized barcoded digital job tickets with dimensions, roll code, finishing notes, and preview. Zero misprints, zero confusion.',
      afterBn: 'নিখুঁত মাপ, রোল কোড, ফিনিশিং ও আর্টওয়ার্ক প্রাকদর্শন সম্বলিত কেন্দ্রীয় ডিজিটাল বারকোড জব টিকিট। কোনো ভুল প্রিন্ট বা বাড়তি খরচের সুযোগ নেই।',
      beforeTagEn: 'Costly Misprints',
      beforeTagBn: 'ভুল প্রিন্ট ও লোকসান',
      afterTagEn: '100% Accurate Jobs',
      afterTagBn: '১০০% সঠিক প্রিন্ট',
    },
    {
      id: 'cmp-2',
      categoryEn: 'Roll Media Inventory',
      categoryBn: 'রোল স্টক ও কাঁচামাল',
      beforeIcon: HelpCircle,
      afterIcon: Boxes,
      beforeEn: 'Flex and vinyl rolls run out unexpectedly in the middle of a rush print at 10 PM. Operators wait idle while you scramble across town for media.',
      beforeBn: 'রাত ১০টায় জরুরি প্রিন্টের মাঝপথে হঠাৎ ফ্লেক্স বা ভিনাইল রোল শেষ হয়ে যায়। মেটেরিয়াল খুঁজতে ছোটাছুটি করতে হয় আর মেশিন অলস বসে থাকে।',
      afterEn: 'Master rolls tracked by width and length (SFT). Exact square footage auto-deducted upon print with automated low-stock warnings.',
      afterBn: 'রোলের প্রস্থ ও দৈর্ঘ্য অনুযায়ী অবশিষ্ট স্কয়ারফিট লাইভ কমে যায়। স্টক নির্দিষ্ট সীমার নিচে নামলে স্বয়ংক্রিয় সতর্কবার্তা আসে।',
      beforeTagEn: 'Mid-Job Outages',
      beforeTagBn: 'মাঝপথে কাজ বন্ধ',
      afterTagEn: 'Real-Time Roll SFT',
      afterTagBn: 'লাইভ স্কয়ারফিট স্টক',
    },
    {
      id: 'cmp-3',
      categoryEn: 'Remnant Offcut Scrap',
      categoryBn: 'কাটিং স্ক্র্যাপ ও অপচয়',
      beforeIcon: Scissors,
      afterIcon: Scissors,
      beforeEn: 'Leftover 3ft to 5ft roll cuts are treated as useless garbage and thrown away, losing thousands of Takas in salvageable material every single week.',
      beforeBn: 'অর্ডারের পর বেঁচে যাওয়া ৩ থেকে ৫ ফুটের ভালো কাটিং রোল টুকরো আবর্জনা হিসেবে ফেলে দেওয়া হয়। প্রতি সপ্তাহে হাজার টাকার মেটেরিয়াল অপচয় হয়।',
      afterEn: 'Scrap Salvage Engine catalogs remnant offcuts so operators reuse them for small stickers and standees, turning waste into pure profit.',
      afterBn: 'অর্ডারের পর বেঁচে যাওয়া ৩-৫ ফুটের টুকরো স্ক্র্যাপ হিসেবে সিস্টেমে জমা থাকে। ছোট স্টিকার ও স্ট্যান্ডিতে ব্যবহার করে বাড়তি লাভ হয়।',
      beforeTagEn: 'Hidden Material Loss',
      beforeTagBn: 'মাসে হাজার টাকার ক্ষতি',
      afterTagEn: 'Zero Scrap Wasted',
      afterTagBn: 'অপচয় রোধ ও বাড়তি লাভ',
    },
    {
      id: 'cmp-4',
      categoryEn: 'Floor Progress Chasing',
      categoryBn: 'কারখানা ফলো-আপ ও ফোন',
      beforeIcon: PhoneCall,
      afterIcon: MonitorCheck,
      beforeEn: 'Front desk calls the press operator every 20 minutes: "Bhai print shuru hoise? When will it finish?" Disrupting focus and slowing down the press.',
      beforeBn: 'কাজের খোঁজ নিতে সেলস ডেস্ক অপারেটরকে বারবার ফোন দেয়: "ভাই প্রিন্ট কি শুরু হইছে? কখন ডেলিভারি হবে?" কাজের মনোযোগ নষ্ট হয় ও গতি কমে।',
      afterEn: 'Live machine queue shows real-time bed progress (Flora, Konica, CNC) with zero phone calls. Floor managers and desk see exact status.',
      afterBn: 'কোন মেশিনে প্রিন্ট চলছে, কোনটা লাইনে আছে এবং কোনটা ডেলিভারির জন্য প্রস্তুত তা এক নজরে দৃশ্যমান। কাউকে ফোন দেওয়ার প্রয়োজন নেই।',
      beforeTagEn: 'Constant Phone Calls',
      beforeTagBn: 'অবিরাম ফোন কলের ক্লান্তি',
      afterTagEn: 'Live Machine Screen',
      afterTagBn: 'এক স্ক্রিনে লাইভ স্ট্যাটাস',
    },
    {
      id: 'cmp-5',
      categoryEn: 'Customer Credit & Dues',
      categoryBn: 'গ্রাহকের বকেয়া খাতা',
      beforeIcon: FileQuestion,
      afterIcon: CreditCard,
      beforeEn: 'Customer credit noted in paper diaries gets overlooked. Due balances accumulate for months with zero automated reminders or proof.',
      beforeBn: 'খাতায় লিখে রাখা বাকি টাকার হিসাব সহজে নজরে আসে না। মাসের পর মাস লাখ লাখ টাকা কাস্টমারের কাছে আটকে থাকে কোনো তাগাদা ছাড়া।',
      afterEn: 'Clear overdue aging reports with 1-click polite reminder messages sent to customer WhatsApp with total bill, advance, and bKash QR code.',
      afterBn: 'গ্রাহকভিত্তিক বকেয়া হিসাব এবং মাত্র ১ ক্লিকে হোয়াটসঅ্যাপে বিল ও বিকাশ কিউআর কোডসহ ভদ্র পেমেন্ট রিমাইন্ডার পাঠানোর সুবিধা।',
      beforeTagEn: 'Uncollected Cash',
      beforeTagBn: 'বকেয়া টাকা আটকে থাকা',
      afterTagEn: 'Fast Recovery via WhatsApp',
      afterTagBn: 'দ্রুত বকেয়া আদায়',
    },
    {
      id: 'cmp-6',
      categoryEn: 'Employee Attendance & Payroll',
      categoryBn: 'হাজিরা খাতা ও ওভারটাইম',
      beforeIcon: Clock,
      afterIcon: QrCode,
      beforeEn: 'Paper sign-in registers enable buddy punching, disputes over late arrivals, and inaccurate monthly overtime salary calculations.',
      beforeBn: 'কাগজে সই করার খাতায় প্রক্সি হাজিরা, দেরিতে আসা নিয়ে তর্ক এবং মাসের শেষে ওভারটাইম বেতনের হিসাব মেলানো নিয়ে অসন্তোষ তৈরি হয়।',
      afterEn: 'Operators clock in with front-camera QR scan on mobile or floor tablet. Geofenced to shop location with automatic overtime and salary calculation.',
      afterBn: 'মোবাইল বা ট্যাবলেটের ক্যামেরায় কিউআর স্ক্যান করে মুহূর্তেই হাজিরা। প্রক্সি মুক্ত, নিখুঁত সময় ও সঠিক ওভারটাইম বেতন তৈরি।',
      beforeTagEn: 'Attendance Disputes',
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
    <section id="comparison" className="py-14 sm:py-20 bg-muted/40 border-t border-border">
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

          {/* Optional View Switcher on larger screens */}
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
            <div className="rounded-2xl border border-destructive/30 bg-card p-4 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
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

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                  <XCircle className="h-3 w-3" />
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
                      className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2 hover:border-destructive/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <BeforeIcon className="h-4 w-4 text-destructive shrink-0" />
                          <h4 className="text-xs font-bold text-foreground">
                            {tBilingual(item.categoryEn, item.categoryBn)}
                          </h4>
                        </div>
                        <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.2 rounded shrink-0">
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
            <div className="rounded-2xl border-2 border-primary/40 bg-card p-4 sm:p-6 space-y-4 shadow-xs ring-1 ring-primary/20">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
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

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success-surface text-success border border-success-border shrink-0">
                  <CheckCircle2 className="h-3 w-3" />
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
                      className="p-3.5 rounded-xl border border-border bg-card space-y-2 shadow-2xs hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AfterIcon className="h-4 w-4 text-primary shrink-0" />
                          <h4 className="text-xs font-bold text-foreground">
                            {tBilingual(item.categoryEn, item.categoryBn)}
                          </h4>
                        </div>
                        <span className="text-xs font-semibold text-success bg-success-surface px-2 py-0.2 rounded border border-success-border shrink-0">
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
                    <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-destructive flex items-center gap-1.5">
                          <BeforeIcon className="h-3.5 w-3.5" />
                          <span>Without PrintFlow</span>
                        </span>
                        <span className="text-xs text-destructive font-semibold">
                          {tBilingual(item.beforeTagEn || '', item.beforeTagBn || '')}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed pt-0.5">
                        {tBilingual(item.beforeEn, item.beforeBn)}
                      </p>
                    </div>

                    {/* After */}
                    <div className="p-3 rounded-lg bg-success-surface/50 border border-success-border space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-success flex items-center gap-1.5">
                          <AfterIcon className="h-3.5 w-3.5 text-primary" />
                          <span>With PrintFlow</span>
                        </span>
                        <span className="text-xs text-success font-semibold">
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
