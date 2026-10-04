import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function DeliveryModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'delivery.view')

  return (
    <PanelAccessGuard
      module="delivery"
      action="view"
      panelTitle="Delivery & Challans"
      panelTitleBn="ডেলিভারি ও চালান"
    >
      {children}
    </PanelAccessGuard>
  )
}
