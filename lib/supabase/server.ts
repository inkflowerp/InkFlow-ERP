import { createServerClient } from '@supabase/ssr'
import type { Database } from '../../types/database.types.ts'
import { getAuthCookieOptions } from '../tenant/tenant-resolution.ts'
import { createClient as createBrowserClient } from './client.ts'

export async function createClient() {
  if (typeof window !== 'undefined') {
    return createBrowserClient()
  }

  let cookieStore: any = {
    getAll: () => [],
    set: () => {},
  }

  try {
    const { cookies } = await import('next/headers')
    cookieStore = await cookies()
  } catch {
    // Standalone Node.js / test environment without Next.js headers
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'FAIL CLOSED: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY) must be configured.'
    )
  }

  const baseCookieOptions = getAuthCookieOptions()

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: baseCookieOptions.domain ? { domain: baseCookieOptions.domain } : undefined,
      cookies: {
        getAll() {
          return typeof cookieStore.getAll === 'function' ? cookieStore.getAll() : []
        },
        setAll(cookiesToSet) {
          try {
            if (typeof cookieStore.set === 'function') {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, {
                  ...options,
                  ...(baseCookieOptions.domain ? { domain: baseCookieOptions.domain } : {}),
                })
              )
            }
          } catch {
            // Ignored in server component context
          }
        },
      },
    }
  )
}

