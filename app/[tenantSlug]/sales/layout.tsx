import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function SalesModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'orders.view')

  return (
    <PanelAccessGuard
      module="orders"
      action="view"
      panelTitle="Sales Management"
      panelTitleBn="বিক্রয় ব্যবস্থাপনা"
    >
      {children}
    </PanelAccessGuard>
  )
}
