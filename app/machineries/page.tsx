import { redirect } from 'next/navigation'
import { getTenantRedirectSlug } from '@/lib/auth/tenant-auth'

export default async function GlobalMachineriesAliasRedirect() {
  const slug = await getTenantRedirectSlug()
  redirect(`/${slug}/production/machineries`)
}
