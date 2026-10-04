import { redirect } from 'next/navigation'

export default async function PlatformCompanyDetailRedirect({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params
  redirect(`/platform/tenants/${companyId}`)
}
