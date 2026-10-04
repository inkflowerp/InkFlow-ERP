import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function PortalModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'hr.view')

  return (
    <PanelAccessGuard
      module="hr"
      action="view"
      panelTitle="Staff Portal"
      panelTitleBn="স্টাফ পোর্টাল"
    >
      {children}
    </PanelAccessGuard>
  )
}
