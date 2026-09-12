import { createServerClient } from '@supabase/ssr'
import type { Database } from '../../types/database.types.ts'

export async function createClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://liqhihsqcblddqfjmmse.supabase.co'

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcWhpaHNxY2JsZGRxZmptbXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTEyMjUsImV4cCI6MjEwNDM4NzIyNX0.JMDMwnk3vIDg8V7Hn7qKPhqzP7yLA4HYYf2JSYW3Sv0'

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'FAIL CLOSED: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY) must be configured.'
    )
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}

