import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function LegacyPurchasesPage() {
  redirect('/inventory?view=purchases')
}
