import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getTenantRedirectSlug } from '@/lib/auth/tenant-auth'
import { getTenantLink } from '@/lib/tenant/tenant-url'

export default async function GlobalDashboardRedirect() {
  const slug = await getTenantRedirectSlug()
  try {
    const headerStore = await headers()
    const host = (headerStore.get('x-forwarded-host') || headerStore.get('host') || '').toLowerCase()
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      redirect(`/${slug}/dashboard`)
    }
  } catch {}
  redirect(getTenantLink(slug, '/dashboard'))
}
