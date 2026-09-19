import { redirect } from 'next/navigation'

interface TenantPageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function TenantPage() {
  redirect('/dashboard')
}
