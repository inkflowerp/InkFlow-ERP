import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types.ts'

const DEFAULT_SUPABASE_URL = 'https://liqhihsqcblddqfjmmse.supabase.co'
const DEFAULT_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcWhpaHNxY2JsZGRxZmptbXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODgxMTIyNSwiZXhwIjoyMTA0Mzg3MjI1fQ.r1YkQlNn12i5ra1XdcGBJVj1QAT6gY2_uK-o0VL9Q4Q'

let cachedAdminClient: ReturnType<typeof createClient<Database>> | null = null

export function createAdminClient() {
  if (cachedAdminClient) {
    return cachedAdminClient
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SERVICE_ROLE_KEY

  cachedAdminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cachedAdminClient
}
