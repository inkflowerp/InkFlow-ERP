'use client'

import React from 'react'
import {
  Printer,
  Layers,
  Image,
  Tag,
  Package,
  Sparkles,
  Zap,
  Building,
  Shield,
  Hammer,
  Car,
  Wrench,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function IndustrySolutionsSection() {
  const { tBilingual } = useI18n()

  const INDUSTRIES = [
    { nameEn: 'Digital Print', nameBn: 'ডিজিটাল প্রিন্ট', icon: Printer },
    { nameEn: 'Offset', nameBn: 'অফসেট প্রেস', icon: Layers },
    { nameEn: 'Flex & Banner', nameBn: 'ফ্লেক্স ও ব্যানার', icon: Image },
    { nameEn: 'Sticker & Label', nameBn: 'স্টিকার ও লেবেল', icon: Tag },
    { nameEn: 'Packaging', nameBn: 'প্যাকেজিং ও বক্স', icon: Package },
    { nameEn: 'Acrylic', nameBn: 'এক্রিলিক কাজ', icon: Sparkles },
    { nameEn: 'LED Signage', nameBn: 'এলইডি সাইনেজ', icon: Zap },
    { nameEn: 'ACP', nameBn: 'এসিপি বোর্ড', icon: Building },
    { nameEn: 'PVC', nameBn: 'পিভিসি ফোম বোর্ড', icon: Shield },
    { nameEn: 'Metal', nameBn: 'মেটাল কাঠামো', icon: Hammer },
    { nameEn: 'Vehicle Branding', nameBn: 'গাড়ি ব্র্যান্ডিং', icon: Car },
    { nameEn: 'Installation', nameBn: 'সাইট ফিটিং ও স্থাপন', icon: Wrench },
  ]

  return (
    <section id="industries" className="py-14 sm:py-20 bg-muted/40 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span>{tBilingual('Industries', 'শিল্প খাত')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {tBilingual('Built for Print & Signage Businesses.', 'প্রিন্ট ও সাইনেজ ব্যবসার জন্য বিশেষভাবে তৈরি।')}
          </h2>
        </div>

        {/* 12 Compact Cards — Minimal without long descriptions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
          {INDUSTRIES.map((ind, idx) => {
            const Icon = ind.icon
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-3.5 flex flex-col items-center justify-center text-center space-y-2 shadow-2xs hover:border-primary/40 hover:bg-card/80 transition-all"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                  {tBilingual(ind.nameEn, ind.nameBn)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
