import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ tenantSlug: string }>
}

export default async function AutomationsRedirectPage() {
  redirect('/settings/automations')
}
