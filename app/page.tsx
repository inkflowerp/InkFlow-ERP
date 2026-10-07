import React from 'react'
import type { Metadata } from 'next'
import { getPublicSubscriptionPlansAction } from '@/actions/subscription.actions'
import { PublicPlansProvider } from '@/hooks/use-public-plans'
import { MarketingDemoProvider } from '@/components/marketing/demo-modal-context'
import { LandingPageService } from '@/services/landing-page.service'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { HeroSection } from '@/components/marketing/hero-section'
import { WithoutPrintFlowSection } from '@/components/marketing/without-printflow-section'
import { WithPrintFlowSection } from '@/components/marketing/with-printflow-section'
import { CoreWorkflowSection } from '@/components/marketing/core-workflow-section'
import { EmployeeManagementSection } from '@/components/marketing/employee-management-section'
import { WhatPrintFlowManagesSection } from '@/components/marketing/what-printflow-manages-section'
import { IndustrySolutionsSection } from '@/components/marketing/industry-solutions-section'
import { RegisteredCompaniesSection } from '@/components/marketing/registered-companies-section'
import { BangladeshFeaturesSection } from '@/components/marketing/bangladesh-features-section'
import { MobileWorkflowSection } from '@/components/marketing/mobile-workflow-section'
import { PricingSection } from '@/components/marketing/pricing-section'
import { FAQSection } from '@/components/marketing/faq-section'
import { FinalCTASection } from '@/components/marketing/final-cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'

import { getAuthenticatedPlatformContext } from '@/lib/auth/platform-auth'

export const revalidate = 60 // Revalidate public cached content every 60 seconds

export async function generateMetadata(): Promise<Metadata> {
  const config = await LandingPageService.getPublicConfig()
  const title = config?.seo?.metaTitle || 'PrintFlow — Print & Signage Business Management Software'
  const description =
    config?.seo?.metaDescription ||
    'Manage sales, design, production, inventory, employees, delivery and payments with PrintFlow.'
  const canonicalUrl = config?.seo?.canonicalUrl || 'https://printflow.bd'

  return {
    title,
    description,
    metadataBase: new URL(canonicalUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images: config?.seo?.ogImageUrl ? [{ url: config.seo.ogImageUrl }] : undefined,
    },
  }
}

interface PageProps {
  searchParams?: Promise<{ preview?: string }>
}

export default async function MarketingHomePage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined
  let isPreview = resolvedParams?.preview === 'true'

  // Security gate: only authenticated platform admins can preview draft configurations
  if (isPreview) {
    const platformCtx = await getAuthenticatedPlatformContext()
    if (!platformCtx || !platformCtx.permissions.includes('system.manage')) {
      isPreview = false
    }
  }

  // If authorized preview mode, load the draft configuration; otherwise load the published configuration
  const landingConfig = isPreview
    ? (await LandingPageService.getAdminConfig()).draft
    : await LandingPageService.getPublicConfig()

  const plansRes = await getPublicSubscriptionPlansAction()
  const initialData = plansRes.data || null
  const lowestPrice = initialData?.lowestPrice || 1999

  // Truthful Schema.org Structured Data
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

  // Maintenance screen if landing page is globally disabled by platform admin
  if (!landingConfig.general.enabled && !isPreview) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">PrintFlow System Update</h1>
          <p className="text-sm text-muted-foreground">
            PrintFlow is currently undergoing scheduled platform upgrades. Please check back shortly.
          </p>
        </div>
      </div>
    )
  }

  // Active enabled sections sorted by their configured order
  const activeSections = (landingConfig.sections || [])
    .filter((sec) => sec.enabled)
    .sort((a, b) => a.order - b.order)

  return (
    <PublicPlansProvider initialData={initialData}>
      <MarketingDemoProvider>
        <div className="min-h-screen bg-background text-foreground font-sans antialiased overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
          {/* Truthful Schema.org Structured Data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />

          {/* Section 1: Navbar */}
          <MarketingNavbar />

          <main>
            {activeSections.map((section) => {
              switch (section.key) {
                case 'hero':
                  return <HeroSection key="hero" config={landingConfig.hero} />
                case 'without_printflow':
                  return (
                    <WithoutPrintFlowSection
                      key="without_printflow"
                      config={landingConfig.comparison}
                    />
                  )
                case 'with_printflow':
                  // Side-by-side comparison is already rendered if without_printflow is enabled
                  if (activeSections.some((s) => s.key === 'without_printflow')) {
                    return null
                  }
                  return (
                    <WithPrintFlowSection
                      key="with_printflow"
                      config={landingConfig.comparison}
                    />
                  )
                case 'workflow':
                  return <CoreWorkflowSection key="workflow" />
                case 'employees':
                  return <EmployeeManagementSection key="employees" />
                case 'what_we_manage':
                  return <WhatPrintFlowManagesSection key="what_we_manage" />
                case 'industries':
                  return <IndustrySolutionsSection key="industries" />
                case 'companies':
                  return (
                    <RegisteredCompaniesSection
                      key="companies"
                      companies={landingConfig.companies}
                      config={landingConfig.companiesSection}
                    />
                  )
                case 'bangladesh':
                  return <BangladeshFeaturesSection key="bangladesh" />
                case 'mobile':
                  return <MobileWorkflowSection key="mobile" />
                case 'pricing':
                  return landingConfig.pricing.showPricing ? (
                    <PricingSection key="pricing" config={landingConfig.pricing} />
                  ) : null
                case 'faq':
                  return <FAQSection key="faq" items={landingConfig.faq} />
                case 'final_cta':
                  return <FinalCTASection key="final_cta" config={landingConfig.finalCta} />
                default:
                  return null
              }
            })}
          </main>

          {/* Section 15: Footer */}
          <MarketingFooter />
        </div>
      </MarketingDemoProvider>
    </PublicPlansProvider>
  )
}
