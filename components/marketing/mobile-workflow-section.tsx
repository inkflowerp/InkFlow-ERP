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
      descEn: 'Runs in any phone browser. No Play Store downloads or updates.',
      descBn: 'যেকোনো মোবাইল ব্রাউজারে চলে। অ্যাপ ডাউনলোডের ঝামেলা নেই।',
      icon: Smartphone,
    },
    {
      titleEn: 'Floor Machine Operators',
      titleBn: 'কারখানা ফ্লোর টার্মিনাল',
      descEn: 'View tickets and mark print completion with one big mobile tap.',
      descBn: 'এক ট্যাপে জব টিকিট দেখা ও কাজ সমাপ্তি রেকর্ড করা যায়।',
      icon: Printer,
    },
    {
      titleEn: 'Mobile QR Clock-In',
      titleBn: 'স্মার্টফোনে কিউআর হাজিরা',
      descEn: 'Phone camera or shop tablet QR scan with anti-proxy geofencing.',
      descBn: 'মোবাইল বা ট্যাবলেটের ক্যামেরায় কিউআর স্ক্যান করে দ্রুত হাজিরা।',
      icon: QrCode,
    },
    {
      titleEn: 'Delivery Drivers & Fitters',
      titleBn: 'ডেলিভারি ও সাইট ফিটিং',
      descEn: 'Delivery challans, site map routes, and client digital signatures.',
      descBn: 'চালান দেখা, গ্রাহকের ডিজিটাল সাইন ও সাইট ফিটিং ছবি আপলোড।',
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
            <span>{tBilingual('Mobile Floor Terminal', 'মোবাইল টার্মিনাল')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {tBilingual(
              'Manage Your Entire Shop From Mobile.',
              'স্মার্টফোনেই পুরো প্রেস পরিচালনা করুন।'
            )}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {tBilingual(
              'Machine operators, delivery drivers, and fitters work from any phone or tablet.',
              'অপারেটর, ডেলিভারি ভ্যান ও সাইট ফিটাররা যেকোনো সাধারণ ফোন থেকেই কাজ করেন।'
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
