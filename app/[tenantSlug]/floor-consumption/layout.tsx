import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function FloorConsumptionModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'inventory.view')

  return (
    <PanelAccessGuard
      module="inventory"
      action="view"
      panelTitle="Floor Consumption"
      panelTitleBn="ফ্লোর ব্যবহার"
    >
      {children}
    </PanelAccessGuard>
  )
}
