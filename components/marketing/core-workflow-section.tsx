'use client'

import React from 'react'
import {
  Users,
  FileText,
  FileCheck2,
  Palette,
  ShieldCheck,
  ClipboardList,
  Printer,
  Truck,
  CreditCard,
  ChevronRight,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function CoreWorkflowSection() {
  const { tBilingual } = useI18n()

  const STEPS = [
    { nameEn: 'Customer', nameBn: 'গ্রাহক', icon: Users },
    { nameEn: 'Quotation', nameBn: 'কোটেশন', icon: FileText },
    { nameEn: 'Invoice', nameBn: 'ইনভয়েস', icon: FileCheck2 },
    { nameEn: 'Design', nameBn: 'ডিজাইন', icon: Palette },
    { nameEn: 'Approval', nameBn: 'অনুমোদন', icon: ShieldCheck },
    { nameEn: 'Job Order', nameBn: 'জব অর্ডার', icon: ClipboardList },
    { nameEn: 'Production', nameBn: 'প্রোডাকশন', icon: Printer },
    { nameEn: 'Delivery', nameBn: 'ডেলিভারি', icon: Truck },
    { nameEn: 'Payment', nameBn: 'পেমেন্ট', icon: CreditCard },
  ]

  return (
    <section id="workflow" className="py-14 sm:py-20 bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span>{tBilingual('Core Workflow', 'মূল কাজের ধাপ')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {tBilingual('From Order to Delivery.', 'অর্ডার থেকে ডেলিভারি।')}
          </h2>
        </div>

        {/* Visual 9-Step Pipeline with connectors */}
        <div className="max-w-6xl mx-auto">
          {/* Desktop / Tablet horizontal grid */}
          <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-9 gap-2 lg:gap-1.5 items-center">
            {STEPS.map((step, idx) => {
              const Icon = step.icon
              const isLast = idx === STEPS.length - 1
              return (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex-1 bg-muted/40 border border-border rounded-xl p-3 flex flex-col items-center justify-center text-center space-y-1.5 shadow-2xs hover:border-primary/40 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-muted-foreground tabular-nums block">
                        0{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-foreground block truncate mt-0.5">
                        {tBilingual(step.nameEn, step.nameBn)}
                      </span>
                    </div>
                  </div>
                  {!isLast && (
                    <ChevronRight className="hidden lg:block h-3.5 w-3.5 text-muted-foreground shrink-0 mx-0.5" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Mobile vertical/grid display */}
          <div className="grid grid-cols-3 sm:hidden gap-2">
            {STEPS.map((step, idx) => {
              const Icon = step.icon
              return (
                <div
                  key={idx}
                  className="bg-muted/40 border border-border rounded-xl p-3 flex flex-col items-center justify-center text-center space-y-1 shadow-2xs"
                >
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground tabular-nums">
                    0{idx + 1}
                  </span>
                  <span className="text-xs font-bold text-foreground block truncate">
                    {tBilingual(step.nameEn, step.nameBn)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
