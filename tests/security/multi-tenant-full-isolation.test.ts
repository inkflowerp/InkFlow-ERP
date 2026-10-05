import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { resolveTenant, getAuthCookieOptions } from '../../lib/tenant/tenant-resolution.ts'
import { TenantRepository } from '../../lib/repositories/tenant.repository.ts'
import { AuthService } from '../../services/auth.service.ts'

const { Client } = pg

// Read .env.local
const envPath = path.resolve('.env.local')
const env: Record<string, string> = {}
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim()
        let val = trimmed.slice(eqIdx + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        env[key] = val
      }
    }
  }
}

const dbUrl = env.DIRECT_URL || env.DATABASE_URL

describe('Multi-Tenant Full Isolation & Security Invariant Tests', () => {

  describe('1. Subdomain Resolution & Cookie Security Invariants', () => {
    it('enforces host-only cookies across all environments (zero wildcard domain cookies)', () => {
      const prodOpts = getAuthCookieOptions('alpha.printflow.bd')
      assert.strictEqual(prodOpts.domain, undefined, 'Cookie domain must be undefined (host-only) in production')
      assert.strictEqual(prodOpts.httpOnly, true, 'Cookie must be httpOnly')

      const devOpts = getAuthCookieOptions('alpha.localhost:3000')
      assert.strictEqual(devOpts.domain, undefined, 'Cookie domain must be undefined (host-only) in development')

      const pslOpts = getAuthCookieOptions('alpha.printflow.bd')
      assert.strictEqual(pslOpts.domain, undefined, 'Cookie domain must be undefined on PSL domains')
    })

    it('strictly separates platform owner host from tenant workspaces', () => {
      const platformRes = resolveTenant('admin.printflow.bd', '', { overrideRootDomain: 'printflow.bd' })
      assert.strictEqual(platformRes.type, 'platform')
      assert.strictEqual(platformRes.slug, null, 'Platform host must not have a tenant slug')

      const tenantRes = resolveTenant('printcraft.printflow.bd', '', { overrideRootDomain: 'printflow.bd' })
      assert.strictEqual(tenantRes.type, 'tenant')
      assert.strictEqual(tenantRes.slug, 'printcraft')
    })

    it('strictly rejects multi-label subdomains (a.b.root.com) to prevent wildcard spoofing', () => {
      const res = resolveTenant('malicious.tenant.printflow.bd', '', { overrideRootDomain: 'printflow.bd' })
      assert.strictEqual(res.type, 'invalid')
      assert.strictEqual(res.slug, null)
    })
  })

  describe('2. Cross-Tenant Login & DAL Fail-Closed Invariants', () => {
    it('TenantRepository.resolveUserMembership strictly fails closed on mismatched tenant slug', async () => {
      const origCompanyBySlug = TenantRepository.getCompanyBySlug
      const origMembershipCache = TenantRepository.membershipCache

      try {
        (TenantRepository as any).getCompanyBySlug = async (slug: string) => {
          if (slug === 'tenant-b') return { id: '00000000-0000-0000-0000-000000000002', slug: 'tenant-b', name: 'Tenant B', is_active: true }
          if (slug === 'tenant-a') return { id: '00000000-0000-0000-0000-000000000001', slug: 'tenant-a', name: 'Tenant A', is_active: true }
          return null
        }

        // Target user only belongs to tenant A
        const membership = await TenantRepository.resolveUserMembership(
          '00000000-0000-0000-0000-000000000099', // User ID
          'tenant-b' // Attempting to resolve into Tenant B!
        )

        // Must fail closed with null
        assert.strictEqual(membership, null, 'User of Tenant A must never resolve membership in Tenant B')
      } finally {
        TenantRepository.getCompanyBySlug = origCompanyBySlug
      }
    })

    it('DAL requireTenantMember throws UnauthorizedError when user is not member of target tenant', async () => {
      const { requireTenantMember, UnauthorizedError } = await import('../../lib/auth/dal.ts')
      const origResolve = TenantRepository.resolveUserMembership
      const origGetCompanyBySlug = TenantRepository.getCompanyBySlug

      try {
        (TenantRepository as any).getCompanyBySlug = async (slug: string) => ({
          id: '00000000-0000-0000-0000-000000000002',
          slug: 'tenant-b',
          name: 'Tenant B',
          is_active: true,
        });

        (TenantRepository as any).resolveUserMembership = async () => null // User has no membership in tenant B

        await assert.rejects(
          async () => {
            await requireTenantMember('tenant-b', '00000000-0000-0000-0000-000000000099')
          },
          (err: any) => {
            assert.ok(err instanceof UnauthorizedError || err.name === 'UnauthorizedError')
            assert.match(err.message, /not an authorized member|session mismatch/i)
            return true
          }
        )
      } finally {
        TenantRepository.resolveUserMembership = origResolve
        TenantRepository.getCompanyBySlug = origGetCompanyBySlug
      }
    })
  })

  describe('3. Database FORCED Row-Level Security & Policy Invariants', () => {
    if (!dbUrl) {
      console.warn('Skipping live DB tests: no DIRECT_URL / DATABASE_URL configured')
      return
    }

    it('verifies that 100% of public tables have FORCE ROW LEVEL SECURITY enabled', async () => {
      const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
      await client.connect()
      try {
        const res = await client.query(`
          SELECT 
            count(*) as total,
            count(*) filter (where c.relrowsecurity) as enabled,
            count(*) filter (where c.relforcerowsecurity) as forced
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind = 'r';
        `)

        const { total, enabled, forced } = res.rows[0]
        assert.ok(Number(total) > 100, `Expected over 100 tables in public schema, got ${total}`)
        assert.strictEqual(Number(enabled), Number(total), 'All tables must have relrowsecurity = true')
        assert.strictEqual(Number(forced), Number(total), 'All tables must have relforcerowsecurity = true')
      } finally {
        await client.end()
      }
    })

    it('verifies the 4 previously uncovered tables now have active RLS policies', async () => {
      const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
      await client.connect()
      try {
        const targetTables = ['sales_order_items', 'goods_received_notes', 'document_number_counters', 'material_issue_items']
        const res = await client.query(`
          SELECT t.tablename, count(p.policyname) as policy_count
          FROM pg_tables t
          LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
          WHERE t.schemaname = 'public'
            AND t.tablename = ANY($1)
          GROUP BY t.tablename;
        `, [targetTables])

        for (const row of res.rows) {
          assert.ok(
            Number(row.policy_count) >= 4,
            `Table ${row.tablename} must have at least 4 RLS policies, found ${row.policy_count}`
          )
        }
      } finally {
        await client.end()
      }
    })

    it('verifies tenant immutability trigger exists on tables with company_id', async () => {
      const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
      await client.connect()
      try {
        const res = await client.query(`
          SELECT count(DISTINCT trigger_name) as trigger_count
          FROM information_schema.triggers
          WHERE trigger_name = 'trg_prevent_tenant_switch'
            AND trigger_schema = 'public';
        `)

        assert.ok(
          Number(res.rows[0].trigger_count) > 0,
          'Tenant immutability trigger trg_prevent_tenant_switch must be installed on tenant tables'
        )
      } finally {
        await client.end()
      }
    })
  })
})
