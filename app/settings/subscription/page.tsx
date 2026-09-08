import { redirect } from 'next/navigation'
import { getTenantRedirectSlug } from '@/lib/auth/tenant-auth'

export default async function GlobalSubscriptionSettingsRedirect() {
  const slug = await getTenantRedirectSlug()
  redirect(`/${slug}/settings/subscription`)
}
