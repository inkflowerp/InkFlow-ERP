import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

const DEFAULT_SUPABASE_URL = 'https://liqhihsqcblddqfjmmse.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcWhpaHNxY2JsZGRxZmptbXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTEyMjUsImV4cCI6MjEwNDM4NzIyNX0.JMDMwnk3vIDg8V7Hn7qKPhqzP7yLA4HYYf2JSYW3Sv0'

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    DEFAULT_SUPABASE_ANON_KEY

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
