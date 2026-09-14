import React from 'react'
import { TenantProvider } from '@/hooks/use-tenant'
import { AppShell } from '@/components/shell/app-shell'
import { requireTenantUser } from '@/lib/auth/tenant-auth'
import { SubscriptionService } from '@/services/subscription.service'

interface TenantLayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function TenantLayout({ params, children }: TenantLayoutProps) {
  const { tenantSlug } = await params

  // Server-side tenant isolation guard: reject cross-tenant access and unauthenticated access
  const tenantContext = await requireTenantUser(tenantSlug)

  // Server-side authoritative subscription snapshot resolution
  let initialSubscriptionSnapshot = null
  try {
    if (tenantContext?.companyId) {
      initialSubscriptionSnapshot = await SubscriptionService.resolveTenantSubscription(
        tenantContext.companyId,
        tenantSlug
      )
    }
  } catch {}

  return (
    <TenantProvider initialSlug={tenantSlug} initialTenantContext={tenantContext}>
      <AppShell initialSubscriptionSnapshot={initialSubscriptionSnapshot}>{children}</AppShell>
    </TenantProvider>
  )
}

