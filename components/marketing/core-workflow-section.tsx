'use client'

import React, { useState } from 'react'
import {
  FileText,
  CheckCircle2,
  Palette,
  Printer,
  Boxes,
  Hammer,
  ShieldCheck,
  Truck,
  CreditCard,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

export function CoreWorkflowSection() {
  const { tBilingual } = useI18n()
  const [selectedStepIndex, setSelectedStepIndex] = useState(0)

  const WORKFLOW_STEPS = [
    {
      step: '01',
      titleEn: 'Quotation & SFT Estimation',
      titleBn: 'কোটেশন ও স্কয়ারফিট হিসাব',
      icon: FileText,
      shortEn: 'Instant SFT',
      shortBn: 'স্কয়ারফিট কোটেশন',
      detailEn: 'Enter width, height, quantity, and media type. PrintFlow instantly calculates total square footage, applies customer tier rates (Retail, Reseller, Corporate), adds grommets/finishing, and outputs a branded PDF quote.',
      detailBn: 'দৈর্ঘ্য, প্রস্থ, পরিমাণ ও মেটেরিয়াল সিলেক্ট করলেই মুহূর্তেই স্কয়ারফিট বের হয়ে কাস্টমার টায়ার অনুযায়ী (খুচরা, পাইকারি, কর্পোরেট) সঠিক রেট ও ফিনিশিং যোগ করে ব্র্যান্ডেড পিডিএফ কোটেশন তৈরি হয়।',
      mockData: {
        badge: 'QUOTATION #QT-2026-114',
        metric1Label: 'Total Area',
        metric1Val: '20ft × 10ft = 200 SFT',
        metric2Label: 'Pricing Tier',
        metric2Val: 'Reseller (৳ 90 / SFT)',
        metric3Label: 'Estimated Bill',
        metric3Val: '৳ 18,000 + ৳ 500 Finishing',
      },
    },
    {
      step: '02',
      titleEn: 'Digital Proof & Client Approval',
      titleBn: 'ডিজিটাল প্রুফ ও ক্লায়েন্ট অনুমোদন',
      icon: Palette,
      shortEn: 'Proof Approval',
      shortBn: 'প্রুফ অনুমোদন',
      detailEn: 'Prepress designers upload high-resolution digital proofs. Send an instant approval link to customer WhatsApp or SMS. Work orders are locked until final client sign-off is captured.',
      detailBn: 'ডিজাইনার প্রুফ ফাইল আপলোড করে ১ ক্লিকে গ্রাহকের হোয়াটসঅ্যাপে অনুমোদন লিংক পাঠিয়ে দেন। গ্রাহক সাইন-অফ দেওয়ার পরেই অর্ডারটি মেশিনে প্রিন্টের জন্য অনুমোদিত হয়।',
      mockData: {
        badge: 'PROOF APPROVAL',
        metric1Label: 'Artwork File',
        metric1Val: 'Apex_Backlit_Final_v2.tif',
        metric2Label: 'Color Profile',
        metric2Val: 'CMYK • 150 DPI Full Scale',
        metric3Label: 'Approval Status',
        metric3Val: 'Client Approved via Mobile Link',
      },
    },
    {
      step: '03',
      titleEn: 'Machine Floor Queue & Ticketing',
      titleBn: 'মেশিন ফ্লোর কিউ ও জব টিকিট',
      icon: Printer,
      shortEn: 'Machine Queue',
      shortBn: 'মেশিন প্রোডাকশন',
      detailEn: 'Convert approved orders into digital job tickets assigned to Flora Polaris, Konica Minolta, CNC router, or Eco-Solvent beds. Operators see exact roll specs, pass count, and priority tags.',
      detailBn: 'অনুমোদিত অর্ডার স্বয়ংক্রিয়ভাবে ফ্লোরা পোলারিস, কনিকা মিনোল্টা বা সিএনসি রাউটারে জব টিকিট হিসেবে পৌঁছে যায়। অপারেটর স্ক্রিনেই দেখতে পান রোল সাইজ ও প্রায়োরিটি।',
      mockData: {
        badge: 'JOB TICKET #JB-2026-089',
        metric1Label: 'Assigned Machine',
        metric1Val: 'Flora Polaris 512i (Bed #1)',
        metric2Label: 'Print Mode',
        metric2Val: '4-Pass Backlit High Density',
        metric3Label: 'Lead Operator',
        metric3Val: 'Md. Faruk Hossain (Checked In)',
      },
    },
    {
      step: '04',
      titleEn: 'Roll Media Deduction & Scrap Salvage',
      titleBn: 'রোল স্টক সমন্বয় ও স্ক্র্যাপ সংরক্ষণ',
      icon: Boxes,
      shortEn: 'Roll Stock & Scrap',
      shortBn: 'রোল স্টক ও অপচয়',
      detailEn: 'The required square footage is automatically deducted from the designated master roll. Any salvageable offcut (e.g. 4ft × 10ft remnant) is cataloged into scrap inventory instead of being wasted.',
      detailBn: 'নির্দিষ্ট রোল থেকে প্রয়োজনীয় স্কয়ারফিট স্বয়ংক্রিয়ভাবে স্টক থেকে কমে যায়। কাটিংয়ের পর বেঁচে যাওয়া ৪×১০ ফুটের ব্যবহার উপযোগী অংশ স্ক্র্যাপ স্টকে জমা রাখা হয়।',
      mockData: {
        badge: 'INVENTORY ALLOCATION',
        metric1Label: 'Master Roll',
        metric1Val: 'Star Flex Backlit (10ft × 164ft)',
        metric2Label: 'Deducted Area',
        metric2Val: '200 SFT Allocated to Job',
        metric3Label: 'Salvaged Remnant',
        metric3Val: '4ft × 10ft (40 SFT) Saved to Scrap',
      },
    },
    {
      step: '05',
      titleEn: 'Fabrication, Finishing & Eyelets',
      titleBn: 'ফ্যাব্রিকেশন, ফিনিশিং ও আইলেট রিং',
      icon: Hammer,
      shortEn: 'Finishing & Fit',
      shortBn: 'ফিনিশিং ও ফিটিং',
      detailEn: 'Track floor finishing: metal grommet eyelets every 2 feet, double-folded heat welded borders, acrylic letter channel bending, or LED module assembly on ACP panels.',
      detailBn: 'প্রিন্টের পর ফিনিশিং ট্র্যাকিং: ২ ফুট পর পর মেটাল আইলেট রিং, হিট ওয়েল্ডিং বর্ডার অথবা এসিপি বোর্ডে এক্রিলিক বর্ণ ও এলইডি মডিউল ওয়্যারিং সম্পন্ন।',
      mockData: {
        badge: 'FINISHING FLOOR',
        metric1Label: 'Grommets / Eyelets',
        metric1Val: '2-ft Spacing (30 Brass Eyelets)',
        metric2Label: 'Border Finish',
        metric2Val: '2-inch Double Hem Welded',
        metric3Label: 'Fitter Status',
        metric3Val: 'Sajib Mia • Finishing Ready',
      },
    },
    {
      step: '06',
      titleEn: 'Quality Control (QC) Signoff',
      titleBn: 'কোয়ালিটি কন্ট্রোল (কিউসি) ইন্সপেকশন',
      icon: ShieldCheck,
      shortEn: 'QC Inspection',
      shortBn: 'কোয়ালিটি চেক',
      detailEn: 'Mandatory quality check before packaging. Inspect color saturation, banding, nozzle dropouts, edge seams, and lighting pass for backlit signs to ensure zero customer rejections.',
      detailBn: 'প্যাকেজিংয়ের আগে বাধ্যতামূলক কোয়ালিটি চেক। কালার স্যাচুরেশন, নজেল ড্রপআউট ও আইলেট রিংয়ের স্থায়িত্ব পরীক্ষা করে শতভাগ নিখুঁত ডেলিভারি নিশ্চিত করা।',
      mockData: {
        badge: 'QC INSPECTION PASSED',
        metric1Label: 'Print Quality',
        metric1Val: 'Zero Banding • 100% CMYK Pass',
        metric2Label: 'Dimensional Accuracy',
        metric2Val: 'Exact 20ft 0in × 10ft 0in',
        metric3Label: 'Inspector',
        metric3Val: 'Floor Manager Sign-Off',
      },
    },
    {
      step: '07',
      titleEn: 'Delivery Challan & Dispatch',
      titleBn: 'ডেলিভারি চালান ও অন-সাইট প্রেরণ',
      icon: Truck,
      shortEn: 'Delivery Challan',
      shortBn: 'ডেলিভারি চালান',
      detailEn: 'Generate official NBR Mushak 6.3 delivery challans with sequential numbering. Assign van drivers or courier services. Capture mobile digital signatures upon handover.',
      detailBn: 'ধারাবাহিক নম্বরযুক্ত অফিসিয়াল ডেলিভারি চালান প্রিন্ট। কাভার্ড ভ্যান বা কুরিয়ারে মালামাল পাঠিয়ে গ্রাহকের মোবাইল ডিজিটাল রিসিভিং সাইন গ্রহণ।',
      mockData: {
        badge: 'DELIVERY CHALLAN #DC-2026-089',
        metric1Label: 'Challan Status',
        metric1Val: 'Dispatched via Pickup Van #Dhaka-Metro-11',
        metric2Label: 'Delivery Destination',
        metric2Val: 'Gulshan-2 Retail Showroom Site',
        metric3Label: 'Receiving Proof',
        metric3Val: 'Digital Sign & Photo Attached',
      },
    },
    {
      step: '08',
      titleEn: 'Payment Settlement & Dues Ledger',
      titleBn: 'পেমেন্ট আদায় ও বকেয়া লেজার সমন্বয়',
      icon: CreditCard,
      shortEn: 'Payment & Dues',
      shortBn: 'পেমেন্ট ও বকেয়া',
      detailEn: 'Reconcile cash collected at delivery counter, bKash/Nagad merchant TrxID deposits, or bank transfers. Send instant payment receipts and update the general financial ledger.',
      detailBn: 'ডেলিভারি কাউন্টারে ক্যাশ, বিকাশ/নগদ মার্চেন্ট TrxID অথবা ব্যাংক ট্রান্সফার সমন্বয়। গ্রাহককে স্বয়ংক্রিয় মানি রিসিট এসএমএস ও লেজার আপডেট।',
      mockData: {
        badge: 'PAYMENT SETTLEMENT',
        metric1Label: 'Total Invoice',
        metric1Val: '৳ 18,500 Paid in Full',
        metric2Label: 'Payment Methods',
        metric2Val: '৳ 10,000 bKash + ৳ 8,500 Cash',
        metric3Label: 'Net Job Margin',
        metric3Val: '৳ 7,420 Pure Net Profit (40%)',
      },
    },
  ]

  const activeStep = WORKFLOW_STEPS[selectedStepIndex]
  const ActiveIcon = activeStep.icon

  return (
    <section id="workflow" className="py-14 sm:py-20 bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{tBilingual('End-to-End Production Workflow', 'অর্ডার থেকে পেমেন্ট পর্যন্ত পূর্ণাঙ্গ ধাপ')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {tBilingual(
              'How Modern Print Shops Operate on PrintFlow.',
              'প্রিন্টফ্লোতে আধুনিক প্রেস কীভাবে পরিচালিত হয়।'
            )}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {tBilingual(
              '8 fully connected operational stages. Click any step below to see how data flows automatically without phone calls or paper slips.',
              '৮টি সংযুক্ত অপারেশনাল ধাপ। যেকোনো ধাপে ক্লিক করে দেখুন কীভাবে কোনো ফোন কল বা কাগজের চিরকুট ছাড়াই কাজ সম্পন্ন হয়।'
            )}
          </p>
        </div>

        {/* 8-Step Interactive Pipeline Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {WORKFLOW_STEPS.map((step, idx) => {
            const Icon = step.icon
            const isSelected = idx === selectedStepIndex
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedStepIndex(idx)}
                className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20'
                    : 'border-border bg-muted/30 text-foreground hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected
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
                  <span className="text-xs font-bold text-foreground block truncate">
                    {tBilingual(step.shortEn, step.shortBn)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Detailed Interactive Preview Card for Selected Step */}
        <div className="rounded-xl border border-border bg-muted/20 p-5 sm:p-7 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                <ActiveIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary font-mono">
                    STAGE {activeStep.step}
                  </span>
                  <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    {activeStep.mockData.badge}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  {tBilingual(activeStep.titleEn, activeStep.titleBn)}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">
                Step {selectedStepIndex + 1} of {WORKFLOW_STEPS.length}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedStepIndex((prev) => (prev + 1) % WORKFLOW_STEPS.length)}
                className="h-8 text-xs font-semibold cursor-pointer border-input"
              >
                <span>{tBilingual('Next Stage', 'পরবর্তী ধাপ')}</span>
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {tBilingual(activeStep.detailEn, activeStep.detailBn)}
          </p>

          {/* 3 Live Metric Tiles for the Active Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="p-3.5 rounded-lg bg-card border border-border shadow-2xs">
              <span className="text-xs text-muted-foreground block uppercase font-medium">
                {activeStep.mockData.metric1Label}
              </span>
              <span className="font-bold text-foreground text-sm mt-1 block">
                {activeStep.mockData.metric1Val}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-card border border-border shadow-2xs">
              <span className="text-xs text-muted-foreground block uppercase font-medium">
                {activeStep.mockData.metric2Label}
              </span>
              <span className="font-bold text-primary text-sm mt-1 block">
                {activeStep.mockData.metric2Val}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-card border border-border shadow-2xs">
              <span className="text-xs text-muted-foreground block uppercase font-medium">
                {activeStep.mockData.metric3Label}
              </span>
              <span className="font-bold text-success text-sm mt-1 block">
                {activeStep.mockData.metric3Val}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
