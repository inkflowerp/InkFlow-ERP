import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function DesignModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'design.view')

  return (
    <PanelAccessGuard
      module="design"
      action="view"
      panelTitle="Design & Prepress"
      panelTitleBn="ডিজাইন ও প্রি-প্রেস"
    >
      {children}
    </PanelAccessGuard>
  )
}
