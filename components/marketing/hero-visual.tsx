'use client'

import React from 'react'
import {
  FileText,
  Printer,
  Boxes,
  Truck,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Clock,
  Layers,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function HeroVisual() {
  const { tBilingual } = useI18n()

  const PIPELINE_STAGES = [
    { labelEn: '1. Order', labelBn: '১. অর্ডার', icon: FileText, status: 'Confirmed' },
    { labelEn: '2. Quote', labelBn: '২. কোটেশন', icon: CheckCircle2, status: '200 SFT' },
    { labelEn: '3. Production', labelBn: '৩. প্রোডাকশন', icon: Printer, status: 'Printing' },
    { labelEn: '4. Materials', labelBn: '৪. কাঁচামাল', icon: Boxes, status: 'Roll Media' },
    { labelEn: '5. Delivery', labelBn: '৫. ডেলিভারি', icon: Truck, status: 'Challan Ready' },
    { labelEn: '6. Payment', labelBn: '৬. পেমেন্ট', icon: CreditCard, status: 'BDT Paid' },
  ]

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl bg-card border border-border shadow-xl overflow-hidden transition-all">
      {/* Top Window Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-muted dark:bg-background">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-muted" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-muted" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-muted" />
          </div>
          <span className="text-2xs font-semibold text-muted-foreground pl-2">
            PrintERP • Connected Job Hub
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
          <span>{tBilingual('Live Workflow Engine', 'লাইভ ওয়ার্কফ্লো ইঞ্জিন')}</span>
        </div>
      </div>

      {/* Main Visual Pipeline Header */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Horizontal Pipeline Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {PIPELINE_STAGES.map((stg, idx) => {
            const Icon = stg.icon
            const isCurrent = idx === 2 // Production stage active
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 shadow-sm ring-1 ring-blue-500/20'
                    : 'border-border bg-muted text-foreground dark:text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-muted text-muted-foreground dark:text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-2xs font-bold text-muted-foreground tabular-nums">
                    0{idx + 1}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold truncate">
                    {tBilingual(stg.labelEn, stg.labelBn)}
                  </h4>
                  <span className="text-2xs font-medium text-muted-foreground block truncate">
                    {stg.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Representative Connected Job Card */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border dark:border-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded">
                  JOB-2026-084
                </span>
                <span className="text-xs font-semibold text-foreground dark:text-white">
                  Highway Billboard & Shop Front Signage
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {tBilingual(
                  'Client: Commercial Retailer • Delivery Location: Dhaka',
                  'গ্রাহক: বাণিজ্যিক প্রতিষ্ঠান • ডেলিভারি গন্তব্য: ঢাকা'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {tBilingual('In Production (Flora Solvent)', 'মেশিনে রানিং (ফ্লোরা সলভেন্ট)')}
              </span>
            </div>
          </div>

          {/* 4 Representative Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-muted border border-border dark:border-border">
              <span className="text-2xs text-muted-foreground block uppercase font-medium">Dimensions & Area</span>
              <span className="font-bold text-foreground dark:text-white text-sm tabular-nums mt-0.5 block">
                20ft × 10ft (200 SFT)
              </span>
              <span className="text-2xs text-muted-foreground">Star Flex 380 GSM</span>
            </div>

            <div className="p-3 rounded-lg bg-muted border border-border dark:border-border">
              <span className="text-2xs text-muted-foreground block uppercase font-medium">Roll Deduction</span>
              <span className="font-bold text-foreground dark:text-white text-sm tabular-nums mt-0.5 block">
                Roll #SF-10-04
              </span>
              <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-medium">200 SFT deducted + 5% scrap</span>
            </div>

            <div className="p-3 rounded-lg bg-muted border border-border dark:border-border">
              <span className="text-2xs text-muted-foreground block uppercase font-medium">Delivery Challan</span>
              <span className="font-bold text-foreground dark:text-white text-sm tabular-nums mt-0.5 block">
                CH-084 (Ready)
              </span>
              <span className="text-2xs text-muted-foreground">Dispatch with fitting team</span>
            </div>

            <div className="p-3 rounded-lg bg-muted border border-border dark:border-border">
              <span className="text-2xs text-muted-foreground block uppercase font-medium">Account Status</span>
              <span className="font-bold text-foreground dark:text-white text-sm tabular-nums mt-0.5 block">
                ৳ 18,500 Total
              </span>
              <span className="text-2xs text-blue-600 dark:text-blue-400 font-medium">৳ 10,000 Paid • ৳ 8,500 Due</span>
            </div>
          </div>
        </div>

        {/* Representative Notice Tag */}
        <div className="flex items-center justify-between text-2xs text-muted-foreground pt-1">
          <span>* Representative workflow structure illustrating actual application data models.</span>
          <span className="hidden sm:inline">No fabricated statistics or vanity metrics.</span>
        </div>
      </div>
    </div>
  )
}
