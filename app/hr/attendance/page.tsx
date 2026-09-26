import { redirect } from 'next/navigation'
import { getTenantRedirectSlug } from '@/lib/auth/tenant-auth'

export default async function GlobalAttendanceRedirect() {
  const slug = await getTenantRedirectSlug()
  redirect(`/${slug}/hr/attendance`)
}
