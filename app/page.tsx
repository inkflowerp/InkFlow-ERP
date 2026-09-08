'use client'

import React, { useState } from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { HeroSection } from '@/components/marketing/hero-section'
import { ProblemSection } from '@/components/marketing/problem-section'
import { SolutionSection } from '@/components/marketing/solution-section'
import { HowItWorksSection } from '@/components/marketing/how-it-works-section'
import { IndustrySolutionsSection } from '@/components/marketing/industry-solutions-section'
import { FeatureDeepDiveSection } from '@/components/marketing/feature-deep-dive-section'
import { BangladeshSpecificSection } from '@/components/marketing/bangladesh-specific-section'
import { MobileSection } from '@/components/marketing/mobile-section'
import { RoleBasedSection } from '@/components/marketing/role-based-section'
import { ReportingSection } from '@/components/marketing/reporting-section'
import { PricingSection } from '@/components/marketing/pricing-section'
import { TestimonialSection } from '@/components/marketing/testimonial-section'
import { FAQSection } from '@/components/marketing/faq-section'
import { FinalCTASection } from '@/components/marketing/final-cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { DemoModal } from '@/components/marketing/demo-modal'

export default function MarketingHomePage() {
  const [demoOpen, setDemoOpen] = useState(false)

  // JSON-LD Structured Data Schema for SoftwareApplication & Local Printing SaaS
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PrintERP',
    operatingSystem: 'Web, Android, iOS, Windows, macOS',
    applicationCategory: 'BusinessApplication',
    offers: {
      '@type': 'Offer',
      price: '1999',
      priceCurrency: 'BDT',
      priceValidUntil: '2027-12-31',
    },
    description:
      'Cloud ERP and operating system built specifically for printing presses, signage fabricators, LED signboard workshops, and advertising agencies in Bangladesh.',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '128',
    },
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* 1. Header / Navbar */}
      <MarketingNavbar onOpenDemo={() => setDemoOpen(true)} />

      <main>
        {/* 2. Hero Section with realistic SaaS Dashboard Mockup */}
        <HeroSection onOpenDemo={() => setDemoOpen(true)} />

        {/* 3. Problem Section (Before vs After) */}
        <ProblemSection />

        {/* 4. Solution Section (9 Functional Pillars) */}
        <SolutionSection />

        {/* 5. How It Works (11-Step Connected Workflow) */}
        <HowItWorksSection />

        {/* 6. Industry Solutions (12 Specialized Sectors) */}
        <IndustrySolutionsSection />

        {/* 7. Feature Deep-Dive (SFT Calculator, Floor Kanban, Job Profit, Dues) */}
        <FeatureDeepDiveSection />

        {/* 8. Bangladesh Specific (BDT, Bangla, NBR VAT, bKash, WhatsApp) */}
        <BangladeshSpecificSection />

        {/* 9. Mobile Section (Smartphone PWA Mockup) */}
        <MobileSection />

        {/* 10. Role-Based Section (Owner, Sales, Designer, Floor, Operator, Staff) */}
        <RoleBasedSection />

        {/* 11. Reporting & Executive BI Analytics */}
        <ReportingSection />

        {/* 12. Pricing Section (Starter, Business, Enterprise with Yearly Toggle) */}
        <PricingSection />

        {/* 13. Testimonials (Bangladeshi Commercial Printing Hubs) */}
        <TestimonialSection />

        {/* 14. FAQ Section (12 Key Accessible Accordions) */}
        <FAQSection />

        {/* 15. Final High-Impact CTA Banner */}
        <FinalCTASection onOpenDemo={() => setDemoOpen(true)} />
      </main>

      {/* 16. Comprehensive Footer */}
      <MarketingFooter />

      {/* Interactive Demo Request Modal */}
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  )
}
