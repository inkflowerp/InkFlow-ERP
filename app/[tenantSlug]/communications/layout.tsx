import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function CommunicationsModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'whatsapp.view')

  return (
    <PanelAccessGuard
      module="whatsapp"
      action="view"
      panelTitle="Communications"
      panelTitleBn="যোগাযোগ"
    >
      {children}
    </PanelAccessGuard>
  )
}
