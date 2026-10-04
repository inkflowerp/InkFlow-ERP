import React from 'react'
import { headers } from 'next/headers'
import { requirePlatformUser } from '@/lib/auth/platform-auth'
import { PlatformShell } from '@/components/platform/platform-shell'

export const dynamic = 'force-dynamic'

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headerStore = await headers()
  const currentPath = headerStore.get('x-current-path') || ''
  const isAuthPage =
    currentPath === '/platform/login' ||
    currentPath === '/platform/forgot-password' ||
    currentPath === '/platform/reset-password'

  // Public platform authentication pages do not require pre-authenticated session
  if (isAuthPage) {
    return <>{children}</>
  }

  // 1. Authoritative Server-Side Guard
  // Strictly verifies Supabase Auth, platform_admins PostgreSQL record, and MFA status.
  // Throws server-side redirect to /platform/login if unauthorized or inactive.
  const platformUser = await requirePlatformUser()

  return (
    <PlatformShell user={platformUser}>
      {children}
    </PlatformShell>
  )
}
