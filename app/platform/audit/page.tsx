import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformAuditClient from './audit-client'

export const dynamic = 'force-dynamic'

export default async function PlatformAuditPage() {
  await requirePlatformPermission('audit.view')
  return <PlatformAuditClient />
}
