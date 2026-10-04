import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function ReportsModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'reports.view')

  return (
    <PanelAccessGuard
      module="reports"
      action="view"
      panelTitle="Analytics & Reports"
      panelTitleBn="রিপোর্ট ও বিশ্লেষণ"
    >
      {children}
    </PanelAccessGuard>
  )
}
