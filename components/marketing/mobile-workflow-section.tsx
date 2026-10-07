'use client'

import React, { useState } from 'react'
import {
  Smartphone,
  Printer,
  Boxes,
  Users,
  Truck,
  CreditCard,
  QrCode,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

export function MobileWorkflowSection() {
  const { tBilingual } = useI18n()
  const [mobileScreen, setMobileScreen] = useState<'floor' | 'qr' | 'challan'>('floor')

  const HIGHLIGHTS = [
    {
      titleEn: 'Zero App Installation Needed',
      titleBn: 'অ্যাপ ইনস্টলের ঝামেলামুক্ত',
      descEn: 'Runs instantly in Google Chrome, Safari, or Samsung Internet. No Play Store downloads, APK updates, or heavy device storage needed.',
      descBn: 'যেকোনো মোবাইল ব্রাউজারে নিমিষেই চালু হয়। গুগল প্লে স্টোর থেকে ভারী অ্যাপ নামানোর কোনো প্রয়োজন নেই।',
      icon: Smartphone,
    },
    {
      titleEn: 'Floor Machine Operators',
      titleBn: 'কারখানা ফ্লোর অপারেটর টার্মিনাল',
      descEn: 'Operators with ink-stained hands can view job tickets, check roll allocations, and mark print completion with one big mobile tap.',
      descBn: 'অপারেটররা মেশিনের পাশে দাঁড়িয়ে সহজেই জব টিকিট দেখে এক ট্যাপে কাজ সম্পন্ন বা রোল পরিবর্তন রেকর্ড করতে পারেন।',
      icon: Printer,
    },
    {
      titleEn: 'Mobile QR Clock-In',
      titleBn: 'স্মার্টফোনে কিউআর হাজিরা',
      descEn: 'Workers clock in using their phone camera or a mounted shop tablet. Anti-proxy geofencing verifies shop presence.',
      descBn: 'ফোনের ক্যামেরা দিয়ে কিউআর স্ক্যান করে দ্রুত উপস্থিতি নিশ্চিত। প্রক্সি হাজিরা প্রতিরোধের নিখুঁত ব্যবস্থা।',
      icon: QrCode,
    },
    {
      titleEn: 'Delivery Drivers & Field Fitters',
      titleBn: 'ডেলিভারি ও সাইট ফিটিং টিম',
      descEn: 'Drivers access destination maps, call client contact persons, and collect on-screen digital signatures upon delivery.',
      descBn: 'চালান নিয়ে গিয়ে কাস্টমারের ফোনে ডিজিটাল স্বাক্ষর নেওয়া এবং সাইট ইনস্টলেশনের ছবি সাথে সাথে আপলোড।',
      icon: Truck,
    },
  ]

  return (
    <section className="py-14 sm:py-20 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Smartphone className="h-3.5 w-3.5" />
            <span>{tBilingual('Mobile Web for Floor Staff', 'স্মার্টফোনে ফ্লোর অপারেটর টার্মিনাল')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {tBilingual(
              'Your Entire Print Shop in the Palm of Your Hand.',
              'আপনার পুরো প্রিন্টিং ব্যবসা আপনার হাতের মুঠোয়।'
            )}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {tBilingual(
              'Staff on the press floor don’t sit in front of desktop computers. PrintFlow is engineered for mobile phones, budget tablets, and field delivery vans.',
              'কারখানার ফ্লোরে বা সাইট ফিটিংয়ে কম্পিউটার থাকে না। প্রিন্টফ্লো সাধারণ স্মার্টফোনে সহজে ব্যবহারের জন্য বিশেষভাবে তৈরি।'
            )}
          </p>
        </div>

        {/* 2-Column Showcase: Left Features + Right Mobile Device Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto items-center">
          {/* Left: 4 Action Pillars (7 cols) */}
          <div className="lg:col-span-7 space-y-3.5">
            {HIGHLIGHTS.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={idx}
                  className="bg-card border border-border rounded-xl p-4 flex items-start gap-3.5 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-foreground">
                      {tBilingual(item.titleEn, item.titleBn)}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {tBilingual(item.descEn, item.descBn)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right: Interactive Smartphone Simulation (5 cols) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-xs rounded-3xl border-2 border-border bg-card p-3 shadow-md space-y-3">
              {/* Phone Speaker Notch & Status Bar */}
              <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-border text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-foreground">09:41</span>
                <div className="h-3 w-16 bg-muted rounded-full mx-auto" />
                <span className="text-success font-semibold">4G LTE</span>
              </div>

              {/* Mobile View Screen Switcher */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMobileScreen('floor')}
                  className={`py-1 rounded text-center transition-colors cursor-pointer ${
                    mobileScreen === 'floor'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground'
                  }`}
                >
                  Floor
                </button>
                <button
                  type="button"
                  onClick={() => setMobileScreen('qr')}
                  className={`py-1 rounded text-center transition-colors cursor-pointer ${
                    mobileScreen === 'qr'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground'
                  }`}
                >
                  QR Scan
                </button>
                <button
                  type="button"
                  onClick={() => setMobileScreen('challan')}
                  className={`py-1 rounded text-center transition-colors cursor-pointer ${
                    mobileScreen === 'challan'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground'
                  }`}
                >
                  Challan
                </button>
              </div>

              {/* Mobile Screen Content */}
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5 text-xs">
                {mobileScreen === 'floor' && (
                  <div className="space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border">
                      <span className="font-bold text-foreground font-mono">Flora Bed #1</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-success-surface text-success">
                        Printing (75%)
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-card border border-border space-y-1">
                      <span className="font-bold text-foreground block">
                        Job #JB-2026-089
                      </span>
                      <span className="text-muted-foreground block">
                        20ft × 10ft Star Flex Backlit
                      </span>
                      <span className="font-mono text-primary font-semibold block">
                        Roll: #BK-10-08
                      </span>
                    </div>

                    <Button className="w-full h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
                      <span>Mark Printed &amp; Ready</span>
                    </Button>
                  </div>
                )}

                {mobileScreen === 'qr' && (
                  <div className="space-y-2 animate-in fade-in duration-150 text-center">
                    <div className="h-28 w-28 mx-auto flex items-center justify-center border-2 border-dashed border-primary/40 rounded-xl bg-card">
                      <QrCode className="h-16 w-16 text-primary" />
                    </div>
                    <div>
                      <span className="font-bold text-foreground block">
                        Scan Shop Terminal
                      </span>
                      <span className="text-muted-foreground text-xs block">
                        Point camera at entrance badge
                      </span>
                    </div>
                    <div className="p-1.5 rounded bg-success-surface text-success font-semibold text-xs border border-success-border">
                      Checked-In: 09:02 AM (On-Time)
                    </div>
                  </div>
                )}

                {mobileScreen === 'challan' && (
                  <div className="space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border">
                      <span className="font-bold text-foreground font-mono">Challan #DC-089</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary">
                        Gulshan-2
                      </span>
                    </div>

                    <div className="p-2 rounded bg-card border border-border space-y-0.5">
                      <span className="font-bold text-foreground block">Apex Branding</span>
                      <span className="text-muted-foreground block">Bill: ৳ 18,000 (Due: ৳ 8,000)</span>
                    </div>

                    <div className="h-12 rounded border border-dashed border-border bg-card flex items-center justify-center text-muted-foreground text-xs">
                      Customer Signature Captured ✓
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Home Indicator Bar */}
              <div className="h-1 w-24 bg-border rounded-full mx-auto mt-2" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
