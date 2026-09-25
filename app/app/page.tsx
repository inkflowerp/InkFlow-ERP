import { redirect } from 'next/navigation'
import { getTenantRedirectSlug } from '@/lib/auth/tenant-auth'
import { getTenantLink } from '@/lib/tenant/tenant-url'

export default async function AppRootRedirect() {
  const slug = await getTenantRedirectSlug()
  redirect(getTenantLink(slug, '/dashboard'))
}
