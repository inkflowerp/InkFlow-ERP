import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function LegacyInventoryRollsPage({ params }: PageProps) {
  const { tenantSlug } = await params
  if (tenantSlug) {
    redirect(`/${tenantSlug}/inventory?view=rolls`)
  }
  redirect('/inventory?view=rolls')
}
