import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { resolveHostname } from '@/lib/tenant/tenant-resolution'

interface PageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function LegacyInventoryRollsPage({ params }: PageProps) {
  const { tenantSlug } = await params
  let isSubdomain = false
  try {
    const headerStore = await headers()
    const host = headerStore.get('x-tenant-hostname') || headerStore.get('host')
    if (host) {
      isSubdomain = resolveHostname(host).hostType === 'tenant'
    }
  } catch {}

  if (isSubdomain) {
    redirect('/inventory?view=rolls')
  }

  if (tenantSlug) {
    redirect(`/${tenantSlug}/inventory?view=rolls`)
  }
  redirect('/inventory?view=rolls')
}
