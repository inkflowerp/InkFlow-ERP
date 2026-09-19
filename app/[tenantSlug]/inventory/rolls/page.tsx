import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function LegacyInventoryRollsPage() {
  redirect('/inventory?view=rolls')
}
