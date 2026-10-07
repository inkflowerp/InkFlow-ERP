'use client'

import React from 'react'
import {
  Banknote,
  Languages,
  MapPin,
  FileBadge,
  FileCheck2,
  Receipt,
  CreditCard,
  Building2,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function BangladeshFeaturesSection() {
  const { tBilingual } = useI18n()

  const FEATURES = [
    {
      titleEn: '4-Tier Customer Pricing Engine',
      titleBn: '৪-স্তরের স্বয়ংক্রিয় কাস্টমার দর',
      descEn: 'Retail, Reseller, Corporate, and Agency SFT rate cards.',
      descBn: 'খুচরা, রিসেলার, কর্পোরেট ও এজেন্সির আলাদা রেট।',
      icon: Banknote,
      tag: 'Tier Pricing',
    },
    {
      titleEn: 'bKash, Nagad & Bank Challans',
      titleBn: 'বিকাশ, নগদ ও ব্যাংক চালান',
      descEn: 'TrxID records, partial advances, and payment QR challans.',
      descBn: 'TrxID ট্র্যাকিং, অগ্রিম জমা ও বিকাশ কিউআর চালান।',
      icon: CreditCard,
      tag: 'MFS Ready',
    },
    {
      titleEn: 'NBR Mushak 6.3 & VAT Compliant',
      titleBn: 'এনবিআর মূসক ৬.৩ ও ভ্যাট চালান',
      descEn: '13-digit BIN, Trade License, and standard tax delivery challans.',
      descBn: '১৩ সংখ্যার BIN, ট্রেড লাইসেন্স ও মূসক ডেলিভারি চালান।',
      icon: Receipt,
      tag: 'Tax Compliant',
    },
    {
      titleEn: '100% Native বাংলা ও English UI',
      titleBn: 'শতভাগ খাঁটি বাংলা ও ইংরেজি',
      descEn: '1-click toggle between pure Bangla and English. Bangla challans.',
      descBn: 'এক ক্লিকে বাংলা বা ইংরেজি। ঝকঝকে বাংলায় চালান প্রিন্ট।',
      icon: Languages,
      tag: 'Bilingual',
    },
    {
      titleEn: '64 Districts & Printing Hub Clusters',
      titleBn: '৬৪ জেলা ও প্রিন্টিং ক্লাস্টার',
      descEn: 'Pre-filled Fakirapool, Arambagh, Nilkhet, Anderkilla addresses.',
      descBn: 'ফকিরাপুল, আরামবাগ, নীলক্ষেত ও আন্দরকিল্লা রেডি ক্লাস্টার।',
      icon: MapPin,
      tag: 'Local Hubs',
    },
    {
      titleEn: 'Budget Android Floor Reliability',
      titleBn: 'সাধারণ স্মার্টফোনে সহজ ব্যবহার',
      descEn: 'Zero app install needed. Runs fast on any mobile or tablet.',
      descBn: 'কোনো অ্যাপ ইনস্টল ছাড়া যেকোনো মোবাইল বা ট্যাবলেটে চলে।',
      icon: Smartphone,
      tag: 'Mobile Floor',
    },
  ]

  return (
    <section className="py-14 sm:py-20 bg-muted/40 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success-surface text-success border border-success-border">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{tBilingual('Built for Bangladesh Press', 'দেশীয় প্রেসের জন্য')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {tBilingual(
              'Engineered for Local Business Reality.',
              'দেশীয় প্রেসের বাস্তবতায় শতভাগ উপযোগী।'
            )}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {tBilingual(
              'Taka formatting, tier-based SFT rates, bKash challans, and Bengali conventions.',
              'টাকার ফরম্যাট, টায়ার রেট, বিকাশ চালান ও দেশীয় হিসাবের সাথে শতভাগ সামঞ্জস্যপূর্ণ।'
            )}
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-w-6xl mx-auto">
          {FEATURES.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:border-success/50 transition-colors space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-lg bg-success-surface text-success border border-success-border flex items-center justify-center shrink-0">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-bold font-mono text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground">
                    {tBilingual(item.titleEn, item.titleBn)}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tBilingual(item.descEn, item.descBn)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
