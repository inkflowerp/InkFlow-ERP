import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../../types/database.types.ts'
import { getAuthCookieOptions } from '../tenant/tenant-resolution.ts'

let cachedBrowserClient: ReturnType<typeof createBrowserClient<Database>> | null = null
let hasLoggedConfigWarning = false

/**
 * Checks whether client-side Supabase credentials are configured in the environment.
 */
export function isSupabaseConfigured(): boolean {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY

  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.trim() !== '' &&
    supabaseAnonKey.trim() !== '' &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseUrl.includes('placeholder-project')
  )
}

export function createClient() {
  if (typeof window !== 'undefined' && cachedBrowserClient) {
    return cachedBrowserClient
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!isSupabaseConfigured()) {
    if (typeof window !== 'undefined' && !hasLoggedConfigWarning) {
      hasLoggedConfigWarning = true
      console.warn(
        '[Supabase Client] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured in Vercel environment. Supabase client running with safe fallback.'
      )
    }
    const fallbackClient = createBrowserClient<Database>(
      supabaseUrl || 'https://placeholder-project.supabase.co',
      supabaseAnonKey || 'dummy-anon-key'
    )
    if (typeof window !== 'undefined') {
      cachedBrowserClient = fallbackClient
    }
    return fallbackClient
  }

  const baseCookieOptions = getAuthCookieOptions()
  const client = createBrowserClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!,
    baseCookieOptions.domain ? { cookieOptions: { domain: baseCookieOptions.domain } } : undefined
  )

  if (typeof window !== 'undefined') {
    cachedBrowserClient = client
  }

  return client
}



