import React from 'react'
import type { Metadata } from 'next'
import { getPublicSubscriptionPlansAction } from '@/actions/subscription.actions'
import { PublicPlansProvider } from '@/hooks/use-public-plans'
import { MarketingDemoProvider } from '@/components/marketing/demo-modal-context'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { HeroSection } from '@/components/marketing/hero-section'
import { HowShopsWorkSection } from '@/components/marketing/how-shops-work-section'
import { CoreProblemsSection } from '@/components/marketing/core-problems-section'
import { CoreWorkflowSection } from '@/components/marketing/core-workflow-section'
import { WhatPrintFlowManagesSection } from '@/components/marketing/what-printflow-manages-section'
import { IndustrySolutionsSection } from '@/components/marketing/industry-solutions-section'
import { OperationalAdvantagesSection } from '@/components/marketing/operational-advantages-section'
import { BangladeshFeaturesSection } from '@/components/marketing/bangladesh-features-section'
import { MobileWorkflowSection } from '@/components/marketing/mobile-workflow-section'
import { PricingSection } from '@/components/marketing/pricing-section'
import { FAQSection } from '@/components/marketing/faq-section'
import { FinalCTASection } from '@/components/marketing/final-cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'

export const revalidate = 300 // Revalidate public cached content every 5 minutes

export const metadata: Metadata = {
  title: 'PrintFlow — The Operating System for Print & Signage Businesses',
  description:
    'From customer request to quotation, order, design, production, inventory, payment and delivery — one connected system built for print and signage businesses in Bangladesh.',
  openGraph: {
    title: 'PrintFlow — The Operating System for Print & Signage Businesses',
    description:
      'Manage quotations, orders, production, materials, payments, delivery and profitability from one connected platform.',
    type: 'website',
  },
}

export default async function MarketingHomePage() {
  const plansRes = await getPublicSubscriptionPlansAction()
  const initialData = plansRes.data || null
  const lowestPrice = initialData?.lowestPrice || 1999

  // Truthful JSON-LD Schema (SoftwareApplication without fabricated ratings or reviews)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PrintFlow',
    operatingSystem: 'Web, Android, iOS, Windows, macOS',
    applicationCategory: 'BusinessApplication',
    offers: {
      '@type': 'Offer',
      price: String(lowestPrice),
      priceCurrency: 'BDT',
    },
    description:
      'Cloud operating system and software built specifically for printing presses, digital banner shops, and signage fabricators in Bangladesh.',
  }

  return (
    <PublicPlansProvider initialData={initialData}>
      <MarketingDemoProvider>
        <div className="min-h-screen bg-muted text-foreground font-sans antialiased overflow-x-hidden selection:bg-primary selection:text-white">
          {/* Truthful Schema.org Structured Data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />

          {/* Section 1: Navbar */}
          <MarketingNavbar />

          <main>
            {/* Section 2: Hero */}
            <HeroSection />

            {/* Section 3: "How Print Shops Work With PrintFlow" */}
            <HowShopsWorkSection />

            {/* Section 4: Core Problems */}
            <CoreProblemsSection />

            {/* Section 5: Core Workflow */}
            <CoreWorkflowSection />

            {/* Section 6: What PrintFlow Manages */}
            <WhatPrintFlowManagesSection />

            {/* Section 7: Industry/Business Types */}
            <IndustrySolutionsSection />

            {/* Section 8: Key Operational Advantages */}
            <OperationalAdvantagesSection />

            {/* Section 9: Bangladesh-Specific Features */}
            <BangladeshFeaturesSection />

            {/* Section 10: Mobile / Anywhere Workflow */}
            <MobileWorkflowSection />

            {/* Section 11: Pricing */}
            <PricingSection />

            {/* Section 12: FAQ */}
            <FAQSection />

            {/* Section 13: Final CTA */}
            <FinalCTASection />
          </main>

          {/* Section 14: Footer */}
          <MarketingFooter />
        </div>
      </MarketingDemoProvider>
    </PublicPlansProvider>
  )
}
