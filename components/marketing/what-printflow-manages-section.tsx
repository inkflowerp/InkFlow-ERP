'use client'

import React, { useState } from 'react'
import {
  DollarSign,
  Palette,
  Printer,
  Boxes,
  ShoppingCart,
  Users,
  Wallet,
  Truck,
  BarChart3,
  ShieldCheck,
  Scissors,
  AlertTriangle,
  Lock,
  Database,
  RotateCcw,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

export function WhatPrintFlowManagesSection() {
  const { tBilingual } = useI18n()
  const [activeSpotlight, setActiveSpotlight] = useState<'stock' | 'security'>('stock')

  const CATEGORIES = [
    {
      labelEn: 'Sales & SFT Quotations',
      labelBn: 'সেলস ও স্কয়ারফিট কোটেশন',
      descEn: 'Instant SFT quotes, 4 rate tiers (Retail/Reseller), and PDF invoices.',
      descBn: 'মুহূর্তে স্কয়ারফিট কোটেশন, ৪টি রেট টায়ার ও পিডিএফ ইনভয়েস।',
      icon: DollarSign,
    },
    {
      labelEn: 'Prepress & Artwork Proofs',
      labelBn: 'প্রি-প্রেস ও আর্টওয়ার্ক প্রুফ',
      descEn: 'Client WhatsApp sign-off, color profiles, and locked files before print.',
      descBn: 'ক্লায়েন্টের ডিজিটাল অনুমোদন, কালার প্রুফ ও প্রিন্টের আগে ফাইল লক।',
      icon: Palette,
    },
    {
      labelEn: 'Machine Production Queue',
      labelBn: 'কারখানা মেশিন কিউ',
      descEn: 'Flora, Konica, Eco-Solvent, and CNC digital floor ticketing.',
      descBn: 'ফ্লোরা, কনিকা, ইকো-সলভেন্ট ও সিএনসি ডিজিটাল জব টিকিট।',
      icon: Printer,
    },
    {
      labelEn: 'Roll Stock & Scrap Salvage',
      labelBn: 'রোল স্টক ও কাটিং স্ক্র্যাপ',
      descEn: 'Width × length SFT tracking, auto-deduction, and remnant scrap salvage.',
      descBn: 'প্রস্থ × দৈর্ঘ্য স্কয়ারফিট হিসাব ও কাটিং স্ক্র্যাপ সংরক্ষণ।',
      icon: Boxes,
    },
    {
      labelEn: 'Suppliers & Purchases',
      labelBn: 'সাপ্লায়ার ও কাঁচামাল ক্রয়',
      descEn: 'Media purchase orders, ink receipts, and supplier dues ledger.',
      descBn: 'মেটেরিয়াল ও কালি ক্রয়, রিসিট এবং সাপ্লায়ার বাকি খাতা।',
      icon: ShoppingCart,
    },
    {
      labelEn: 'Staff, Shifts & QR Attendance',
      labelBn: 'কর্মী, শিফট ও কিউআর হাজিরা',
      descEn: 'Camera QR scan, operator stations, salary advances, and overtime.',
      descBn: 'ক্যামেরা কিউআর হাজিরা, অপারেটর এসাইনমেন্ট ও ওভারটাইম।',
      icon: Users,
    },
    {
      labelEn: 'Cash Book & MFS Challans',
      labelBn: 'ক্যাশ বুক ও বিকাশ চালান',
      descEn: 'Counter cash, bKash TrxIDs, daily press expenses, and true net profit.',
      descBn: 'কাউন্টার ক্যাশ, বিকাশ TrxID, দৈনিক কারখানা খরচ ও নিট লাভ।',
      icon: Wallet,
    },
    {
      labelEn: 'Delivery & Site Fitting',
      labelBn: 'চালান ডেলিভারি ও সাইট ফিটিং',
      descEn: 'NBR Mushak 6.3 challans, van delivery, and on-site fitting sign-offs.',
      descBn: 'মূসক ৬.৩ ডেলিভারি চালান, ভ্যান ট্র্যাকিং ও সাইট ফিটিং।',
      icon: Truck,
    },
    {
      labelEn: 'Enterprise Cloud Security',
      labelBn: 'ক্লাউড নিরাপত্তা ও অডিট লগ',
      descEn: 'Postgres RLS tenant isolation, owner margin privacy, and auto-backups.',
      descBn: 'পোস্টগ্রেস আরএলএস ডাটা নিরাপত্তা, মালিকের লাভ গোপন ও অটো ব্যাকআপ।',
      icon: ShieldCheck,
    },
  ]

  return (
    <section id="what-we-manage" className="py-14 sm:py-20 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{tBilingual('Complete Platform', 'পূর্ণাঙ্গ প্ল্যাটফর্ম')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {tBilingual(
              'Everything to Run a High-Volume Print Shop.',
              'প্রিন্টিং ও সাইনেজ কারখানা পরিচালনার পূর্ণাঙ্গ সমাধান।'
            )}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {tBilingual(
              '9 connected modules built for how print shops actually work in Bangladesh.',
              'বাংলাদেশের প্রেসের বাস্তব কাজের সাথে মিলিয়ে তৈরি ৯টি নির্ভরযোগ্য মডিউল।'
            )}
          </p>
        </div>

        {/* 9 Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-w-6xl mx-auto">
          {CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs hover:border-primary/40 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground">
                    {tBilingual(cat.labelEn, cat.labelBn)}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tBilingual(cat.descEn, cat.descBn)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Deep Dive Spotlight: Stock Management vs Enterprise Security */}
        <div className="max-w-5xl mx-auto rounded-xl border border-border bg-card p-5 sm:p-7 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                Feature Deep Dive
              </span>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                {activeSpotlight === 'stock'
                  ? tBilingual('Stock Management & Roll Waste Salvage Engine', 'রোল স্টক ব্যবস্থাপনা ও অপচয় রোধ ইঞ্জিন')
                  : tBilingual('Enterprise Security & Multi-Tenant Data Isolation', 'এন্টারপ্রাইজ ডাটা নিরাপত্তা ও ক্লাউড নির্ভরযোগ্যতা')}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSpotlight('stock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeSpotlight === 'stock'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <Boxes className="inline-block mr-1.5 h-3.5 w-3.5" />
                <span>{tBilingual('Stock Spotlight', 'রোল স্টক')}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSpotlight('security')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeSpotlight === 'security'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShieldCheck className="inline-block mr-1.5 h-3.5 w-3.5" />
                <span>{tBilingual('Security Spotlight', 'ডাটা নিরাপত্তা')}</span>
              </button>
            </div>
          </div>

          {/* SPOTLIGHT 1: STOCK MANAGEMENT */}
          {activeSpotlight === 'stock' && (
            <div className="space-y-4 text-xs animate-in fade-in duration-200">
              <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm">
                {tBilingual(
                  'Traditional ERPs treat inventory like boxed units. PrintFlow is architected around roll media dimensions (Width × Length = Square Footage). Track exact remaining square feet, offcut scrap salvage, and solvent/UV ink consumption.',
                  'সাধারণ সফটওয়্যারে রোল মিডিয়ার হিসাব রাখা যায় না। প্রিন্টফ্লো তৈরি হয়েছে রোলের প্রস্থ ও দৈর্ঘ্য (স্কয়ারফিট) হিসাবের জন্য। অবশিষ্ট রোল, বেঁচে যাওয়া কাটিং স্ক্র্যাপ এবং কালির খরচ নিখুঁতভাবে ট্র্যাকিং হয়।'
                )}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-muted/30 border border-border space-y-1">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-primary" />
                    <span className="font-bold text-foreground">
                      {tBilingual('Roll SFT Tracking', 'মাস্টার রোল স্কয়ারফিট')}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {tBilingual(
                      'Width (10ft/12ft) × Length (164ft) = 1,640 SFT. Exact job deduction upon printing.',
                      '১০ বা ১২ ফুট প্রস্থ এবং ১৬৪ ফুট দৈর্ঘ্যের রোলের নিখুঁত লাইভ স্টক ব্যালেন্স।'
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-success-surface border border-success-border space-y-1">
                  <div className="flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-success" />
                    <span className="font-bold text-success">
                      {tBilingual('Scrap Salvage Engine', 'কাটিং স্ক্র্যাপ সংরক্ষণ')}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {tBilingual(
                      'Save 3ft to 5ft remnant cuts in system. Reuse for small stickers and standees.',
                      'বেঁচে যাওয়া ৩-৫ ফুটের টুকরো স্ক্র্যাপ হিসেবে জমা করে ছোট কাজে ব্যবহার।'
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-muted/30 border border-border space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="font-bold text-foreground">
                      {tBilingual('Low-Stock Alerts', 'লো স্টক সতর্কবার্তা')}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {tBilingual(
                      'Automated alerts before Star Flex, Vinyl, or Solvent Ink falls below safety margin.',
                      'ফ্লেক্স রোল বা কালির পরিমাণ নির্দিষ্ট সীমার নিচে নামলে স্বয়ংক্রিয় নোটিফিকেশন।'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SPOTLIGHT 2: SECURITY */}
          {activeSpotlight === 'security' && (
            <div className="space-y-4 text-xs animate-in fade-in duration-200">
              <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm">
                {tBilingual(
                  'Your client lists, pricing formulas, and financial profit margins are your business’s most valuable assets. PrintFlow uses bank-grade multi-tenant database isolation so your data is 100% private and protected.',
                  'আপনার গ্রাহক তালিকা, দর এবং আর্থিক মুনাফা আপনার ব্যবসার সবচেয়ে গোপনীয় সম্পদ। প্রিন্টফ্লোতে ব্যাংক-গ্রেড মাল্টি-টেন্যান্ট ডাটাবেজ সুরক্ষার মাধ্যমে আপনার সমস্ত তথ্য শতভাগ নিরাপদ থাকে।'
                )}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-muted/30 border border-border space-y-1">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    <span className="font-bold text-foreground">
                      {tBilingual('PostgreSQL Row-Level Security', 'পোস্টগ্রেস আরএলএস ডাটাবেজ')}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {tBilingual(
                      'Strict cryptographic tenant-slug isolation. Zero risk of cross-shop data leaks.',
                      'প্রতিটি প্রেসের ডাটা সম্পূর্ণ আলাদা ও এনক্রিপ্টেড। অন্য কোনো প্রতিষ্ঠানের ডাটা দেখার সুযোগ নেই।'
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-muted/30 border border-border space-y-1">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    <span className="font-bold text-foreground">
                      {tBilingual('Role-Based Margin Privacy', 'মালিকের মুনাফা সুরক্ষা')}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {tBilingual(
                      'Press operators and designers cannot see owner bank balances, supplier rates, or profit.',
                      'অপারেটর ও কর্মীরা কখনোই মালিকের ব্যাংকের টাকা, কেনা দর বা আসল লাভ দেখতে পারবে না।'
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-muted/30 border border-border space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-success" />
                    <span className="font-bold text-foreground">
                      {tBilingual('Daily Automated Cloud Backups', 'দৈনিক ক্লাউড ব্যাকআপ')}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {tBilingual(
                      'Redundant automated daily backups with point-in-time restore and 99.9% uptime SLA.',
                      'প্রতিদিনের স্বয়ংক্রিয় ক্লাউড ব্যাকআপ এবং ৯৯.৯% আপটাইম নিশ্চয়তা।'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
