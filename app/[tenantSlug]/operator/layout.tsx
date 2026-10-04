import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function OperatorModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'production.view')

  return (
    <PanelAccessGuard
      module="production"
      action="view"
      panelTitle="Operator Workstation"
      panelTitleBn="অপারেটর ওয়ার্কস্টেশন"
    >
      {children}
    </PanelAccessGuard>
  )
}
