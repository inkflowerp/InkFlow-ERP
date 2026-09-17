import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function LegacyInventoryRollsPage({ params }: PageProps) {
  const { tenantSlug } = await params
  redirect(`/${tenantSlug}/inventory?view=rolls`)
}
