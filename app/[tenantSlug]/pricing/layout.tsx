import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function PricingModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'pricing.view')

  return (
    <PanelAccessGuard
      module="pricing"
      action="view"
      panelTitle="Pricing & Tariffs"
      panelTitleBn="মূল্য নির্ধারণ"
    >
      {children}
    </PanelAccessGuard>
  )
}
