'use client'

import React, { useState } from 'react'
import {
  Users,
  FileText,
  Palette,
  Printer,
  Truck,
  CreditCard,
  CheckCircle2,
  Boxes,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

type ActiveVisualTab = 'workflow' | 'stock' | 'attendance' | 'finance'

export function HeroVisual() {
  const { tBilingual } = useI18n()
  const [activeTab, setActiveTab] = useState<ActiveVisualTab>('workflow')

  // Stock interactive simulation state
  const [stockRollLength, setStockRollLength] = useState(164)
  const [stockUsed, setStockUsed] = useState(20)
  const rollWidth = 10
  const remainingSft = (stockRollLength - stockUsed) * rollWidth
  const scrapSalvagedSft = 40

  // Attendance interactive simulation state
  const [qrScanned, setQrScanned] = useState(false)

  const WORKFLOW_STEPS = [
    { labelEn: 'Customer', labelBn: 'গ্রাহক', icon: Users, tag: 'Inquiry', step: '01' },
    { labelEn: 'Quotation', labelBn: 'কোটেশন', icon: FileText, tag: '200 SFT', step: '02' },
    { labelEn: 'Prepress', labelBn: 'ডিজাইন', icon: Palette, tag: 'Approved', step: '03' },
    { labelEn: 'Machine', labelBn: 'প্রোডাকশন', icon: Printer, tag: 'Printing', active: true, step: '04' },
    { labelEn: 'Inventory', labelBn: 'রোল স্টক', icon: Boxes, tag: 'Deducted', step: '05' },
    { labelEn: 'Challan', labelBn: 'চালান', icon: Truck, tag: 'Dispatched', step: '06' },
    { labelEn: 'Payment', labelBn: 'পেমেন্ট', icon: CreditCard, tag: '৳ bKash', step: '07' },
  ]

  return (
    <div className="w-full max-w-5xl mx-auto rounded-xl bg-card border border-border shadow-xs overflow-hidden">
      {/* SaaS Window Chrome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-muted/40 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 shrink-0">
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground pl-2 font-mono truncate">
            PrintFlow OS • Dhaka Central Press (Active Session)
          </span>
        </div>

        {/* Live Interactive Tab Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('workflow')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'workflow'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {tBilingual('Production Workflow', 'প্রোডাকশন ফ্লো')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'stock'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {tBilingual('Roll Stock & Scrap', 'রোল স্টক ও অপচয়')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'attendance'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {tBilingual('QR Attendance', 'কিউআর হাজিরা')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'finance'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {tBilingual('Accounts & Challan', 'হিসাব ও চালান')}
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-7 space-y-6">
        {/* TAB 1: PRODUCTION WORKFLOW */}
        {activeTab === 'workflow' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* 7-Step Pipeline Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {WORKFLOW_STEPS.map((step, idx) => {
                const Icon = step.icon
                const isActive = step.active
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20'
                        : 'border-border bg-muted/30 text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div
                        className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground tabular-nums">
                        {step.step}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold truncate">
                        {tBilingual(step.labelEn, step.labelBn)}
                      </h4>
                      <span className="text-xs font-medium text-muted-foreground block truncate">
                        {step.tag}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Live Job Card Mockup */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded font-mono">
                      JOB #2026-089
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-foreground">
                      Apex Retail Backlit Signage &amp; Branding
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted font-medium text-muted-foreground">
                      Reseller Tier
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tBilingual(
                      'Dimensions: 20ft × 10ft (200 SFT) • Star Flex Backlit • Flora Polaris 512i Machine Bed #1',
                      'পরিমাপ: ২০ফুট × ১০ফুট (২০০ স্কয়ারফুট) • স্টার ফ্লেক্স ব্যাকলিট • ফ্লোরা পোলারিস ৫১২আই মেশিন বেড #১'
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success-surface text-success border border-success-border">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    <span>{tBilingual('Stage: Printing (Pass 3/4)', 'প্রিন্টিং চলছে (পাস ৩/৪)')}</span>
                  </span>
                </div>
              </div>

              {/* 4 Connected Status Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs text-muted-foreground block uppercase font-medium">
                    {tBilingual('Billable Area', 'বিলিং পরিমাপ')}
                  </span>
                  <span className="font-bold text-foreground text-sm tabular-nums mt-0.5 block">
                    20ft × 10ft = 200 SFT
                  </span>
                  <span className="text-xs text-success font-medium">
                    {tBilingual('Auto-calculated with scrap', 'অপচয়সহ নিখুঁত হিসাব')}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs text-muted-foreground block uppercase font-medium">
                    {tBilingual('Roll Allocated', 'বরাদ্দকৃত রোল')}
                  </span>
                  <span className="font-bold text-foreground text-sm tabular-nums mt-0.5 block font-mono">
                    Roll #BK-10-08
                  </span>
                  <span className="text-xs text-primary font-medium">
                    {tBilingual('Deducted: 200 SFT', '২০০ স্কয়ারফুট সমন্বয়')}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs text-muted-foreground block uppercase font-medium">
                    {tBilingual('Floor Operator', 'মেশিন অপারেটর')}
                  </span>
                  <span className="font-bold text-foreground text-sm tabular-nums mt-0.5 block">
                    Md. Faruk Hossain
                  </span>
                  <span className="text-xs text-success font-medium">
                    {tBilingual('QR Check-in: 09:02 AM', 'কিউআর হাজিরা: ০৯:০২')}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs text-muted-foreground block uppercase font-medium">
                    {tBilingual('Challan & Billing', 'চালান ও বিল')}
                  </span>
                  <span className="font-bold text-foreground text-sm tabular-nums mt-0.5 block font-mono">
                    DC-2026-089
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tBilingual('৳ 18,000 (Advance ৳ 10k)', '৳ ১৮,০০০ (অগ্রিম ১০ হাজার)')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROLL STOCK & SCRAP SALVAGE */}
        {activeTab === 'stock' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">
                      ROLL #SF-10-164
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      Star Flex Backlit (Width 10ft × Length 164ft)
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tBilingual(
                      'Warehouse Rack B-2 • Solvent Large-Format Media • Supplier: Meghna Trading',
                      'ওয়্যারহাউস র‍্যাক বি-২ • সলভেন্ট লার্জ-ফরম্যাট মিডিয়া • সরবরাহকারী: মেঘনা ট্রেডিং'
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStockUsed((prev) => (prev >= 140 ? 20 : prev + 20))
                    }}
                    className="h-8 text-xs font-semibold cursor-pointer border-input"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    <span>{tBilingual('Simulate 20ft Cut', '২০ ফুট কাটার সিমুলেশন')}</span>
                  </Button>
                </div>
              </div>

              {/* Visual Stock Meter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    {tBilingual('Roll Utilization & Remaining SFT', 'রোলের বর্তমান অবশিষ্ট স্কয়ারফিট')}
                  </span>
                  <span className="font-mono font-bold text-primary tabular-nums">
                    {remainingSft} SFT Remaining ({stockRollLength - stockUsed} RFT)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex border border-border">
                  <div
                    className="bg-primary transition-all duration-300"
                    style={{ width: `${((stockRollLength - stockUsed) / stockRollLength) * 100}%` }}
                  />
                  <div
                    className="bg-warning transition-all duration-300"
                    style={{ width: `${(stockUsed / stockRollLength) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                  <span>0 RFT (Empty)</span>
                  <span className="text-warning font-medium">Used: {stockUsed * rollWidth} SFT</span>
                  <span>Total: {stockRollLength * rollWidth} SFT</span>
                </div>
              </div>

              {/* Offcut / Scrap Salvage Engine Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-success-surface border border-success-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-success uppercase">
                      {tBilingual('Scrap Salvaged', 'সংরক্ষিত স্ক্র্যাপ')}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <span className="text-sm font-bold text-success block mt-1">
                    {scrapSalvagedSft} SFT Remnant Salvaged
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tBilingual('Saved 4ft × 10ft strip for standees', '৪×১০ ফুট টুকরো ছোট স্ট্যান্ডির জন্য সংরক্ষিত')}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    {tBilingual('Low Stock Alert Rule', 'লো স্টক সতর্কবার্তা')}
                  </span>
                  <span className="text-sm font-bold text-foreground block mt-1">
                    Alert at &lt; 300 SFT
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tBilingual('SMS & Dashboard threshold prompt', 'স্টক কমলে স্বয়ংক্রিয় সতর্কবার্তা')}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    {tBilingual('Direct Savings', 'সরাসরি সাশ্রয়')}
                  </span>
                  <span className="text-sm font-bold text-primary block mt-1">
                    ৳ 1,400 Salvaged / Roll
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tBilingual('Zero usable scraps dumped in trash', 'উপযোগী স্ক্র্যাপ ফেলে নষ্ট করা বন্ধ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SMART QR ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">
                      LIVE ROSTER
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      Floor Terminal: Machine Floor &amp; Prepress Attendance
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tBilingual(
                      'Camera & Tablet QR Terminal • Geofenced to Shop WiFi/GPS • Live On-Duty Roster',
                      'ক্যামেরা ও ট্যাবলেট কিউআর টার্মিনাল • প্রেস ওয়াইফাই ভেরিফাইড • লাইভ ফ্লোর হাজিরা'
                    )}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => setQrScanned(!qrScanned)}
                  className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                >
                  <QrCode className="mr-1.5 h-3.5 w-3.5" />
                  <span>
                    {qrScanned
                      ? tBilingual('Reset Scan Demo', 'পুনরায় স্ক্যান দেখুন')
                      : tBilingual('Simulate QR Badge Scan', 'কিউআর স্ক্যান পরীক্ষা করুন')}
                  </span>
                </Button>
              </div>

              {/* 3 Staff Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Md. Faruk Hossain</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        qrScanned
                          ? 'bg-success-surface text-success border border-success-border'
                          : 'bg-primary/10 text-primary border border-primary/20'
                      }`}
                    >
                      {qrScanned ? 'Clocked In' : 'On-Duty'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>Role: Lead Operator (Flora 512i)</div>
                    <div className="font-mono text-foreground font-semibold">
                      Check-In: 09:02 AM • On-Time
                    </div>
                    <div className="text-success font-medium">Output: 420 SFT Printed Today</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Rakib Ahmed</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-success-surface text-success border border-success-border">
                      Active
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>Role: Prepress Graphic Designer</div>
                    <div className="font-mono text-foreground font-semibold">
                      Check-In: 09:14 AM • On-Time
                    </div>
                    <div>Proofs: 9 Client Files Approved</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Sajib Mia</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-warning-surface text-warning border border-warning-border">
                      On Field
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>Role: Signboard Fitter &amp; Delivery</div>
                    <div className="font-mono text-foreground font-semibold">
                      Check-In: 09:30 AM • Site Route
                    </div>
                    <div>Challan: DC-2026-088 Delivered</div>
                  </div>
                </div>
              </div>

              {/* QR Verification Status Bar */}
              <div className="p-3 rounded-lg bg-card border border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">
                    {tBilingual(
                      'Anti-Ghost Attendance: Unique daily rotating QR badges prevent proxy punch-ins.',
                      'ভুয়া হাজিরা প্রতিরোধ: প্রতিদিনের অটো-রোটেটিং কিউআর কোডে কোনো প্রক্সি সম্ভব নয়।'
                    )}
                  </span>
                </div>
                <span className="text-success font-bold font-mono">100% Verified</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ACCOUNTS & BKASH CHALLAN */}
        {activeTab === 'finance' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">
                      INVOICE #INV-2026-089
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      Client Ledger &amp; bKash / Bank Settlement
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tBilingual(
                      'Client: Apex Branding & Media • Reseller Contract Pricing (৳ 90 / SFT)',
                      'গ্রাহক: অ্যাপেক্স ব্র্যান্ডিং • রিসেলার স্পেশাল রেট (৳ ৯০ / স্কয়ারফিট)'
                    )}
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success-surface text-success border border-success-border">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{tBilingual('bKash Merchant TrxID Attached', 'বিকাশ মার্চেন্ট ট্রানজেকশন যুক্ত')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs text-muted-foreground block uppercase font-medium">
                    Total Invoice Bill
                  </span>
                  <span className="font-bold text-foreground text-base tabular-nums mt-0.5 block">
                    ৳ 18,000
                  </span>
                  <span className="text-xs text-muted-foreground">200 SFT @ ৳ 90</span>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs text-muted-foreground block uppercase font-medium">
                    Advance Collected
                  </span>
                  <span className="font-bold text-success text-base tabular-nums mt-0.5 block">
                    ৳ 10,000
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">bKash Trx: #BK9281X</span>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs text-muted-foreground block uppercase font-medium">
                    Remaining Due
                  </span>
                  <span className="font-bold text-primary text-base tabular-nums mt-0.5 block">
                    ৳ 8,000
                  </span>
                  <span className="text-xs text-muted-foreground">On Delivery Challan</span>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs text-muted-foreground block uppercase font-medium">
                    WhatsApp Reminder
                  </span>
                  <span className="font-bold text-foreground text-sm mt-0.5 block">
                    Ready to Send
                  </span>
                  <span className="text-xs text-primary font-medium">1-Click Polite Notice</span>
                </div>
              </div>

              {/* Delivery Challan Note */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Official Mushak 6.3 Delivery Challan printed with Driver Signature slip.
                </span>
                <span className="font-bold text-foreground font-mono">DC-2026-089 READY</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Context Footnote */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground pt-1 gap-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success inline-block" />
            <span>
              {tBilingual(
                'Live interactive demonstration with verified print shop business logic.',
                'প্রকৃত প্রিন্টিং ও সাইনেজ ব্যবসার রিয়েল ডাটা সম্বলিত লাইভ ডেমো।'
              )}
            </span>
          </div>
          <span>
            {tBilingual(
              'Zero fabricated numbers • 100% authentic architecture',
              'শতভাগ খাঁটি দেশীয় ক্লাউড আর্কিটেকচার'
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
