'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { HeroVisual } from '@/components/marketing/hero-visual'
import type { LandingHeroConfig } from '@/types/landing-page.types'

interface HeroSectionProps {
  config?: LandingHeroConfig
}

export function HeroSection({ config }: HeroSectionProps) {
  const { tBilingual } = useI18n()

  const eyebrowEn = config?.eyebrowEn || 'Print & Signage Management Software'
  const eyebrowBn = config?.eyebrowBn || 'প্রিন্ট ও সাইনেজ ম্যানেজমেন্ট সফটওয়্যার'

  const headlineEn = config?.headlineEn || 'Run Your Print & Signage Business Without the Chaos.'
  const headlineBn = config?.headlineBn || 'আপনার প্রিন্ট ব্যবসার সব কাজ এক জায়গায় পরিচালনা করুন।'

  const descEn =
    config?.descriptionEn ||
    'Sales, design, production, inventory, employees, delivery and payments — connected in one place.'
  const descBn =
    config?.descriptionBn ||
    'সেলস, ডিজাইন, প্রোডাকশন, ইনভেন্টরি, কর্মচারী, ডেলিভারি ও পেমেন্ট — সব এক সাথে সংযুক্ত।'

  const primaryCtaEn = config?.primaryCtaEn || 'Start Free Trial'
  const primaryCtaBn = config?.primaryCtaBn || 'ফ্রি ট্রায়াল শুরু করুন'
  const primaryCtaLink = config?.primaryCtaLink || '/register'

  const secondaryCtaEn = config?.secondaryCtaEn || 'See How It Works'
  const secondaryCtaBn = config?.secondaryCtaBn || 'কাজের ধাপ দেখুন'
  const secondaryCtaLink = config?.secondaryCtaLink || '#workflow'

  return (
    <section className="relative pt-24 pb-14 sm:pt-32 sm:pb-18 md:pt-36 md:pb-20 bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        {/* Hero Text */}
        <div className="text-center max-w-4xl mx-auto space-y-4 sm:space-y-5">
          {/* Eyebrow */}
          <div className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 tracking-wider">
            <span>{tBilingual(eyebrowEn, eyebrowBn)}</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-foreground tracking-tight leading-[1.15] sm:leading-[1.1]">
            {tBilingual(headlineEn, headlineBn)}
          </h1>

          {/* Supporting Text */}
          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto font-normal leading-relaxed">
            {tBilingual(descEn, descBn)}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md sm:max-w-none mx-auto">
            <Link href={primaryCtaLink} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-11 px-7 text-sm sm:text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer">
                <span>{tBilingual(primaryCtaEn, primaryCtaBn)}</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <a href={secondaryCtaLink} className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-11 px-6 text-sm sm:text-base font-semibold border-input bg-card text-foreground hover:bg-muted cursor-pointer"
              >
                <PlayCircle className="mr-2 h-4 w-4 text-primary" />
                <span>{tBilingual(secondaryCtaEn, secondaryCtaBn)}</span>
              </Button>
            </a>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="pt-2">
          <HeroVisual />
        </div>
      </div>
    </section>
  )
}
