import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function AuditModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'audit.view')

  return (
    <PanelAccessGuard
      module="audit"
      action="view"
      panelTitle="Security & Audit Logs"
      panelTitleBn="নিরাপত্তা ও অডিট লগ"
    >
      {children}
    </PanelAccessGuard>
  )
}
