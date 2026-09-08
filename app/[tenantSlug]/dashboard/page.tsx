import { DashboardView } from '@/features/dashboard/dashboard-view'

interface DashboardPageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  await params // Await params for Next.js 16+ App Router
  return <DashboardView />
}
