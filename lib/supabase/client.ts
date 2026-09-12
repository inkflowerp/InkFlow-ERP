import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../../types/database.types.ts'

import { isTestEnvironment } from '../security/runtime-env.ts'

let cachedBrowserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (typeof window !== 'undefined' && cachedBrowserClient) {
    return cachedBrowserClient
  }

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
    if (isTestEnvironment()) {
      return createBrowserClient<Database>(
        supabaseUrl || 'https://test-project.supabase.co',
        supabaseAnonKey || 'dummy-test-anon-key'
      )
    }
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured in environment.')
  }

  const client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

  if (typeof window !== 'undefined') {
    cachedBrowserClient = client
  }

  return client
}

