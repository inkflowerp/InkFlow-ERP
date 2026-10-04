import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformJobsClient from './jobs-client'

export const dynamic = 'force-dynamic'

export default async function PlatformJobsPage() {
  await requirePlatformPermission('job.view')
  return <PlatformJobsClient />
}
