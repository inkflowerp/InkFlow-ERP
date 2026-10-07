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
      descEn: 'Set separate automatic SFT rates for walk-in Retail clients, Sub-contract Resellers, Corporate Accounts, and Advertising Agencies.',
      descBn: 'খুচরা গ্রাহক, সাব-কন্ট্রাক্ট রিসেলার, কর্পোরেট ক্লায়েন্ট এবং বিজ্ঞাপন এজেন্সির জন্য আলাদা আলাদা স্বয়ংক্রিয় স্কয়ারফিট দর নির্ধারণ।',
      icon: Banknote,
      tag: 'Tier Pricing',
    },
    {
      titleEn: 'bKash, Nagad & Bank Challans',
      titleBn: 'বিকাশ, নগদ ও ব্যাংক চালান',
      descEn: 'Record merchant TrxID numbers, split advance deposits, and generate Challans with embedded bKash payment QR codes.',
      descBn: 'পেমেন্ট ট্রানজেকশন আইডি (TrxID) সংরক্ষণ, আংশিক অগ্রিম জমা এবং বিকাশ পেমেন্ট কিউআর কোডসহ প্রাতিষ্ঠানিক চালান প্রিন্ট।',
      icon: CreditCard,
      tag: 'MFS Ready',
    },
    {
      titleEn: 'NBR Mushak 6.3 & VAT Compliant',
      titleBn: 'এনবিআর মূসক ৬.৩ ও ভ্যাট চালান',
      descEn: 'Built-in 13-digit BIN validation, Trade License records, and standard NBR-compliant tax invoice and delivery challan formats.',
      descBn: '১৩ সংখ্যার বিআইএন ভ্যালিডেশন, ট্রেড লাইসেন্স নম্বর সংরক্ষণ এবং এনবিআর স্বীকৃত মূসক চালান প্রস্তুতের পূর্ণাঙ্গ ব্যবস্থা।',
      icon: Receipt,
      tag: 'Tax Compliant',
    },
    {
      titleEn: '100% Native বাংলা ও English UI',
      titleBn: 'শতভাগ খাঁটি বাংলা ও ইংরেজি',
      descEn: 'Seamlessly toggle between pure Bengali with crisp typography and standard English. Delivery challans print in clean Bangla.',
      descBn: 'মুহূর্তেই শতভাগ বাংলা অথবা শতভাগ ইংরেজিতে কাজ করার সুবিধা। চালান ও মানি রিসিট ঝকঝকে দেশীয় হরফে প্রিন্ট হয়।',
      icon: Languages,
      tag: 'Bilingual',
    },
    {
      titleEn: '64 Districts & Printing Hub Clusters',
      titleBn: '৬৪ জেলা ও প্রিন্টিং ক্লাস্টার',
      descEn: 'Pre-populated database of all 64 districts and famous printing hubs like Arambagh, Fakirapool, Banglamotor, Anderkilla, etc.',
      descBn: 'বাংলাদেশের ৮ বিভাগ, ৬৪ জেলা এবং আরামবাগ, ফকিরাপুল, আন্দরকিল্লাসহ প্রধান প্রিন্টিং ক্লাস্টার সম্বলিত রেডিমেড ঠিকানা ড্রপডাউন।',
      icon: MapPin,
      tag: 'Local Hubs',
    },
    {
      titleEn: 'Budget Android Floor Reliability',
      titleBn: 'সাধারণ স্মার্টফোনে সহজ ব্যবহার',
      descEn: 'Runs smoothly on budget Android phones and tablets in 3G/4G network conditions. Zero heavy apps or complex installations.',
      descBn: 'কোনো ভারী অ্যাপ ডাউনলোড ছাড়াই সাধারণ অ্যান্ড্রয়েড ফোন বা ট্যাবলেটে ফ্লোর অপারেটরদের ব্যবহারের উপযোগী হালকা ডিজাইন।',
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
            <span>{tBilingual('Built for Bangladesh Print Shops', 'বাংলাদেশের প্রেসের প্রেক্ষাপটে তৈরি')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {tBilingual(
              'Engineered for Local Business Reality.',
              'দেশীয় প্রিন্টিং ব্যবসার বাস্তব প্রয়োজনের শতভাগ সমাধান।'
            )}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {tBilingual(
              'Not a generic foreign tool. PrintFlow is purpose-built with Taka formatting, tier-based pricing, bKash challans, and Bengali printing conventions.',
              'কোনো বিদেশি সফটওয়্যার নয়। বাংলাদেশি প্রেসের কাজের ধরন, বাকি খাতা, বিকাশ ট্রানজেকশন ও ভ্যাট নিয়মের সাথে শতভাগ সামঞ্জস্যপূর্ণ।'
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
