'use client'

import React from 'react'
import Link from 'next/link'
import {
 ArrowRight,
 PlayCircle,
 Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { useDemoModal } from '@/components/marketing/demo-modal-context'
import { TRUST_TAGS } from '@/lib/marketing/marketing-data'
import { HeroVisual } from '@/components/marketing/hero-visual'

interface HeroSectionProps {
 onOpenDemo?: () => void
}

export function HeroSection({ onOpenDemo }: HeroSectionProps) {
 const { tBilingual } = useI18n()
 const demoModalCtx = useDemoModal()

 const handleOpenDemo = onOpenDemo || demoModalCtx?.openDemo

 return (
    <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-20 md:pt-40 md:pb-24 bg-card overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14">
        {/* Hero Text Content */}
        <div className="text-center max-w-4xl mx-auto space-y-5 sm:space-y-6">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary bg-primary/10 text-primary border border-primary/20/70 border-border/60 uppercase tracking-wider">
            <span>
              {tBilingual(
                'PRINT & SIGNAGE BUSINESS MANAGEMENT',
                'প্রিন্ট ও সাইনেজ বিজনেস ম্যানেজমেন্ট'
              )}
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-foreground tracking-tight leading-[1.15] sm:leading-[1.1] bangla-text">
            {tBilingual(
              'Run Your Print Business Without the Chaos.',
              'আপনার প্রিন্ট ও সাইনেজ ব্যবসা চালান — কম ঝামেলায়, বেশি নিয়ন্ত্রণে।'
            )}
          </h1>

          {/* Subheadline */}
          <p className="text-sm sm:text-lg text-muted-foreground max-w-3xl mx-auto font-normal leading-relaxed bangla-text">
            {tBilingual(
              'Manage quotations, orders, production, materials, payments, delivery and profitability from one connected platform built for print and signage businesses in Bangladesh.',
              'কোটেশন, অর্ডার, প্রোডাকশন, মেটেরিয়াল, পেমেন্ট, ডেলিভারি ও প্রফিটেবিলিটি পরিচালনা করুন এক প্ল্যাটফর্মে—যা বিশেষভাবে বাংলাদেশের প্রিন্ট ও সাইনেজ ব্যবসার জন্য তৈরি।'
            )}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5 pt-2 max-w-md sm:max-w-none mx-auto">
            <Link href="/register"className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-12 px-7 text-sm sm:text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer bangla-text">
                <span>{tBilingual('Start Free Trial', 'ফ্রি ট্রায়াল শুরু করুন')}</span>
                <ArrowRight className="ml-2 h-4 w-4"/>
              </Button>
            </Link>

            <a href="#how-it-works"className="w-full sm:w-auto">
              <Button
 variant="outline"className="w-full sm:w-auto h-12 px-6 text-sm sm:text-base font-semibold border-input bg-card text-foreground hover:bg-muted cursor-pointer bangla-text">
                <PlayCircle className="mr-2 h-4 w-4 text-primary"/>
                <span>{tBilingual('See How It Works', 'কাজের ধাপ দেখুন')}</span>
              </Button>
            </a>

            {handleOpenDemo && (
              <Button
 type="button"variant="ghost"onClick={handleOpenDemo}
 className="w-full sm:w-auto h-12 px-5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground cursor-pointer bangla-text">
                <Calendar className="mr-1.5 h-4 w-4 text-muted-foreground"/>
                <span>{tBilingual('Book a Demo', 'লাইভ ডেমো বুক করুন')}</span>
              </Button>
            )}
          </div>

          {/* Small Trust Reassurance Line */}
          <div className="pt-2 text-xs sm:text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-2">
            <span className="font-semibold text-foreground">
              {tBilingual('Built for:', 'উপযোগী:')}
            </span>
            <span>Digital Print • Offset • Flex • Signage • Fabrication • Installation</span>
          </div>
        </div>

        {/* Hero Visual: Simplified Connected Workflow Card */}
        <div className="pt-4">
          <HeroVisual />
        </div>
      </div>
    </section>
  )
}
