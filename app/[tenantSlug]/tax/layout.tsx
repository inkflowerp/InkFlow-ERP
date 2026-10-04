import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function TaxModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'settings.manage')

  return (
    <PanelAccessGuard
      module="settings"
      action="manage"
      panelTitle="Tax & VAT"
      panelTitleBn="কর ও ভ্যাট"
    >
      {children}
    </PanelAccessGuard>
  )
}
