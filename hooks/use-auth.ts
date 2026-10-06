'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthUser } from '@/types/auth.types'
import { TENANT_SESSION_COOKIE, TenantSessionData } from '@/lib/auth/types'
import { signOutAction } from '@/actions/auth.actions'

function parseCookiePayload(raw: string): any {
  try {
    if (raw.includes('.')) {
      const parts = raw.split('.')
      if (parts.length === 3) {
        const base64Url = parts[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
        return JSON.parse(jsonPayload)
      }
    }
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    return null
  }
}

function getSessionFromCookie(): TenantSessionData | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${TENANT_SESSION_COOKIE}=`))

  if (!match) return null
  try {
    const raw = match.split('=')[1]
    return parseCookiePayload(raw)
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
          username: null,
          created_at: session.loginTime,
          updated_at: session.loginTime,
        },
      })
    } else {
      // Check live Supabase user
      try {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data }: any) => {
          const authUser = data?.user
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
                username: null,
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

    window.addEventListener('printflow_auth_changed', handleAuthChange)
    return () => window.removeEventListener('printflow_auth_changed', handleAuthChange)
  }, [syncUserFromSession])

  const signOut = async () => {
    setIsLoading(true)
    await signOutAction()
    setUser(null)
    window.location.replace('/login')
    setIsLoading(false)
  }

  return { user, isLoading, signOut, refreshAuth: syncUserFromSession }
}

