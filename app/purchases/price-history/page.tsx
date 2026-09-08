import { redirect } from 'next/navigation'
import { getTenantRedirectSlug } from '@/lib/auth/tenant-auth'

export default async function GlobalPurchasePriceHistoryRedirect() {
  const slug = await getTenantRedirectSlug()
  redirect(`/${slug}/purchases/price-history`)
}
