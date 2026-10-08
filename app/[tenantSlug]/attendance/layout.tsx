import React from 'react'
import { requireTenantUser } from '@/lib/auth/tenant-auth'

interface LayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function AttendanceModuleLayout({ params, children }: LayoutProps) {
  const { tenantSlug } = await params
  await requireTenantUser(tenantSlug)

  return <>{children}</>
}
