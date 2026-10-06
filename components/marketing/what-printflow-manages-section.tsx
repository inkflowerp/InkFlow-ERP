'use client'

import React from 'react'
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
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function WhatPrintFlowManagesSection() {
  const { tBilingual } = useI18n()

  const CATEGORIES = [
    {
      labelEn: 'Sales',
      labelBn: 'সেলস',
      descEn: 'Quotations, invoices, and customer dues.',
      descBn: 'কোটেশন, ইনভয়েস ও কাস্টমার বকেয়া।',
      icon: DollarSign,
    },
    {
      labelEn: 'Design',
      labelBn: 'ডিজাইন',
      descEn: 'Proofs, revisions, and client sign-offs.',
      descBn: 'প্রুফ ফাইল, রিভিশন ও ক্লায়েন্ট অনুমোদন।',
      icon: Palette,
    },
    {
      labelEn: 'Production',
      labelBn: 'প্রোডাকশন',
      descEn: 'Live machine queue, job tickets, and finishing.',
      descBn: 'মেশিন কিউ, জব টিকিট ও ফ্লোর ফিনিশিং।',
      icon: Printer,
    },
    {
      labelEn: 'Inventory',
      labelBn: 'ইনভেন্টরি',
      descEn: 'Media rolls, square feet, sheets, and scrap.',
      descBn: 'মিডিয়া রোল, স্কয়ারফিট স্টক ও অপচয়।',
      icon: Boxes,
    },
    {
      labelEn: 'Purchasing',
      labelBn: 'ক্রয় ও সাপ্লায়ার',
      descEn: 'Suppliers, purchase orders, and stock receipts.',
      descBn: 'সাপ্লায়ার, পারচেজ অর্ডার ও মালামাল গ্রহণ।',
      icon: ShoppingCart,
    },
    {
      labelEn: 'Employees',
      labelBn: 'কর্মী ব্যবস্থাপনা',
      descEn: 'Tasks, attendance, and branch permissions.',
      descBn: 'কাজের দায়িত্ব, দৈনিক হাজিরা ও পারমিশন।',
      icon: Users,
    },
    {
      labelEn: 'Finance',
      labelBn: 'হিসাব ও অর্থ',
      descEn: 'Cash book, bank accounts, expenses, and profit.',
      descBn: 'ক্যাশ বুক, ব্যাংক হিসাব, খরচ ও লাভ-ক্ষতি।',
      icon: Wallet,
    },
    {
      labelEn: 'Delivery',
      labelBn: 'ডেলিভারি',
      descEn: 'Formal challans, dispatch, and site installation.',
      descBn: 'চালান তৈরি, ডেলিভারি ও অন-সাইট ফিটিং।',
      icon: Truck,
    },
    {
      labelEn: 'Reports',
      labelBn: 'রিপোর্ট',
      descEn: 'Sales summaries, material consumption, and dues.',
      descBn: 'সেলস সামারি, স্টক ব্যবহার ও বকেয়া রিপোর্ট।',
      icon: BarChart3,
    },
  ]

  return (
    <section id="what-we-manage" className="py-14 sm:py-20 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span>{tBilingual('Features', 'ফিচারসমূহ')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {tBilingual('Everything Your Business Needs.', 'আপনার ব্যবসার প্রয়োজনীয় সবকিছু।')}
          </h2>
        </div>

        {/* Compact 9-Item Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-w-5xl mx-auto">
          {CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-4 flex items-start gap-3.5 shadow-2xs hover:border-primary/40 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-sm font-bold text-foreground">
                    {tBilingual(cat.labelEn, cat.labelBn)}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-normal">
                    {tBilingual(cat.descEn, cat.descBn)}
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
