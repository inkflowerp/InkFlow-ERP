import { z } from 'zod'

/**
 * Public Client-Side Environment Variable Validation (Safe for browser)
 */

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('PrintFlow SaaS'),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default('bn'),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().default('BDT'),
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().default('localhost:3000'),
})

const isTestEnv =
  typeof process !== 'undefined' &&
  (process.env?.NODE_ENV === 'test' ||
    typeof process.env?.NODE_TEST_CONTEXT !== 'undefined' ||
    Boolean(process.env?.npm_lifecycle_event && process.env?.npm_lifecycle_event.includes('test')))

const rawClientEnv = {
  NEXT_PUBLIC_SUPABASE_URL:
    typeof process !== 'undefined'
      ? process.env?.NEXT_PUBLIC_SUPABASE_URL || process.env?.SUPABASE_URL
      : undefined,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    typeof process !== 'undefined'
      ? process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      : undefined,
  NEXT_PUBLIC_APP_URL: typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_APP_URL : undefined,
  NEXT_PUBLIC_APP_NAME: typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_APP_NAME : undefined,
  NEXT_PUBLIC_DEFAULT_LOCALE:
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_DEFAULT_LOCALE : undefined,
  NEXT_PUBLIC_DEFAULT_CURRENCY:
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_DEFAULT_CURRENCY : undefined,
  NEXT_PUBLIC_ROOT_DOMAIN:
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_ROOT_DOMAIN : undefined,
}

const parsed = clientEnvSchema.safeParse(
  isTestEnv
    ? {
        ...rawClientEnv,
        NEXT_PUBLIC_SUPABASE_URL:
          rawClientEnv.NEXT_PUBLIC_SUPABASE_URL || 'https://liqhihsqcblddqfjmmse.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
          rawClientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key-placeholder-min-length-1234',
      }
    : rawClientEnv
)

if (!parsed.success) {
  console.error('❌ FATAL: Invalid client environment configuration:', parsed.error.format())
  throw new Error(`Invalid client environment configuration: ${JSON.stringify(parsed.error.format())}`)
}

export const clientEnv = parsed.data
