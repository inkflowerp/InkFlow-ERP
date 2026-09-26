import { redirect } from 'next/navigation'
import { getTenantRedirectSlug } from '@/lib/auth/tenant-auth'

export default async function GlobalSalaryReportRedirect() {
  const slug = await getTenantRedirectSlug()
  redirect(`/${slug}/hr/salary-report`)
}
