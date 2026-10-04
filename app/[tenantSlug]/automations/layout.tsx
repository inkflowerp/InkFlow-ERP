import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function AutomationsModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'settings.view')

  return (
    <PanelAccessGuard
      module="settings"
      action="view"
      panelTitle="Automations"
      panelTitleBn="অটোমেশন"
    >
      {children}
    </PanelAccessGuard>
  )
}
