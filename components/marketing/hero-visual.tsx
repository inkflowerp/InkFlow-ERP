'use client'

import React from 'react'
import {
  Users,
  FileText,
  ShoppingCart,
  Palette,
  Printer,
  Truck,
  CreditCard,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function HeroVisual() {
  const { tBilingual } = useI18n()

  const WORKFLOW_STEPS = [
    { labelEn: 'Customer', labelBn: 'গ্রাহক', icon: Users, tag: 'Inquiry' },
    { labelEn: 'Quotation', labelBn: 'কোটেশন', icon: FileText, tag: '250 SFT' },
    { labelEn: 'Order', labelBn: 'অর্ডার', icon: ShoppingCart, tag: 'Approved' },
    { labelEn: 'Design', labelBn: 'ডিজাইন', icon: Palette, tag: 'Proof Ready' },
    { labelEn: 'Production', labelBn: 'প্রোডাকশন', icon: Printer, tag: 'Printing', active: true },
    { labelEn: 'Delivery', labelBn: 'ডেলিভারি', icon: Truck, tag: 'Challan' },
    { labelEn: 'Payment', labelBn: 'পেমেন্ট', icon: CreditCard, tag: '৳ BDT' },
  ]

  return (
    <div className="w-full max-w-5xl mx-auto rounded-xl bg-card border border-border shadow-xs overflow-hidden">
      {/* SaaS Window Chrome Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground pl-2 font-mono">
            PrintFlow Connected Workspace
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>{tBilingual('End-to-End Flow', 'সম্পূর্ণ ওয়ার্কফ্লো')}</span>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Connected 7-Step Workflow Pipeline */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {WORKFLOW_STEPS.map((step, idx) => {
            const Icon = step.icon
            const isActive = step.active
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5 text-primary shadow-xs ring-1 ring-primary/20'
                    : 'border-border bg-muted/30 text-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground tabular-nums">
                    0{idx + 1}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold truncate">
                    {tBilingual(step.labelEn, step.labelBn)}
                  </h4>
                  <span className="text-xs font-medium text-muted-foreground block truncate mt-0.5">
                    {step.tag}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Live Job Order Card Preview */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">
                  JOB #2026-042
                </span>
                <span className="text-xs sm:text-sm font-semibold text-foreground">
                  Retail Backlit Signage &amp; Vinyl Branding
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {tBilingual(
                  'Specifications: 20ft × 10ft (200 SFT) • Star Flex Backlit',
                  'স্পেসিফিকেশন: ২০ফুট × ১০ফুট (২০০ স্কয়ারফুট) • স্টার ফ্লেক্স ব্যাকলিট'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-success-surface text-success border border-success-border">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{tBilingual('Stage: Production Running', 'মেশিন প্রোডাকশন রানিং')}</span>
              </span>
            </div>
          </div>

          {/* 4 Connected Operations Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-xs text-muted-foreground block uppercase font-medium">
                Dimensions
              </span>
              <span className="font-bold text-foreground text-sm tabular-nums mt-0.5 block">
                20ft × 10ft (200 SFT)
              </span>
              <span className="text-xs text-muted-foreground">Calculated with scrap</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-xs text-muted-foreground block uppercase font-medium">
                Inventory Deduction
              </span>
              <span className="font-bold text-foreground text-sm tabular-nums mt-0.5 block font-mono">
                Roll #BK-10-08
              </span>
              <span className="text-xs text-success font-medium">Auto-deducted from roll</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-xs text-muted-foreground block uppercase font-medium">
                Delivery Challan
              </span>
              <span className="font-bold text-foreground text-sm tabular-nums mt-0.5 block font-mono">
                DC-2026-042
              </span>
              <span className="text-xs text-muted-foreground">Ready for dispatch</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-xs text-muted-foreground block uppercase font-medium">
                Payment &amp; Dues
              </span>
              <span className="font-bold text-foreground text-sm tabular-nums mt-0.5 block">
                ৳ 22,000 Total
              </span>
              <span className="text-xs text-primary font-medium">৳ 12,000 Paid • ৳ 10,000 Due</span>
            </div>
          </div>
        </div>

        {/* Clear Demonstration Notice */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>* Demonstration of connected workflow and real application data models.</span>
          <span className="hidden sm:inline">Zero fake reviews or fabricated statistics.</span>
        </div>
      </div>
    </div>
  )
}
