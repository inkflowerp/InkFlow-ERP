import React from 'react'
import { TenantProvider } from '@/hooks/use-tenant'
import { AppShell } from '@/components/shell/app-shell'
import { requireTenantUser } from '@/lib/auth/tenant-auth'
import { SubscriptionService } from '@/services/subscription.service'
import { getServerFilteredNavigation } from '@/config/navigation.config'

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

  // Server-side authoritative navigation resolution (strictly excludes owner modules for staff)
  const isOwner =
    tenantContext.companyRole === 'business_owner' ||
    tenantContext.primaryRole === 'business_owner' ||
    Boolean(tenantContext.isSupportMode)

  const initialNavSections = getServerFilteredNavigation(
    tenantContext.companyRole || tenantContext.primaryRole,
    tenantContext.permissions,
    isOwner
  )

  return (
    <TenantProvider initialSlug={tenantSlug} initialTenantContext={tenantContext}>
      <AppShell
        initialSubscriptionSnapshot={initialSubscriptionSnapshot}
        initialNavSections={initialNavSections}
      >
        {children}
      </AppShell>
    </TenantProvider>
  )
}
