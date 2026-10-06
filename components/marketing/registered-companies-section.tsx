'use client'

import React from 'react'
import { Building2, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import type { LandingCompanyConfig } from '@/types/landing-page.types'

interface RegisteredCompaniesProps {
  companies?: LandingCompanyConfig[]
}

export function RegisteredCompaniesSection({ companies = [] }: RegisteredCompaniesProps) {
  const { tBilingual } = useI18n()

  // Filter only approved, public, active companies with valid logo URLs
  const activeApprovedCompanies = companies.filter(
    (c) => c.isPublic === true && c.status === 'active' && Boolean(c.logoUrl && c.logoUrl.trim())
  )

  const hasApprovedCompanies = activeApprovedCompanies.length > 0

  return (
    <section className="py-12 sm:py-16 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{tBilingual('Trust & Reliability', 'বিশ্বাস ও নির্ভরযোগ্যতা')}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {hasApprovedCompanies
              ? tBilingual(
                  'Trusted by Print & Signage Businesses.',
                  'প্রিন্ট ও সাইনেজ ব্যবসার বিশ্বস্ত সমাধান।'
                )
              : tBilingual(
                  'Built for Print & Signage Businesses Across Bangladesh.',
                  'সারা বাংলাদেশের প্রিন্ট ও সাইনেজ ব্যবসার জন্য নিবেদিত।'
                )}
          </h2>

          {!hasApprovedCompanies && (
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
              {tBilingual(
                'Connecting commercial printing presses, digital shops, and signage fabricators from Dhaka to Chattogram.',
                'ঢাকা থেকে চট্টগ্রাম — বাণিজ্যিক প্রেস, ডিজিটাল শপ ও সাইন ফ্যাব্রিকেটরদের এক সংযুক্ত প্ল্যাটফর্ম।'
              )}
            </p>
          )}
        </div>

        {/* Minimal Company Showcase: Only approved real companies */}
        {hasApprovedCompanies && (
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 max-w-5xl mx-auto pt-2">
            {activeApprovedCompanies.map((comp) => {
              const isLogoOnly = comp.displayMode === 'logo_only'
              return (
                <div
                  key={comp.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-card shadow-2xs hover:border-primary/40 transition-colors"
                >
                  <img
                    src={comp.logoUrl}
                    alt={comp.name || 'Registered Company'}
                    className="h-8 sm:h-9 max-w-[120px] object-contain rounded"
                  />
                  {!isLogoOnly && comp.name && (
                    <span className="text-xs sm:text-sm font-semibold text-foreground">
                      {comp.name}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
