'use client'

import React from 'react'
import {
  FileCheck2,
  Boxes,
  Scissors,
  MonitorCheck,
  CreditCard,
  QrCode,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function WithPrintFlowSection() {
  const { tBilingual } = useI18n()

  const SOLUTIONS = [
    {
      categoryEn: 'Digital Job Tickets with Barcode',
      categoryBn: 'ডিজিটাল বারকোডযুক্ত জব টিকিট',
      descEn: 'Exact width, height, material code, eyelet spacing, and proof preview on one clean screen. Zero misprints, zero costly errors.',
      descBn: 'নিখুঁত মাপ, মেটেরিয়াল কোড, আইলেট রিং ব্যবধান ও প্রুফ ফাইল এক স্ক্রিনে। কোনো ভুল প্রিন্ট বা বাড়তি খরচের সুযোগ নেই।',
      icon: FileCheck2,
      resultEn: 'Zero Misprints',
      resultBn: '১০০% সঠিক প্রিন্ট',
    },
    {
      categoryEn: 'Real-Time Roll Stock Tracking',
      categoryBn: 'রোল স্টক ও লাইভ স্কয়ারফিট ট্র্যাকিং',
      descEn: 'Master rolls tracked by width and length (ft/m). Square footage auto-deducted upon print completion with automated low-stock warnings.',
      descBn: 'রোলের প্রস্থ ও দৈর্ঘ্য অনুযায়ী অবশিষ্ট স্কয়ারফিট লাইভ কমে যায়। স্টক নির্দিষ্ট সীমার নিচে নামলে স্বয়ংক্রিয় সতর্কবার্তা আসে।',
      icon: Boxes,
      resultEn: 'Never Run Out Mid-Job',
      resultBn: 'কখনই কাজ আটকে থাকে না',
    },
    {
      categoryEn: 'Scrap & Offcut Salvage Engine',
      categoryBn: 'কাটিং স্ক্র্যাপ সংরক্ষণ ও ব্যবহার',
      descEn: 'Save 3ft to 5ft remnant roll cutoffs into active scrap inventory. Operators reuse them for small stickers and standees, turning waste into pure profit.',
      descBn: 'অর্ডারের পর বেঁচে যাওয়া ৩-৫ ফুটের টুকরো স্ক্র্যাপ হিসেবে সিস্টেমে জমা থাকে। ছোট স্টিকার ও স্ট্যান্ডিতে ব্যবহার করে বাড়তি লাভ হয়।',
      icon: Scissors,
      resultEn: 'Save ৳ 20,000+ / Month',
      resultBn: 'মাসে ২০,০০০+ টাকা সাশ্রয়',
    },
    {
      categoryEn: 'Live Machine Production Screen',
      categoryBn: 'ফ্লোর স্ক্রিনে লাইভ প্রোডাকশন ট্র্যাকিং',
      descEn: 'Floor managers and front desk see which machine is running, which jobs are queued, and what is finished without placing a single phone call.',
      descBn: 'কোন মেশিনে প্রিন্ট চলছে, কোনটা লাইনে আছে এবং কোনটা ডেলিভারির জন্য প্রস্তুত তা এক নজরে দৃশ্যমান। কাউকে ফোন দেওয়ার প্রয়োজন নেই।',
      icon: MonitorCheck,
      resultEn: 'Zero Phone Chasing',
      resultBn: 'অবিরাম ফোন কলের অবসান',
    },
    {
      categoryEn: '1-Click WhatsApp Due Collection',
      categoryBn: '১-ক্লিকে হোয়াটসঅ্যাপে বকেয়া আদায়',
      descEn: 'Clear overdue aging reports with 1-click polite reminder messages sent to customer WhatsApp with total bill, advance, and bKash QR code.',
      descBn: 'গ্রাহকভিত্তিক বকেয়া হিসাব এবং মাত্র ১ ক্লিকে হোয়াটসঅ্যাপে বিল ও বিকাশ কিউআর কোডসহ ভদ্র পেমেন্ট রিমাইন্ডার পাঠানোর সুবিধা।',
      icon: CreditCard,
      resultEn: 'Faster Cash Recovery',
      resultBn: 'দ্রুত বকেয়া টাকা আদায়',
    },
    {
      categoryEn: 'Smart QR Code Attendance Roster',
      categoryBn: 'স্মার্ট কিউআর হাজিরা ও ওভারটাইম হিসাব',
      descEn: 'Operators clock in with front-camera QR scan on mobile or floor tablet. Geofenced to shop location with automatic overtime and salary calculation.',
      descBn: 'মোবাইল বা ট্যাবলেটের ক্যামেরায় কিউআর স্ক্যান করে মুহূর্তেই হাজিরা। প্রক্সি মুক্ত, নিখুঁত সময় ও সঠিক ওভারটাইম বেতন তৈরি।',
      icon: QrCode,
      resultEn: 'Accurate Payroll',
      resultBn: 'স্বচ্ছ বেতন ও শান্তি',
    },
  ]

  return (
    <section className="py-14 sm:py-20 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success-surface text-success border border-success-border">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{tBilingual('The Solution: Powered by PrintFlow', 'প্রিন্টফ্লো সহ আধুনিক ডিজিটাল সমাধান')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {tBilingual(
              'One Connected Operating System That Puts You in Total Control.',
              'এক সংযুক্ত সিস্টেম যা আপনার প্রেসের সম্পূর্ণ নিয়ন্ত্রণ এনে দেয় আপনার হাতে।'
            )}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {tBilingual(
              'Replace chaos with precision. See how every part of your print shop connects seamlessly from quotation to delivery challan.',
              'বিশৃঙ্খলার অবসান ঘটিয়ে নিখুঁত নির্ভুল গতি আনুন। কোটেশন থেকে শুরু করে ডেলিভারি চালান পর্যন্ত সব কাজ এক সাথে যুক্ত।'
            )}
          </p>
        </div>

        {/* 6 Solution Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-w-6xl mx-auto">
          {SOLUTIONS.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:border-primary/40 transition-all space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-success bg-success-surface px-2.5 py-0.5 rounded-full border border-success-border">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{tBilingual(item.resultEn, item.resultBn)}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground">
                    {tBilingual(item.categoryEn, item.categoryBn)}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tBilingual(item.descEn, item.descBn)}
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
