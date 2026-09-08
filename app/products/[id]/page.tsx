import { redirect } from 'next/navigation'
import { getTenantRedirectSlug } from '@/lib/auth/tenant-auth'

export default async function GlobalProductDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slug = await getTenantRedirectSlug()
  redirect(`/${slug}/products/${id}`)
}
