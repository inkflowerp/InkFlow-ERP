'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthUser } from '@/types/auth.types'
import { TENANT_SESSION_COOKIE, TenantSessionData } from '@/lib/auth/types'
import { signOutAction } from '@/actions/auth.actions'

function getSessionFromCookie(): TenantSessionData | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${TENANT_SESSION_COOKIE}=`))

  if (!match) return null
  try {
    const raw = match.split('=')[1]
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    return null
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const syncUserFromSession = useCallback(() => {
    const session = getSessionFromCookie()
    if (session) {
      setUser({
        id: session.userId,
        email: session.userEmail,
        profile: {
          id: session.userId,
          full_name: session.fullName,
          full_name_bn: session.fullNameBn || null,
          phone: session.phone || null,
          avatar_url: null,
          preferred_locale: 'bn',
          created_at: session.loginTime,
          updated_at: session.loginTime,
        },
      })
    } else {
      // Check live Supabase user
      try {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user: authUser } }) => {
          if (authUser) {
            setUser({
              id: authUser.id,
              email: authUser.email || '',
              profile: {
                id: authUser.id,
                full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
                full_name_bn: null,
                phone: authUser.user_metadata?.phone || null,
                avatar_url: authUser.user_metadata?.avatar_url || null,
                preferred_locale: 'bn',
                created_at: authUser.created_at,
                updated_at: authUser.created_at,
              },
            })
          } else {
            setUser(null)
          }
        })
      } catch {
        setUser(null)
      }
    }
  }, [])

  useEffect(() => {
    syncUserFromSession()

    const handleAuthChange = () => {
      syncUserFromSession()
    }

    window.addEventListener('printerp_auth_changed', handleAuthChange)
    return () => window.removeEventListener('printerp_auth_changed', handleAuthChange)
  }, [syncUserFromSession])

  const signOut = async () => {
    setIsLoading(true)
    await signOutAction()
    setUser(null)
    router.push('/login')
    setIsLoading(false)
  }

  return { user, isLoading, signOut, refreshAuth: syncUserFromSession }
}

