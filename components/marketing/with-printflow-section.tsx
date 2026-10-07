'use client'

import React from 'react'
import { WithoutPrintFlowSection } from '@/components/marketing/without-printflow-section'
import type { LandingComparisonConfig } from '@/types/landing-page.types'

interface WithPrintFlowSectionProps {
  config?: LandingComparisonConfig
}

export function WithPrintFlowSection({ config }: WithPrintFlowSectionProps) {
  // Renders the unified Side-by-Side comparison
  return <WithoutPrintFlowSection config={config} />
}
