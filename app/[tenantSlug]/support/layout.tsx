import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function SupportModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'support.view')

  return (
    <PanelAccessGuard
      module="support"
      action="view"
      panelTitle="Support & Tickets"
      panelTitleBn="সহায়তা"
    >
      {children}
    </PanelAccessGuard>
  )
}
