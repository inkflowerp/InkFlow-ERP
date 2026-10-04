import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function ProductsModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'products.view')

  return (
    <PanelAccessGuard
      module="products"
      action="view"
      panelTitle="Products & Services"
      panelTitleBn="পণ্য ও সেবা"
    >
      {children}
    </PanelAccessGuard>
  )
}
