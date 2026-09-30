'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'
import { WorkforceOverview } from '@/components/workforce/workforce-overview'

export default function WorkforceOverviewPage() {
  const params = useParams()
  const { company } = useTenant()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  return <WorkforceOverview tenantSlug={slug} />
}
