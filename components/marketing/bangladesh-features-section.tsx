'use client'

import React from 'react'
import {
  Banknote,
  Languages,
  MapPin,
  FileBadge,
  FileCheck2,
  Receipt,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function BangladeshFeaturesSection() {
  const { tBilingual } = useI18n()

  const ITEMS = [
    { labelEn: '৳ BDT', labelBn: '৳ টাকা', icon: Banknote },
    { labelEn: 'English + বাংলা', labelBn: 'ইংরেজি + বাংলা', icon: Languages },
    { labelEn: 'Bangladesh Address', labelBn: 'বিভাগ, জেলা ও থানা ঠিকানা', icon: MapPin },
    { labelEn: 'Trade License', labelBn: 'ট্রেড লাইসেন্স নম্বর', icon: FileBadge },
    { labelEn: 'BIN / TIN', labelBn: 'বিআইএন ও টিআইএন', icon: FileCheck2 },
    { labelEn: 'VAT Ready', labelBn: 'ভ্যাট রেডি চালান ও ইনভয়েস', icon: Receipt },
  ]

  return (
    <section className="py-14 sm:py-18 bg-muted/40 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-success-surface text-success border border-success-border">
            <span>{tBilingual('Localization', 'স্থানীয়করণ')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {tBilingual('Built for Bangladesh.', 'বাংলাদেশের প্রেক্ষাপটে প্রস্তুত।')}
          </h2>
        </div>

        {/* 6 Compact Badges/Items */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 max-w-4xl mx-auto">
          {ITEMS.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-3.5 flex flex-col items-center justify-center text-center space-y-2 shadow-2xs hover:border-success/50 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-success-surface text-success border border-success-border flex items-center justify-center shrink-0">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                  {tBilingual(item.labelEn, item.labelBn)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
