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
  const rawPath =
    headerStore.get('x-current-path') ||
    headerStore.get('x-pathname') ||
    headerStore.get('next-url') ||
    ''
  const currentPath = rawPath.split('?')[0].toLowerCase().trim()
  const isAuthPage =
    currentPath === '/platform/login' ||
    currentPath.startsWith('/platform/login/') ||
    currentPath === '/platform/forgot-password' ||
    currentPath.startsWith('/platform/forgot-password/') ||
    currentPath === '/platform/reset-password' ||
    currentPath.startsWith('/platform/reset-password/')

  // Public platform authentication pages do not require pre-authenticated session
  if (isAuthPage) {
    return <>{children}</>
  }

  // Authoritative Server-Side Guard:
  // Strictly verifies Supabase Auth, platform_admins PostgreSQL record, and MFA status.
  // Throws server-side redirect to /platform/login if unauthorized or inactive.
  let platformUser
  try {
    platformUser = await requirePlatformUser()
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'digest' in err &&
      typeof (err as { digest?: unknown }).digest === 'string' &&
      ((err as { digest: string }).digest).startsWith('NEXT_REDIRECT')
    ) {
      throw err
    }
    return <>{children}</>
  }

  return (
    <PlatformShell user={platformUser}>
      {children}
    </PlatformShell>
  )
}
