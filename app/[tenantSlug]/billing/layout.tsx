import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function BillingModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'invoices.view')

  return (
    <PanelAccessGuard
      module="invoices"
      action="view"
      panelTitle="Billing & Invoices"
      panelTitleBn="বিল ও ইনভয়েস"
    >
      {children}
    </PanelAccessGuard>
  )
}
