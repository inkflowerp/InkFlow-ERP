import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types.ts'

import { isTestEnvironment } from '../security/runtime-env.ts'

let cachedAdminClient: ReturnType<typeof createClient<Database>> | null = null

/**
 * Creates a privileged, server-only Supabase admin client using the service-role key.
 * STRICT SECURITY INVARIANT:
 * - Must only be executed in a secure server-side runtime.
 * - Requires explicit SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.
 * - Never falls back to anon, public, or hardcoded credentials.
 * - FAILS CLOSED if required environment variables are absent.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('SECURITY VIOLATION: createAdminClient() cannot be invoked in the browser runtime.')
  }

  if (cachedAdminClient) {
    return cachedAdminClient
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY

  const isPlaceholderUrl = (url?: string) =>
    !url || url.includes('your-project-ref') || (url.includes('test-project') && isTestEnvironment())

  if (!supabaseUrl || !serviceRoleKey || isPlaceholderUrl(supabaseUrl)) {
    if (isTestEnvironment()) {
      cachedAdminClient = createClient<Database>(
        supabaseUrl || 'https://test-project.supabase.co',
        serviceRoleKey || 'dummy-test-service-role-key',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: {
            fetch: async (url, init) => {
              if (isPlaceholderUrl(String(url))) {
                return new Response(JSON.stringify({ error: 'Test mock placeholder' }), {
                  status: 404,
                  headers: { 'Content-Type': 'application/json' },
                })
              }
              return fetch(url, init)
            },
          },
        }
      )
      return cachedAdminClient
    }

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable is required.')
    }
    throw new Error(
      'FAIL CLOSED: SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is required for administrative operations but is not set in environment.'
    )
  }

  cachedAdminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cachedAdminClient
}

/**
 * Wraps a Supabase admin client to strictly enforce tenant isolation by automatically
 * scoping queries to a given companyId.
 * For tenant tables (or 'companies' with 'id'), queries will automatically have
 * .eq('company_id', companyId) or .eq('id', companyId) applied.
 */
export function tenantScoped(adminClient: SupabaseClient<Database>, companyId: string): SupabaseClient<Database> {
  if (!companyId || typeof companyId !== 'string' || companyId.trim() === '') {
    throw new Error('FAIL CLOSED: tenantScoped requires a valid non-empty companyId string.')
  }

  const cleanCompanyId = companyId.trim()

  return new Proxy(adminClient, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table: string) => {
          type QueryWithEq = { eq: (col: string, val: string) => unknown }
          type AnyCallable = (...args: unknown[]) => unknown

          const builder = target.from(table as never)
          const isCompaniesTable = table === 'companies'
          const filterCol = isCompaniesTable ? 'id' : 'company_id'

          return new Proxy(builder, {
            get(bTarget, bProp, bReceiver) {
              if (bProp === 'select') {
                return (...args: unknown[]) => {
                  const query = (bTarget.select as AnyCallable)(...args) as QueryWithEq
                  return query.eq(filterCol, cleanCompanyId)
                }
              }
              if (bProp === 'update') {
                return (values: Record<string, unknown>, ...args: unknown[]) => {
                  const query = (bTarget.update as AnyCallable)(values, ...args) as QueryWithEq
                  return query.eq(filterCol, cleanCompanyId)
                }
              }
              if (bProp === 'delete') {
                return (...args: unknown[]) => {
                  const query = (bTarget.delete as AnyCallable)(...args) as QueryWithEq
                  return query.eq(filterCol, cleanCompanyId)
                }
              }
              if (bProp === 'insert') {
                return (values: Record<string, unknown> | Record<string, unknown>[], ...args: unknown[]) => {
                  if (isCompaniesTable) {
                    return (bTarget.insert as AnyCallable)(values, ...args)
                  }
                  const withCompany = Array.isArray(values)
                    ? values.map((v) => ({ ...v, company_id: cleanCompanyId }))
                    : { ...values, company_id: cleanCompanyId }
                  return (bTarget.insert as AnyCallable)(withCompany, ...args)
                }
              }
              if (bProp === 'upsert') {
                return (values: Record<string, unknown> | Record<string, unknown>[], ...args: unknown[]) => {
                  if (isCompaniesTable) {
                    return (bTarget.upsert as AnyCallable)(values, ...args)
                  }
                  const withCompany = Array.isArray(values)
                    ? values.map((v) => ({ ...v, company_id: cleanCompanyId }))
                    : { ...values, company_id: cleanCompanyId }
                  return (bTarget.upsert as AnyCallable)(withCompany, ...args)
                }
              }
              const orig = Reflect.get(bTarget, bProp, bReceiver)
              return typeof orig === 'function' ? orig.bind(bTarget) : orig
            }
          })
        }
      }
      const orig = Reflect.get(target, prop, receiver)
      return typeof orig === 'function' ? orig.bind(target) : orig
    }
  })
}

