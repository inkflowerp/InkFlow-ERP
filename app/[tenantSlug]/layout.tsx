import React from 'react'
import { TenantProvider } from '@/hooks/use-tenant'
import { AppShell } from '@/components/shell/app-shell'
import { requireTenantUser } from '@/lib/auth/tenant-auth'

interface TenantLayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function TenantLayout({ params, children }: TenantLayoutProps) {
  const { tenantSlug } = await params

  // Server-side tenant isolation guard: reject cross-tenant access and unauthenticated access
  const tenantContext = await requireTenantUser(tenantSlug)

  return (
    <TenantProvider initialSlug={tenantSlug} initialTenantContext={tenantContext}>
      <AppShell>{children}</AppShell>
    </TenantProvider>
  )
}
