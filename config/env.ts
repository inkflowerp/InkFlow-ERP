import 'server-only'
import { z } from 'zod'

/**
 * Strict Server-Side Environment Variable Validation (Zod)
 * Invariant:
 * - Fails build/startup immediately if required secrets or URLs are missing or malformed.
 * - Imports 'server-only' to guarantee server secrets never bundle into browser bundles.
 */

const serverEnvSchema = z.object({
  // Supabase Infrastructure
  SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Application Info
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('PrintFlow SaaS'),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default('bn'),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().default('BDT'),
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().default('localhost:3000'),

  // Server Secrets & Database
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  ENCRYPTION_SECRET: z.string().optional(),
  STORAGE_SIGNING_SALT: z.string().optional(),
  CRON_SECRET: z.string().optional(),

  // Node Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  typeof process.env.NODE_TEST_CONTEXT !== 'undefined' ||
  Boolean(process.env.npm_lifecycle_event && process.env.npm_lifecycle_event.includes('test'))

const rawEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  NEXT_PUBLIC_DEFAULT_CURRENCY: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY,
  NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET,
  STORAGE_SIGNING_SALT: process.env.STORAGE_SIGNING_SALT,
  CRON_SECRET: process.env.CRON_SECRET,
  NODE_ENV: process.env.NODE_ENV,
}

const parsed = serverEnvSchema.safeParse(
  isTestEnv
    ? {
        ...rawEnv,
        NEXT_PUBLIC_SUPABASE_URL:
          rawEnv.NEXT_PUBLIC_SUPABASE_URL || 'https://liqhihsqcblddqfjmmse.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
          rawEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key-placeholder-min-length-1234',
        SUPABASE_SERVICE_ROLE_KEY:
          rawEnv.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key-placeholder-min-length-1234',
      }
    : rawEnv
)

if (!parsed.success) {
  console.error('❌ FATAL: Invalid environment configuration at startup:')
  console.error(JSON.stringify(parsed.error.format(), null, 2))
  throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.format())}`)
}

export const env = parsed.data
