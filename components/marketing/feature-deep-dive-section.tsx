'use client'

import React, { useState } from 'react'
import {
 Calculator,
 Printer,
 TrendingUp,
 CreditCard,
 MessageSquare,
 CheckCircle2,
 Clock,
 AlertTriangle,
 ArrowRight,
 ShieldCheck,
 Send,
 Sparkles,
 Layers,
 Wrench,
 Truck,
 RotateCcw,
 Copy,
 Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'

const MEDIA_PRESETS = [
  { label: 'Star Flex (380g)', rate: 80, nameBn: 'স্টার ফ্লেক্স (৩৮০ গ্রাম)' },
  { label: 'Chinese Flex (280g)', rate: 50, nameBn: 'চাইনিজ ফ্লেক্স (২৮০ গ্রাম)' },
  { label: 'Cast Vinyl + Lam', rate: 140, nameBn: 'কাস্ট ভিনাইল + লেমিনেশন' },
  { label: 'Backlit Panaflex', rate: 130, nameBn: 'ব্যাকলিট প্যানাফ্লেক্স' },
  { label: 'Acrylic Sheet 3mm', rate: 320, nameBn: 'এক্রিলিক শিট ৩ মিমি' },
]

const SIZE_PRESETS = [
  { label: '10ft × 3ft Banner', w: 10, h: 3, q: 1 },
  { label: '20ft × 10ft Billboard', w: 20, h: 10, q: 1 },
  { label: '6ft × 3ft Panaflex', w: 6, h: 3, q: 1 },
  { label: 'Standee (2.5ft × 6ft)', w: 2.5, h: 6, q: 3 },
]

const JOB_COSTING_PRESETS = [
  {
 id: 'billboard',
 title: 'Rooftop Billboard (20ft × 10ft)',
 titleBn: 'রুফটপ বিলবোর্ড (২০ফিট × ১০ফিট)',
 price: 25000,
 mediaCost: 9000,
 mediaDesc: 'Star Flex 200 SFT + Solvent Ink',
 laborCost: 3000,
 laborDesc: 'Press Operator & MS Welder',
 transportCost: 1000,
 transportDesc: 'Pickup Van to Highway Site',
 installCost: 2000,
 installDesc: 'Crane Rent & On-Site Rigging',
  },
  {
 id: 'acrylic',
 title: '3D Acrylic Channel Letters',
 titleBn: '৩ডি এক্রিলিক চ্যানেল লেটার',
 price: 64000,
 mediaCost: 24000,
 mediaDesc: '3mm Cast Acrylic, LED Modules & ACP',
 laborCost: 9000,
 laborDesc: 'CNC Laser Technician & Wireman',
 transportCost: 1500,
 transportDesc: 'Site Delivery & Scaffolding',
 installCost: 4500,
 installDesc: 'Electrician & Master Fitter',
  },
  {
 id: 'standee',
 title: 'Expo Rollup Standees (5 Pcs)',
 titleBn: 'এক্সপো রোলআপ স্ট্যান্ডি (৫টি)',
 price: 11500,
 mediaCost: 4500,
 mediaDesc: 'Cast Vinyl, Matte Lam & Heavy Base',
 laborCost: 1200,
 laborDesc: 'Plotter Cut & Stand Assembly',
 transportCost: 500,
 transportDesc: 'Courier Box Packaging',
 installCost: 0,
 installDesc: 'Self-Assemble Ready',
  },
]

const INVOICE_DUE_PRESETS = [
  {
 id: 'INV-00180',
 client: 'Rahim Advertising Ltd',
 clientBn: 'রহিম অ্যাডভার্টাইজিং লিঃ',
 phone: '+880 1712-345678',
 total: 50000,
 advance: 30000,
 due: 20000,
 daysOverdue: 18,
 msgBn:
      'প্রিয় রহিম অ্যাডভার্টাইজিং, অ্যাপেক্স ডিজিটাল প্রেস থেকে আপনার INV-00180 চালানের মোট বিল ৳ ৫০,০০০-এর মধ্যে বকেয়া ৳ ২০,০০০ টাকা বাকি রয়েছে। অনুগ্রহ করে বকেয়া পরিশোধ করুন। বিকাশ মার্চেন্ট: 01819-876543। ধন্যবাদ!',
 msgEn:
      'Dear Rahim Advertising, gentle reminder from Apex Digital Press regarding invoice INV-00180. Total: ৳50,000, Outstanding balance: ৳20,000. Please clear payment via bKash Merchant: 01819-876543. Thank you!',
  },
  {
 id: 'INV-00181',
 client: 'Summit Trade International',
 clientBn: 'সামিট ট্রেড ইন্টারন্যাশনাল',
 phone: '+880 1819-123456',
 total: 95000,
 advance: 50000,
 due: 45000,
 daysOverdue: 34,
 msgBn:
      'প্রিয় সামিট ট্রেড, আপনার মেলা স্টল ব্র্যান্ডিং বিল INV-00181-এর বকেয়া ৳ ৪৫,০০০ টাকা ৩৪ দিন ধরে বাকি রয়েছে। অনুগ্রহ করে আজকের মধ্যে পরিশোধের ব্যবস্থা করুন। ধন্যবাদ!',
 msgEn:
      'Dear Summit Trade, reminder regarding fair booth branding invoice INV-00181. Outstanding balance: ৳45,000 (34 days overdue). Please arrange payment today. Thank you!',
  },
  {
 id: 'INV-00182',
 client: 'Apex Retail Store Gulshan',
 clientBn: 'এপেক্স রিটেল স্টোর গুলশান',
 phone: '+880 1911-987654',
 total: 18500,
 advance: 10000,
 due: 8500,
 daysOverdue: 8,
 msgBn:
      'প্রিয় এপেক্স রিটেল গুলশান, আপনার শপ ব্যানার কাজের চালান INV-00182-এর বকেয়া ৳ ৮,৫০০ টাকা প্রস্তুত রয়েছে। সুবিধাজনক সময়ে বিকাশ বা ব্যাংকে পরিশোধ করুন।',
 msgEn:
      'Dear Apex Retail Gulshan, your shop banner invoice INV-00182 has a pending balance of ৳8,500. Please clear via bKash or Bank at your earliest convenience.',
  },
]

export function FeatureDeepDiveSection() {
 const { tBilingual, locale } = useI18n()

  // Interactive SFT Calculator State
 const [calcWidth, setCalcWidth] = useState<number>(10)
 const [calcHeight, setCalcHeight] = useState<number>(5)
 const [calcQty, setCalcQty] = useState<number>(1)
 const [calcRate, setCalcRate] = useState<number>(80)
 const [calcDiscount, setCalcDiscount] = useState<number>(5)
 const [calcVat, setCalcVat] = useState<number>(7.5)
 const [copiedQuote, setCopiedQuote] = useState(false)

 const totalSft = calcWidth * calcHeight * calcQty
 const subtotal = totalSft * calcRate
 const discountAmount = (subtotal * calcDiscount) / 100
 const afterDiscount = subtotal - discountAmount
 const vatAmount = (afterDiscount * calcVat) / 100
 const grandTotal = Math.round(afterDiscount + vatAmount)

 const handleCopyQuote = () => {
 const text = `*PrintERP SFT Quotation*\nSize: ${calcWidth}ft × ${calcHeight}ft (${calcQty} pcs) = ${totalSft} SFT\nRate: ৳${calcRate}/sft\nSubtotal: ৳${subtotal.toLocaleString()}\nDiscount (${calcDiscount}%): -৳${Math.round(discountAmount).toLocaleString()}\nVAT (${calcVat}%): +৳${Math.round(vatAmount).toLocaleString()}\n*Grand Total: ৳${grandTotal.toLocaleString()} BDT*`
 navigator.clipboard.writeText(text)
 setCopiedQuote(true)
 setTimeout(() => setCopiedQuote(false), 3000)
  }

  // Interactive Costing Preset State
 const [selectedCostPreset, setSelectedCostPreset] = useState(JOB_COSTING_PRESETS[0].id)
 const costData = JOB_COSTING_PRESETS.find((p) => p.id === selectedCostPreset) || JOB_COSTING_PRESETS[0]
 const totalCost = costData.mediaCost + costData.laborCost + costData.transportCost + costData.installCost
 const netProfit = costData.price - totalCost
 const profitMargin = ((netProfit / costData.price) * 100).toFixed(1)

  // Interactive Payment Reminder State
 const [selectedInvoice, setSelectedInvoice] = useState(INVOICE_DUE_PRESETS[0].id)
 const invoiceData = INVOICE_DUE_PRESETS.find((i) => i.id === selectedInvoice) || INVOICE_DUE_PRESETS[0]
 const [reminderSent, setReminderSent] = useState(false)

 const handleSendReminder = () => {
 setReminderSent(true)
 setTimeout(() => setReminderSent(false), 4000)
  }

 return (
    <section className="py-16 sm:py-20 md:py-28 bg-surface-inset relative overflow-hidden border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24 md:space-y-32">
        {/* ============================================================== */}
        {/* SECTION A: CREATE QUOTATIONS IN MINUTES (SFT PRICING ENGINE)   */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-14 items-center">
          {/* Left Text & Explanations (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider bangla-text">
              <Calculator className="h-3.5 w-3.5 shrink-0"/>
              <span>{tBilingual('Fast SFT Estimation', 'স্কয়ারফিট কোটেশন ক্যালকুলেটর')}</span>
            </div>

            <h3 className="text-2xl xs:text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight bangla-text">
              {tBilingual(
                'Create Quotations in Minutes — Not Hours.',
                'কয়েক মিনিটে নিখুঁত কোটেশন তৈরি করুন।'
              )}
            </h3>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed bangla-text">
              {tBilingual(
                'Say goodbye to mental math and calculator errors. PrintERP calculates square feet, converts running feet for signboard frames, applies finishing charges (eyelets, lamination, die-cuts), and auto-adds NBR VAT in real time.',
                'ক্যালকুলেটর নিয়ে ভুল করার দিন শেষ। ইঞ্চি ও ফিট ইনপুট দিন—সফটওয়্যার নিজে থেকে স্কয়ারফিট, রোল খরচ, ল্যামিনেশন ও ভ্যাট হিসাব করে ব্র্যান্ডেড পিডিএফ রেডি করে দেবে।'
              )}
            </p>

            <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-foreground">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0"/>
                <span>Auto-converts Inches, Feet & SFT with Minimum Charge floor</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0"/>
                <span>Media-specific rates: Star Flex, Chinese, Vinyl, Backlit, ACP</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0"/>
                <span>1-Click WhatsApp branded PDF estimate dispatch</span>
              </div>
            </div>
          </div>

          {/* Right Interactive SFT Widget Mockup (7 Cols) */}
          <div className="lg:col-span-7">
            <div className="p-4 sm:p-6 md:p-8 rounded-xl border border-primary/20/30 bg-surface-inset shadow-xs shadow-cyan-950/30 space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3 sm:pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
 SFT
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Live SFT Quotation Engine</h4>
                    <span className="text-xs sm:text-xs text-muted-foreground tabular-nums">Formula: W × H × Qty × Rate</span>
                  </div>
                </div>
                <Badge variant="outline"className="text-xs sm:text-xs text-primary border-primary/20/30 shrink-0">
 Interactive Demo
                </Badge>
              </div>

              {/* Quick Size Presets */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground tabular-nums uppercase">Quick Size Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {SIZE_PRESETS.map((sz, idx) => (
                    <button
 key={idx}
 type="button"onClick={() => {
 setCalcWidth(sz.w)
 setCalcHeight(sz.h)
 setCalcQty(sz.q)
                      }}
 className="px-2.5 py-1 rounded-md bg-surface-inset hover:bg-card-elevated border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Media Rate Presets */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground tabular-nums uppercase">Media & Roll Rate:</span>
                <div className="flex flex-wrap gap-1.5">
                  {MEDIA_PRESETS.map((m, idx) => (
                    <button
 key={idx}
 type="button"onClick={() => setCalcRate(m.rate)}
 className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
 calcRate === m.rate
                          ? 'bg-primary text-foreground font-bold shadow-xs'
                          : 'bg-surface-inset text-muted-foreground border border-border hover:bg-card-elevated hover:text-foreground'
                      }`}
                    >
                      {locale === 'bn' ? m.nameBn : m.label} (৳{m.rate})
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Adjusters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
                <div className="p-2 sm:p-2.5 rounded-lg bg-surface-inset border border-border">
                  <label className="text-muted-foreground block text-xs tabular-nums">Width (ft)</label>
                  <input
 type="number"value={calcWidth}
 onChange={(e) => setCalcWidth(Math.max(1, Number(e.target.value)))}
 className="w-full bg-transparent font-bold text-white text-sm sm:text-base focus:outline-none"/>
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-surface-inset border border-border">
                  <label className="text-muted-foreground block text-xs tabular-nums">Height (ft)</label>
                  <input
 type="number"value={calcHeight}
 onChange={(e) => setCalcHeight(Math.max(1, Number(e.target.value)))}
 className="w-full bg-transparent font-bold text-white text-sm sm:text-base focus:outline-none"/>
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-surface-inset border border-border">
                  <label className="text-muted-foreground block text-xs tabular-nums">Rate (৳/sft)</label>
                  <input
 type="number"value={calcRate}
 onChange={(e) => setCalcRate(Math.max(1, Number(e.target.value)))}
 className="w-full bg-transparent font-bold text-primary text-sm sm:text-base focus:outline-none"/>
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-surface-inset border border-border">
                  <label className="text-muted-foreground block text-xs tabular-nums">Quantity</label>
                  <input
 type="number"value={calcQty}
 onChange={(e) => setCalcQty(Math.max(1, Number(e.target.value)))}
 className="w-full bg-transparent font-bold text-white text-sm sm:text-base focus:outline-none"/>
                </div>
              </div>

              {/* Live Calculation Display Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-surface-inset border border-border space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span className="truncate pr-2">
 Total Square Footage ({calcWidth}ft × {calcHeight}ft × {calcQty} pcs):
                  </span>
                  <span className="tabular-nums font-bold text-white shrink-0">{totalSft} SFT</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="truncate pr-2">Base Subtotal ({totalSft} SFT × ৳{calcRate}):</span>
                  <span className="tabular-nums text-white shrink-0">৳ {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-success">
                  <span className="truncate pr-2">Discount ({calcDiscount}%):</span>
                  <span className="tabular-nums shrink-0">- ৳ {Math.round(discountAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span className="truncate pr-2">NBR Tax ({calcVat}% VAT):</span>
                  <span className="tabular-nums shrink-0">+ ৳ {Math.round(vatAmount).toLocaleString()}</span>
                </div>

                <div className="pt-3 border-t border-border flex flex-col xs:flex-row xs:items-center justify-between gap-2 text-sm">
                  <span className="font-bold text-white">Quotation Grand Total:</span>
                  <span className="text-lg sm:text-xl font-black text-primary tabular-nums">
                    ৳ {grandTotal.toLocaleString()} BDT
                  </span>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-end">
                  <Button
 size="sm"variant="outline"onClick={handleCopyQuote}
 className="border-border bg-surface-inset text-foreground hover:text-foreground text-xs h-8 cursor-pointer">
                    {copiedQuote ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-success mr-1.5"/>
                        <span className="text-success">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-primary mr-1.5"/>
                        <span>Copy Quote for WhatsApp</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECTION B: KNOW WHAT'S HAPPENING ON THE PRODUCTION FLOOR       */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-14 items-center">
          {/* Left Kanban Mockup (7 Cols) */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="p-4 sm:p-6 rounded-xl border border-primary/20/30 bg-surface-inset shadow-xs shadow-blue-950/30 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 sm:h-5 sm:w-5 text-primary"/>
                  <span className="font-bold text-xs sm:text-sm text-white">Floor Kanban Station</span>
                </div>
                <span className="text-xs sm:text-xs tabular-nums text-muted-foreground">Live Press Queue</span>
              </div>

              {/* 5 Department Status Stages */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
                {/* 1. Design */}
                <div className="p-2 sm:p-2.5 rounded-lg bg-surface-inset border border-border space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between font-bold text-muted-foreground">
                    <span>Design</span>
                    <span className="text-primary">3</span>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded bg-surface-inset text-xs border border-border">
                    <div className="font-semibold text-white truncate">ORD-289 Walton</div>
                    <span className="text-warning font-medium">Waiting Proof</span>
                  </div>
                </div>

                {/* 2. Printing */}
                <div className="p-2 sm:p-2.5 rounded-lg bg-surface-inset border border-primary/20/30 space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between font-bold text-primary">
                    <span>Printing</span>
                    <span className="text-primary">6</span>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded bg-primary/10 text-xs border border-primary/20/30">
                    <div className="font-semibold text-white truncate">ORD-284 Akij</div>
                    <span className="text-primary font-medium">Flora 10ft Run</span>
                  </div>
                </div>

                {/* 3. Finishing */}
                <div className="p-2 sm:p-2.5 rounded-lg bg-surface-inset border border-border space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between font-bold text-muted-foreground">
                    <span>Finishing</span>
                    <span className="text-fuchsia-400">4</span>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded bg-surface-inset text-xs border border-border">
                    <div className="font-semibold text-white truncate">ORD-285 Beximco</div>
                    <span className="text-fuchsia-400 font-medium">Lamination</span>
                  </div>
                </div>

                {/* 4. Fabrication */}
                <div className="p-2 sm:p-2.5 rounded-lg bg-surface-inset border border-border space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between font-bold text-muted-foreground">
                    <span>Fab</span>
                    <span className="text-warning">2</span>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded bg-surface-inset text-xs border border-border">
                    <div className="font-semibold text-white truncate">ORD-286 Acrylic</div>
                    <span className="text-warning font-medium">LED Wiring</span>
                  </div>
                </div>

                {/* 5. Dispatch */}
                <div className="col-span-2 sm:col-span-1 p-2 sm:p-2.5 rounded-lg bg-surface-inset border border-success-border/30 space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between font-bold text-success">
                    <span>Delivery</span>
                    <span className="text-success">5</span>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded bg-success-surface text-xs border border-success-border/30">
                    <div className="font-semibold text-white truncate">ORD-287 Shwapno</div>
                    <span className="text-success font-medium">Challan Ready</span>
                  </div>
                </div>
              </div>

              {/* Job Status Badges Row */}
              <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-card-elevated text-muted-foreground font-semibold">Queued</span>
                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-semibold border border-primary/20/40">In Progress</span>
                <span className="px-2 py-0.5 rounded bg-success/20 text-success font-semibold border border-success-border/40">Completed</span>
                <span className="px-2 py-0.5 rounded bg-warning/20 text-warning font-semibold border border-warning-border/40">Delayed Flag</span>
                <span className="px-2 py-0.5 rounded bg-destructive/20 text-destructive font-semibold border border-danger-border/40">Rework Tracked</span>
              </div>
            </div>
          </div>

          {/* Right Text (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-6 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider bangla-text">
              <Printer className="h-3.5 w-3.5 shrink-0"/>
              <span>{tBilingual('Live Floor Visibility', 'কারখানার লাইভ অগ্রগতি')}</span>
            </div>

            <h3 className="text-2xl xs:text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight bangla-text">
              {tBilingual("Know What's Happening on the Production Floor.",
                'কারখানায় কোন মেশিনে কী কাজ চলছে—সবকিছু লাইভ দেখুন।'
              )}
            </h3>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed bangla-text">
              {tBilingual(
                'No more running back and forth to the machine room to ask operators if the client billboard is ready. The live Kanban tracks jobs across RIP proofing, printing, lamination, CNC fabrication, and dispatch.',
                'অর্ডারটা কোন ধাপে আছে তা জানার জন্য বারবার কারখানায় দৌড়াদৌড়ি করতে হবে না। স্ক্রিনেই দেখা যাবে কোন কাজ মেশিনে চলছে, কোনটা ফিনিশিংয়ে আর কোনটা ডেলিভারির জন্য প্রস্তুত।'
              )}
            </p>

            <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-foreground">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0"/>
                <span>Operator touch station for 1-tap start and completion</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0"/>
                <span>Instant alert if a machine breaks down or media tears</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0"/>
                <span>Rework and wastage audit per machine and operator</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECTION C: KNOW YOUR REAL JOB PROFIT (TRUE COSTING ENGINE)    */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-14 items-center">
          {/* Left Text (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-success-border/30 bg-success/10 text-success text-xs font-bold uppercase tracking-wider bangla-text">
              <TrendingUp className="h-3.5 w-3.5 shrink-0"/>
              <span>{tBilingual('True Costing & Profit', 'আসল মুনাফা নির্ণয়')}</span>
            </div>

            <h3 className="text-2xl xs:text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight bangla-text">
              {tBilingual(
                'Know Your Real Job Profit — Stop Guessing.',
                'প্রতিটি অর্ডারে খাঁটি নিট লাভ জেনে নিন—অনুমান নয়।'
              )}
            </h3>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed bangla-text">
              {tBilingual(
                'Many shop owners celebrate high sales only to find their bank account empty at the end of the month. PrintERP calculates the exact bill of materials (media, ink, grommets, ACP, frame pipe), electricity, operator labor, and transport to reveal your true net profit.',
                'অনেক সময় লাখ টাকার বিল করেও মাস শেষে ক্যাশ থাকে না। কারণ লুকায়িত খরচগুলো হিসাবে আসে না। প্রিন্টইআরপিতে মেটেরিয়াল, কালি, বিদ্যুৎ, কারিগরের মজুরি ও পরিবহন বাদ দিয়ে প্রতিটি কাজের আসল লাভ নিশ্চিত করা হয়।'
              )}
            </p>

            <div className="p-3.5 sm:p-4 rounded-xl bg-success-surface border border-success-border/50 text-xs text-success">
              <span className="font-bold">Real PrintERP Insight:</span>
              <p className="mt-1 text-muted-foreground leading-relaxed">
 A ৳25,000 billboard quote costs ৳15,000 in raw media, labor, framing & transport — locking in a guaranteed ৳10,000 (40%) net profit margin.
              </p>
            </div>
          </div>

          {/* Right Profit Breakdown Mockup (7 Cols) */}
          <div className="lg:col-span-7">
            <div className="p-4 sm:p-6 md:p-8 rounded-xl border border-success-border/30 bg-surface-inset shadow-xs shadow-emerald-950/30 space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3 sm:pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-success/20 text-success flex items-center justify-center font-bold text-xs shrink-0">
 P&L
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Job Costing Audit & Margins</h4>
                    <span className="text-xs sm:text-xs text-muted-foreground tabular-nums">BOM Cost Breakdown</span>
                  </div>
                </div>
                <Badge className="bg-success/20 text-success border-success-border/40 text-xs sm:text-xs shrink-0">
                  {profitMargin}% Net Margin
                </Badge>
              </div>

              {/* Job Preset Switcher */}
              <div className="flex flex-wrap gap-1.5">
                {JOB_COSTING_PRESETS.map((p) => (
                  <button
 key={p.id}
 type="button"onClick={() => setSelectedCostPreset(p.id)}
 className={`px-2.5 py-1 rounded-md text-xs sm:text-xs font-semibold transition-colors cursor-pointer ${
 selectedCostPreset === p.id
                        ? 'bg-success text-foreground font-bold shadow-xs'
                        : 'bg-surface-inset text-muted-foreground border border-border hover:bg-card-elevated hover:text-foreground'
                    }`}
                  >
                    {tBilingual(p.title, p.titleBn)}
                  </button>
                ))}
              </div>

              {/* Breakdown Rows */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-surface-inset border border-border">
                  <span className="font-bold text-white">Client Selling Price:</span>
                  <span className="font-black text-primary tabular-nums text-xs sm:text-sm">
                    ৳ {costData.price.toLocaleString()} BDT
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-surface-inset border border-border space-y-2">
                  <div className="text-xs sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Cost of Goods & Operational Expenses:
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span className="truncate pr-2">• Raw Media & Inks ({costData.mediaDesc}):</span>
                    <span className="tabular-nums text-destructive shrink-0">- ৳ {costData.mediaCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span className="truncate pr-2">• Machine Operator & Labor ({costData.laborDesc}):</span>
                    <span className="tabular-nums text-destructive shrink-0">- ৳ {costData.laborCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span className="truncate pr-2">• Logistics & Transport ({costData.transportDesc}):</span>
                    <span className="tabular-nums text-destructive shrink-0">- ৳ {costData.transportCost.toLocaleString()}</span>
                  </div>
                  {costData.installCost > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span className="truncate pr-2">• Site Rigging & Fitting ({costData.installDesc}):</span>
                      <span className="tabular-nums text-destructive shrink-0">- ৳ {costData.installCost.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border flex justify-between text-foreground font-bold">
                    <span>Total Job Cost:</span>
                    <span className="tabular-nums text-destructive">৳ {totalCost.toLocaleString()}</span>
                  </div>
                </div>

                {/* Final Net Profit Banner */}
                <div className="p-3 sm:p-3.5 rounded-xl border border-success-border/40 flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs sm:text-xs uppercase tracking-wider font-bold text-success">
 Guaranteed Net Profit
                    </div>
                    <div className="text-lg sm:text-xl font-black text-white tabular-nums mt-0.5">
                      + ৳ {netProfit.toLocaleString()} BDT
                    </div>
                  </div>
                  <span className="px-2.5 sm:px-3 py-1 rounded-full bg-success/20 text-success text-xs sm:text-xs font-bold border border-success-border/40 shrink-0 self-start xs:self-auto">
                    {profitMargin}% Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECTION D: NEVER LOSE TRACK OF CUSTOMER DUES (DUE RECOVERY)    */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-14 items-center">
          {/* Left Mockup (7 Cols) */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="p-4 sm:p-6 md:p-8 rounded-xl border border-warning-border/30 bg-surface-inset shadow-xs shadow-amber-950/30 space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-warning shrink-0"/>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Receivable Ledger & Recovery</h4>
                    <span className="text-xs sm:text-xs text-muted-foreground tabular-nums">
 Invoice: {invoiceData.id} • {tBilingual(invoiceData.client, invoiceData.clientBn)}
                    </span>
                  </div>
                </div>
                <Badge variant="outline"className="text-warning border-warning-border/40 text-xs sm:text-xs shrink-0">
                  {invoiceData.daysOverdue} Days Past Due
                </Badge>
              </div>

              {/* Invoice Selector Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {INVOICE_DUE_PRESETS.map((inv) => (
                  <button
 key={inv.id}
 type="button"onClick={() => {
 setSelectedInvoice(inv.id)
 setReminderSent(false)
                    }}
 className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
 selectedInvoice === inv.id
                        ? 'bg-warning text-foreground font-bold shadow-xs'
                        : 'bg-surface-inset text-muted-foreground border border-border hover:bg-card-elevated hover:text-foreground'
                    }`}
                  >
                    {inv.id} (৳{inv.due.toLocaleString()} Due)
                  </button>
                ))}
              </div>

              {/* Outstanding Amounts Breakdown */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 text-center">
                <div className="p-2 sm:p-3 rounded-lg bg-surface-inset border border-border">
                  <span className="text-xs sm:text-xs text-muted-foreground uppercase tabular-nums truncate block">Total Invoice</span>
                  <div className="text-xs xs:text-sm sm:text-base font-black text-white tabular-nums mt-0.5 sm:mt-1">
                    ৳ {invoiceData.total.toLocaleString()}
                  </div>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-surface-inset border border-border">
                  <span className="text-xs sm:text-xs text-success uppercase tabular-nums truncate block">Advance Paid</span>
                  <div className="text-xs xs:text-sm sm:text-base font-black text-success tabular-nums mt-0.5 sm:mt-1">
                    ৳ {invoiceData.advance.toLocaleString()}
                  </div>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-warning-surface border border-warning-border/40">
                  <span className="text-xs sm:text-xs text-warning uppercase tabular-nums truncate block">Remaining Due</span>
                  <div className="text-xs xs:text-sm sm:text-base font-black text-warning tabular-nums mt-0.5 sm:mt-1">
                    ৳ {invoiceData.due.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* WhatsApp Reminder Dispatch Simulation */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-surface-inset border border-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-semibold flex items-center gap-1.5 text-xs sm:text-xs">
                    <MessageSquare className="h-3.5 w-3.5 text-success shrink-0"/> WhatsApp Payment Reminder
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{invoiceData.phone}</span>
                </div>

                <div className="p-2.5 sm:p-3 rounded-lg bg-surface-inset border border-border text-xs sm:text-xs text-muted-foreground italic leading-relaxed">
                  &ldquo;{locale === 'bn' ? invoiceData.msgBn : invoiceData.msgEn}&rdquo;
                </div>

                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 pt-1">
                  <Button
 size="sm"onClick={handleSendReminder}
 className="w-full xs:w-auto bg-success hover:bg-success text-white font-bold text-xs h-8 cursor-pointer">
                    <Send className="mr-1.5 h-3.5 w-3.5"/>
                    {reminderSent ? 'Reminder Sent!' : 'Send WhatsApp Reminder'}
                  </Button>

                  {reminderSent && (
                    <span className="text-xs sm:text-xs text-success font-semibold flex items-center gap-1 animate-in fade-in-0">
                      <CheckCircle2 className="h-3.5 w-3.5"/> Delivered to Client
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Text (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-6 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-warning-border/30 bg-warning/10 text-warning text-xs font-bold uppercase tracking-wider bangla-text">
              <CreditCard className="h-3.5 w-3.5 shrink-0"/>
              <span>{tBilingual('Automated Dues Recovery', 'বকেয়া বিল উদ্ধার')}</span>
            </div>

            <h3 className="text-2xl xs:text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight bangla-text">
              {tBilingual(
                'Never Lose Track of Customer Dues.',
                'গ্রাহকদের বাকি টাকার হিসাব আর কখনোই ভুলবেন না।'
              )}
            </h3>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed bangla-text">
              {tBilingual(
                'In the printing business, cash flow is king. PrintERP automatically sorts your accounts receivable into 15-day, 30-day, and 60-day aging buckets and lets you dispatch polite WhatsApp and SMS reminders with a single click.',
                'প্রেসের লাভ আটকে থাকে কাস্টমারের বাকি টাকায়। প্রিন্টইআরপি স্বয়ংক্রিয়ভাবে কার কাছে কত টাকা বাকি আছে তা হিসাব রাখে এবং ১ ক্লিকে গ্রাহকের হোয়াটসঅ্যাপে ভদ্র তাগাদার মেসেজ পাঠায়।'
              )}
            </p>

            <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-foreground">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-warning shrink-0"/>
                <span>Supports Cash, bKash TrxID, Nagad, and Bank Deposits</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-warning shrink-0"/>
                <span>Instant printable traditional Money Receipt (MR) for client record</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-warning shrink-0"/>
                <span>Credit limit threshold locks before high-value jobs are printed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}