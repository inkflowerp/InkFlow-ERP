import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function PurchasesModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'purchase.view')

  return (
    <PanelAccessGuard
      module="inventory"
      action="view"
      panelTitle="Purchases & Requisitions"
      panelTitleBn="ক্রয় ও রিকুইজিশন"
    >
      {children}
    </PanelAccessGuard>
  )
}
