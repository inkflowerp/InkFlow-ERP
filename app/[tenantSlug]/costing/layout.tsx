import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function CostingModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'pricing.view')

  return (
    <PanelAccessGuard
      module="pricing"
      action="view"
      panelTitle="Costing & Estimation"
      panelTitleBn="কস্টিং ও এস্টিমেশন"
    >
      {children}
    </PanelAccessGuard>
  )
}
