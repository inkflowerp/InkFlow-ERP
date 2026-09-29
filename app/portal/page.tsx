import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'

/**
 * Global Portal Entry Point
 * Redirects authenticated users to their specific tenant dashboard.
 * If unauthenticated, redirects to the standard login page.
 */
export default async function GlobalPortalRedirect() {
  try {
    const tenant = await getCurrentTenant()
    if (tenant?.companySlug) {
      redirect(`/${tenant.companySlug}/dashboard`)
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

  redirect('/login')
}
