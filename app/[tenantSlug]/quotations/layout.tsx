import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function QuotationsModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'quotations.view')

  return (
    <PanelAccessGuard
      module="quotations"
      action="view"
      panelTitle="Quotations"
      panelTitleBn="কোটেশন"
    >
      {children}
    </PanelAccessGuard>
  )
}
