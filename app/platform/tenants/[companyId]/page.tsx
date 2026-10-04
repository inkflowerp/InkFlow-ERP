import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import Company360Client from './tenant-detail-client'

export default async function Tenant360DetailPage() {
  await requirePlatformPermission('tenant.view')
  return <Company360Client />
}
