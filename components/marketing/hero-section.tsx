'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  PlayCircle,
  ShieldCheck,
  Zap,
  Boxes,
  QrCode,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { HeroVisual } from '@/components/marketing/hero-visual'
import { useDemoModal } from '@/components/marketing/demo-modal-context'
import type { LandingHeroConfig } from '@/types/landing-page.types'

interface HeroSectionProps {
  config?: LandingHeroConfig
}

export function HeroSection({ config }: HeroSectionProps) {
  const { tBilingual } = useI18n()
  const { openDemo } = useDemoModal()

  const eyebrowEn =
    config?.eyebrowEn || 'Cloud ERP for Bangladesh Print & Signage'
  const eyebrowBn =
    config?.eyebrowBn || 'বাংলাদেশের প্রিন্ট ও সাইনেজ ব্যবসার আধুনিক ইআরপি'

  const headlineEn =
    config?.headlineEn || 'Stop Running Your Print Shop on Paper Slips.'
  const headlineBn =
    config?.headlineBn || 'কাগজের চিরকুট ভুলে পুরো প্রেস চালান ক্লাউডে।'

  const descEn =
    config?.descriptionEn ||
    'SFT billing, roll media stock, live machine queues, and bKash dues — all in one simple screen.'
  const descBn =
    config?.descriptionBn ||
    'স্কয়ারফিট বিলিং, রোল স্টক, মেশিনের লাইভ কিউ ও বকেয়া আদায় — সব এক সহজ স্ক্রিনে।'

  const primaryCtaEn = config?.primaryCtaEn || 'Start 14-Day Free Trial'
  const primaryCtaBn = config?.primaryCtaBn || '১৪ দিনের ফ্রি ট্রায়াল শুরু করুন'
  const primaryCtaLink = config?.primaryCtaLink || '/register'

  const secondaryCtaEn = config?.secondaryCtaEn || 'Book a Live Demo'
  const secondaryCtaBn = config?.secondaryCtaBn || 'লাইভ ডেমো দেখুন'

  return (
    <section className="relative pt-24 pb-12 sm:pt-32 sm:pb-16 md:pt-36 md:pb-20 bg-background overflow-hidden border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        {/* Hero Header */}
        <div className="text-center max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span>{tBilingual(eyebrowEn, eyebrowBn)}</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-foreground tracking-tight leading-[1.15] sm:leading-[1.1]">
            {tBilingual(headlineEn, headlineBn)}
          </h1>

          {/* Supporting Copy */}
          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto font-normal leading-relaxed">
            {tBilingual(descEn, descBn)}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1 max-w-md sm:max-w-none mx-auto">
            <Link href={primaryCtaLink} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-11 px-7 text-sm sm:text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer">
                <span>{tBilingual(primaryCtaEn, primaryCtaBn)}</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <Button
              type="button"
              variant="outline"
              onClick={openDemo}
              className="w-full sm:w-auto h-11 px-6 text-sm sm:text-base font-semibold border-input bg-card text-foreground hover:bg-muted cursor-pointer"
            >
              <Calendar className="mr-2 h-4 w-4 text-primary" />
              <span>{tBilingual(secondaryCtaEn, secondaryCtaBn)}</span>
            </Button>
          </div>

          {/* Trust Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span>{tBilingual('No Card Required', 'কার্ড ছাড়াই শুরু')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span>{tBilingual('1-Minute Setup', '১ মিনিটে চালু')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              <span>{tBilingual('100% Private Data', 'শতভাগ সুরক্ষিত ডাটা')}</span>
            </div>
          </div>
        </div>

        {/* Hero Visual Mockup Simulation */}
        <div className="pt-2">
          <HeroVisual />
        </div>

        {/* 4 Key Pillars Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto pt-2">
          <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-1">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">
                {tBilingual('Roll Stock & Scrap', 'রোল স্টক ও অপচয়')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {tBilingual('Width × Length SFT with scrap reuse.', 'প্রস্থ ও দৈর্ঘ্য স্কয়ারফিট ও অপচয় রোধ।')}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">
                {tBilingual('Live Machine Queue', 'লাইভ মেশিন কিউ')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {tBilingual('Flora, Konica & CNC floor tickets.', 'ফ্লোরা, কনিকা ও সিএনসি ফ্লোর টিকিট।')}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-1">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">
                {tBilingual('QR Staff Attendance', 'কিউআর কর্মী হাজিরা')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {tBilingual('Phone/tablet scan & live floor roster.', 'মোবাইল/ট্যাবলেট স্ক্যান ও লাইভ হাজিরা।')}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span className="text-xs font-bold text-foreground">
                {tBilingual('Challans & bKash', 'চালান ও বিকাশ আদায়')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {tBilingual('Instant delivery challans & due alerts.', 'মুহূর্তে চালান ও বিকাশ রিমাইন্ডার।')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
