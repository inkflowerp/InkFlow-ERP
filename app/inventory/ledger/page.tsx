import { redirect } from 'next/navigation'
import { getTenantRedirectSlug } from '@/lib/auth/tenant-auth'

export default async function GlobalInventoryLedgerRedirect() {
  const slug = await getTenantRedirectSlug()
  redirect(`/${slug}/inventory/ledger`)
}
