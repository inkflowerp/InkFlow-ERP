import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function LegacyInventoryLedgerPage({ params }: PageProps) {
  const { tenantSlug } = await params
  if (tenantSlug) {
    redirect(`/${tenantSlug}/inventory?view=ledger`)
  }
  redirect('/inventory?view=ledger')
}
