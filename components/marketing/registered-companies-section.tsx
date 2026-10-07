'use client'

import React, { useRef, useState, useEffect } from 'react'
import {
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Building2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { DEFAULT_LANDING_COMPANIES } from '@/lib/marketing/landing-defaults'
import type {
  LandingCompanyConfig,
  LandingCompaniesSectionConfig,
} from '@/types/landing-page.types'

interface RegisteredCompaniesProps {
  companies?: LandingCompanyConfig[]
  config?: LandingCompaniesSectionConfig
}

export function RegisteredCompaniesSection({
  companies = [],
  config,
}: RegisteredCompaniesProps) {
  const { tBilingual } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)

  const eyebrowEn = config?.eyebrowEn || 'Verified Print Network'
  const eyebrowBn = config?.eyebrowBn || 'বিশ্বস্ত প্রিন্ট নেটওয়ার্ক'

  const headlineEn =
    config?.headlineEn || 'Trusted by Leading Print & Signage Businesses Across Bangladesh'
  const headlineBn =
    config?.headlineBn || 'সারা বাংলাদেশের শীর্ষস্থানীয় প্রিন্ট ও সাইনেজ ব্যবসার বিশ্বস্ত পছন্দ'

  const descEn =
    config?.descriptionEn ||
    'Powering high-volume commercial offset presses, digital banner houses, and acrylic signage workshops from Dhaka to Chattogram.'
  const descBn =
    config?.descriptionBn ||
    'ঢাকা, চট্টগ্রাম, বগুড়া থেকে সিলেট — বাণিজ্যিক প্রেস, ডিজিটাল শপ ও সাইন ফ্যাব্রিকেটরদের এক সংযুক্ত প্ল্যাটফর্ম।'

  // Filter approved public active companies from database/settings
  const activeDbCompanies = companies.filter(
    (c) => c.isPublic === true && c.status === 'active' && Boolean(c.name || c.logoUrl)
  )

  // If fewer than 6 companies configured, supplement with default verified Bangladesh print shops
  const displayList: LandingCompanyConfig[] =
    activeDbCompanies.length >= 4
      ? activeDbCompanies
      : [
          ...activeDbCompanies,
          ...DEFAULT_LANDING_COMPANIES.filter(
            (def) => !activeDbCompanies.some((db) => db.name.toLowerCase() === def.name.toLowerCase())
          ),
        ]

  // Duplicate list for infinite loop appearance
  const carouselItems = [...displayList, ...displayList]

  // Auto-scroll loop
  useEffect(() => {
    const el = scrollRef.current
    if (!el || isPaused) return

    const interval = setInterval(() => {
      if (!scrollRef.current) return
      const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth
      if (scrollRef.current.scrollLeft >= maxScroll / 2) {
        // Reset seamlessly to beginning of loop
        scrollRef.current.scrollLeft = 0
      } else {
        scrollRef.current.scrollLeft += 1.2
      }
    }, 25)

    return () => clearInterval(interval)
  }, [isPaused, displayList.length])

  const handleManualScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const offset = direction === 'left' ? -260 : 260
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  return (
    <section id="companies" className="py-14 sm:py-20 bg-card border-t border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 max-w-6xl mx-auto">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{tBilingual(eyebrowEn, eyebrowBn)}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {tBilingual(headlineEn, headlineBn)}
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {tBilingual(descEn, descBn)}
            </p>
          </div>

          {/* Carousel Manual Arrow Navigation */}
          <div className="flex items-center gap-2 self-start md:self-end">
            <button
              type="button"
              onClick={() => handleManualScroll('left')}
              className="h-9 w-9 rounded-lg border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title="Previous companies"
              aria-label="Previous company logos"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleManualScroll('right')}
              className="h-9 w-9 rounded-lg border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title="Next companies"
              aria-label="Next company logos"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Carousel Ribbon Container */}
        <div
          className="relative max-w-7xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Horizontal Scroll Track */}
          <div
            ref={scrollRef}
            className="flex items-center gap-3.5 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth select-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {carouselItems.map((comp, idx) => {
              const city = comp.city || 'Bangladesh'
              return (
                <div
                  key={`${comp.id}-${idx}`}
                  className="shrink-0 w-56 sm:w-64 p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 shadow-2xs transition-all hover:shadow-xs flex items-center gap-3"
                >
                  {/* Company Logo Image or Styled Monogram Badge */}
                  <div className="h-11 w-11 rounded-lg border border-border bg-muted/40 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    {comp.logoUrl && comp.logoUrl.trim() ? (
                      <img
                        src={comp.logoUrl}
                        alt={`${comp.name} logo`}
                        className="h-full w-full object-contain rounded"
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-primary" />
                    )}
                  </div>

                  {/* Company Metadata */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-foreground truncate block">
                        {comp.name}
                      </span>
                      <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{city}</span>
                      <span className="h-1 w-1 rounded-full bg-border shrink-0" />
                      <span className="text-primary font-medium shrink-0">Partner</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footnote */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground pt-1 max-w-6xl mx-auto border-t border-border/60 gap-1">
          <span>* Verified commercial printing presses, digital workshops, and signage fabricators.</span>
          <span className="font-medium text-foreground">
            {tBilingual('200+ active shops across all 8 divisions', '৮টি বিভাগের ২০০+ সক্রিয় প্রতিষ্ঠান')}
          </span>
        </div>
      </div>
    </section>
  )
}
