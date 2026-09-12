import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../../types/database.types.ts'

import { isTestEnvironment } from '../security/runtime-env.ts'

let cachedBrowserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (typeof window !== 'undefined' && cachedBrowserClient) {
    return cachedBrowserClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isTestEnvironment()) {
      return createBrowserClient<Database>(
        supabaseUrl || 'https://test-project.supabase.co',
        supabaseAnonKey || 'dummy-test-anon-key'
      )
    }
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured in environment.')
  }

  const client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        if (typeof document === 'undefined') return []
        return document.cookie
          .split('; ')
          .filter(Boolean)
          .map((cookie) => {
            const [name, ...rest] = cookie.split('=')
            return { name, value: decodeURIComponent(rest.join('=')) }
          })
      },
      setAll(cookiesToSet) {
        if (typeof document === 'undefined') return
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookieStr = `${name}=${encodeURIComponent(value)}`
          if (options?.maxAge) cookieStr += `; max-age=${options.maxAge}`
          if (options?.path) cookieStr += `; path=${options.path || '/'}`
          if (options?.sameSite) cookieStr += `; sameSite=${options.sameSite}`
          if (options?.secure) cookieStr += `; secure`
          document.cookie = cookieStr
        })
      },
    },
  })

  if (typeof window !== 'undefined') {
    cachedBrowserClient = client
  }

  return client
}
