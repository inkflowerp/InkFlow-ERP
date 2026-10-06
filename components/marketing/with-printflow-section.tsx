'use client'

import React from 'react'
import {
  DollarSign,
  Palette,
  Printer,
  Boxes,
  Truck,
  CreditCard,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function WithPrintFlowSection() {
  const { tBilingual } = useI18n()

  const FLOW_ITEMS = [
    { labelEn: 'Sales', labelBn: 'সেলস', icon: DollarSign },
    { labelEn: 'Design', labelBn: 'ডিজাইন', icon: Palette },
    { labelEn: 'Production', labelBn: 'প্রোডাকশন', icon: Printer },
    { labelEn: 'Inventory', labelBn: 'ইনভেন্টরি', icon: Boxes },
    { labelEn: 'Delivery', labelBn: 'ডেলিভারি', icon: Truck },
    { labelEn: 'Payment', labelBn: 'পেমেন্ট', icon: CreditCard },
  ]

  return (
    <section className="py-14 sm:py-18 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-success-surface text-success border border-success-border">
            <CheckCircle2 className="h-3 w-3" />
            <span>{tBilingual('With PrintFlow', 'প্রিন্টফ্লো সহ')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {tBilingual('Everything Connected.', 'সব কাজ এক সুতোয় বাঁধা।')}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {tBilingual(
              'One connected workflow from customer to payment.',
              'কাস্টমার রিকোয়েস্ট থেকে পেমেন্ট পর্যন্ত এক সংযুক্ত প্রবাহ।'
            )}
          </p>
        </div>

        {/* Connected Linear Steps */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {FLOW_ITEMS.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-xs hover:border-primary/40 transition-all space-y-2.5 relative group"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-muted-foreground tabular-nums block">
                    0{idx + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-foreground block mt-0.5">
                    {tBilingual(item.labelEn, item.labelBn)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
