import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'

interface PortalPageProps {
 params: Promise<{ tenantSlug: string }>
}

/**
 * Tenant Portal Entry Point
 * Redirects authenticated portal users (e.g. Designers, Operators, Staff) directly to their dashboard.
 * If unauthenticated, smoothly redirects to the tenant-scoped login page with return URL.
 */
export default async function TenantPortalRedirect({ params }: PortalPageProps) {
 const { tenantSlug } = await params

 try {
 const tenant = await getCurrentTenant(tenantSlug)
 if (tenant?.userId) {
 redirect(`/${tenantSlug}/dashboard`)
    }
  } catch (error: any) {
 if (
 typeof error === 'object' &&
 error !== null &&
      'digest' in error &&
 typeof error.digest === 'string' &&
 error.digest.startsWith('NEXT_REDIRECT')
    ) {
 throw error
    }
  }

 redirect(`/login?tenant=${tenantSlug}&redirectTo=/${tenantSlug}/dashboard`)
}
