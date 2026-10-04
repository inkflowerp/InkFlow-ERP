import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function CustomersModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'customers.view')

  return (
    <PanelAccessGuard
      module="customers"
      action="view"
      panelTitle="Customers"
      panelTitleBn="গ্রাহক তালিকা"
    >
      {children}
    </PanelAccessGuard>
  )
}
