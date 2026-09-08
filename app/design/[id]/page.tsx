import { redirect } from 'next/navigation'
import { getTenantRedirectSlug } from '@/lib/auth/tenant-auth'

export default async function GlobalDesignDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slug = await getTenantRedirectSlug()
  redirect(`/${slug}/design/${id}`)
}
