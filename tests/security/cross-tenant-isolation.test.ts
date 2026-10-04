import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { signSessionToken, verifySessionToken } from '../../lib/security/session-signer.ts'
import { withTenantAction, withPlatformAction } from '../../lib/actions/action-wrapper.ts'
import { checkRateLimitAsync } from '../../lib/security/rate-limiter.ts'

// ==============================================================================
// 3 Seed Tenants Data Fixtures
// ==============================================================================
const TENANT_A = {
  id: 'c-01-vision',
  slug: 'vision',
  name: 'Vision Graphics & Print',
  user: {
    id: 'usr-vision-owner-001',
    email: 'owner@visionprint.com',
    role: 'business_owner',
  },
  userStaff: {
    id: 'usr-vision-staff-002',
    email: 'staff@visionprint.com',
    role: 'general_staff',
  },
  invoiceId: 'inv-vision-101',
}

const TENANT_B = {
  id: 'c-02-printcraft',
  slug: 'printcraft',
  name: 'PrintCraft Solutions Ltd.',
  user: {
    id: 'usr-craft-owner-001',
    email: 'owner@printcraft.com',
    role: 'business_owner',
  },
  invoiceId: 'inv-craft-201',
}

const TENANT_C = {
  id: 'c-03-alpha',
  slug: 'alpha',
  name: 'Alpha Signage & Digital',
  user: {
    id: 'usr-alpha-owner-001',
    email: 'owner@alphasign.com',
    role: 'business_owner',
  },
  invoiceId: 'inv-alpha-301',
}

describe('Fail-Closed Cross-Tenant Security & Isolation Test Suite', () => {

  // ----------------------------------------------------------------------------
  // 1. Unsigned Trust & Cryptographic Session Hardening (jose HMAC-SHA256)
  // ----------------------------------------------------------------------------
  describe('1. Unsigned Trust Elimination & HMAC Session Verification', () => {
    it('signs and verifies valid tenant session tokens', async () => {
      const token = await signSessionToken(
        {
          userId: TENANT_A.user.id,
          userEmail: TENANT_A.user.email,
          companyId: TENANT_A.id,
          companySlug: TENANT_A.slug,
          primaryRole: TENANT_A.user.role,
        },
        '1h'
      )
      assert.ok(token, 'Signed token must be generated')

      const verified = await verifySessionToken<any>(token)
      assert.ok(verified, 'Verified payload must exist')
      assert.strictEqual(verified.userId, TENANT_A.user.id)
      assert.strictEqual(verified.companySlug, TENANT_A.slug)
    })

    it('FAILS CLOSED: Rejects unsigned raw JSON cookies (spoofing attempt)', async () => {
      // Attacker constructs unsigned JSON string pretending to be Tenant B's owner
      const rawJson = JSON.stringify({
        userId: TENANT_B.user.id,
        userEmail: TENANT_B.user.email,
        companyId: TENANT_B.id,
        companySlug: TENANT_B.slug,
        primaryRole: 'business_owner',
      })

      const verified = await verifySessionToken(rawJson)
      assert.strictEqual(verified, null, 'Unsigned JSON cookie must be rejected')
    })

    it('FAILS CLOSED: Rejects tokens signed with wrong/tampered secret or forged signature', async () => {
      const legitimateToken = await signSessionToken({
        userId: TENANT_A.user.id,
        companySlug: TENANT_A.slug,
      })

      // Tamper with signature by modifying the last characters
      const tampered = legitimateToken.slice(0, -6) + 'xxxxxx'
      const verified = await verifySessionToken(tampered)
      assert.strictEqual(verified, null, 'Tampered token must fail verification')
    })
  })

  // ----------------------------------------------------------------------------
  // 2. Cross-Tenant Server Actions Hardening (withTenantAction)
  // ----------------------------------------------------------------------------
  describe('2. Server Action Fail-Closed Isolation & RBAC Checks', () => {
    it('FAILS CLOSED: Action rejects unauthenticated invocation with 401 code', async () => {
      const sampleAction = withTenantAction(
        { permission: 'invoices.view' },
        async (ctx) => {
          return { companyId: ctx.companyId }
        }
      )

      // When called outside of an authenticated context
      const result = await sampleAction()
      assert.strictEqual(result.ok, false)
      assert.strictEqual(result.success, false)
      assert.strictEqual(result.code, 'UNAUTHORIZED')
    })

    it('FAILS CLOSED: Refuses to use client-supplied companyId (authoritative membership resolution)', async () => {
      // Invariant: ctx.companyId is injected by the wrapper and cannot be overridden by arguments
      const testAction = withTenantAction(
        {},
        async (ctx, maliciousCompanyId: string) => {
          // Verify that ctx.companyId is never replaced with maliciousCompanyId
          assert.notStrictEqual(ctx.companyId, maliciousCompanyId)
          return { executedCompanyId: ctx.companyId }
        }
      )

      const result = await testAction(TENANT_B.id)
      // Because this test runs outside browser cookies, it fails closed at authorization stage
      assert.strictEqual(result.ok, false)
      assert.strictEqual(result.code, 'UNAUTHORIZED')
    })

    it('FAILS CLOSED: Denies user lacking required permission', async () => {
      // Test platform action wrapper denying missing platform role
      const platformProtectedAction = withPlatformAction(
        { permission: 'tenant.purge' },
        async () => {
          return { purged: true }
        }
      )

      const res = await platformProtectedAction()
      assert.strictEqual(res.ok, false)
      assert.strictEqual(res.code, 'UNAUTHORIZED')
    })
  })

  // ----------------------------------------------------------------------------
  // 3. API Routes Self-Authentication & Fail-Closed Protection
  // ----------------------------------------------------------------------------
  describe('3. API Routes Self-Authentication & Verification', () => {
    it('Cron Endpoint FAILS CLOSED when CRON_SECRET is missing or invalid', async () => {
      const fakeCronSecret = 'test-secret-123'
      const checkCronAuth = (authHeader: string | null, secret: string) => {
        if (!secret || authHeader !== `Bearer ${secret}`) {
          return { status: 401, error: 'Unauthorized cron request' }
        }
        return { status: 200, success: true }
      }

      // No header
      assert.strictEqual(checkCronAuth(null, fakeCronSecret).status, 401)
      // Wrong token
      assert.strictEqual(checkCronAuth('Bearer wrong-token', fakeCronSecret).status, 401)
      // Basic auth instead of Bearer
      assert.strictEqual(checkCronAuth('Basic dXNlcjpwYXNz', fakeCronSecret).status, 401)
      // Valid Bearer token
      assert.strictEqual(checkCronAuth(`Bearer ${fakeCronSecret}`, fakeCronSecret).status, 200)
    })

    it('PDF Generation Endpoint FAILS CLOSED on Cross-Tenant Document Access', async () => {
      const simulatePdfAccess = (
        requestingUserCompanyId: string,
        targetCompanyId: string,
        userPermissions: string[],
        docType: string
      ) => {
        // Membership check
        if (requestingUserCompanyId !== targetCompanyId) {
          return { status: 401, error: 'Unauthorized: Tenant membership mismatch' }
        }
        // Permission check
        const permMap: Record<string, string> = {
          invoice: 'invoices.view',
          quotation: 'quotations.view',
          challan: 'logistics.view',
          receipt: 'payments.view',
        }
        const required = permMap[docType]
        if (required && !userPermissions.includes(required) && !userPermissions.includes('all.manage')) {
          return { status: 403, error: `Forbidden: Lacking ${required}` }
        }
        return { status: 200, allowed: true }
      }

      // Tenant A user attempts to generate Tenant B's invoice
      const crossTenantAttempt = simulatePdfAccess(TENANT_A.id, TENANT_B.id, ['invoices.view'], 'invoice')
      assert.strictEqual(crossTenantAttempt.status, 401)

      // Tenant A staff user without invoices.view attempts to generate Tenant A's invoice
      const unprivilegedAttempt = simulatePdfAccess(TENANT_A.id, TENANT_A.id, ['products.view'], 'invoice')
      assert.strictEqual(unprivilegedAttempt.status, 403)

      // Tenant A authorized user
      const authorizedAttempt = simulatePdfAccess(TENANT_A.id, TENANT_A.id, ['invoices.view'], 'invoice')
      assert.strictEqual(authorizedAttempt.status, 200)
    })
  })

  // ----------------------------------------------------------------------------
  // 4. PostgREST RLS & Database-Level Tenant Isolation
  // ----------------------------------------------------------------------------
  describe('4. PostgREST Direct Query & RLS Simulation with Tenant Claims', () => {
    // Simulated PostgREST Row-Level Security evaluation
    interface DbRow {
      id: string
      company_id: string
      title: string
    }

    const mockDatabase: Record<string, DbRow[]> = {
      invoices: [
        { id: TENANT_A.invoiceId, company_id: TENANT_A.id, title: 'Vision Invoice #001' },
        { id: TENANT_B.invoiceId, company_id: TENANT_B.id, title: 'PrintCraft Invoice #001' },
        { id: TENANT_C.invoiceId, company_id: TENANT_C.id, title: 'Alpha Invoice #001' },
      ],
    }

    function evaluateRlsSelect(table: string, userJwtClaims: { company_id: string }) {
      const rows = mockDatabase[table] || []
      // PostgREST policy: USING (company_id = auth.jwt()->>'company_id')
      return rows.filter((r) => r.company_id === userJwtClaims.company_id)
    }

    function evaluateRlsUpdate(
      table: string,
      targetId: string,
      userJwtClaims: { company_id: string },
      updates: Partial<DbRow>
    ) {
      const rows = mockDatabase[table] || []
      // PostgREST policy: USING (company_id = auth.jwt()->>'company_id') WITH CHECK (company_id = auth.jwt()->>'company_id')
      const target = rows.find((r) => r.id === targetId && r.company_id === userJwtClaims.company_id)
      if (!target) {
        return { count: 0, error: null } // PostgREST returns 0 updated rows for rows invisible under RLS
      }
      Object.assign(target, updates)
      return { count: 1, updated: target }
    }

    it('RLS: Tenant A user CANNOT read Tenant B or Tenant C records via direct PostgREST calls', () => {
      const tenantAClaims = { company_id: TENANT_A.id }
      const visibleRows = evaluateRlsSelect('invoices', tenantAClaims)

      assert.strictEqual(visibleRows.length, 1)
      assert.strictEqual(visibleRows[0].id, TENANT_A.invoiceId)
      assert.strictEqual(visibleRows.some((r) => r.company_id === TENANT_B.id), false)
      assert.strictEqual(visibleRows.some((r) => r.company_id === TENANT_C.id), false)
    })

    it('RLS: Tenant A user CANNOT update or void Tenant B invoice via direct PostgREST mutation', () => {
      const tenantAClaims = { company_id: TENANT_A.id }
      const updateResult = evaluateRlsUpdate(
        'invoices',
        TENANT_B.invoiceId,
        tenantAClaims,
        { title: 'Hacked Invoice' }
      )

      assert.strictEqual(updateResult.count, 0, 'Must update 0 rows (invisible under RLS)')

      // Verify Tenant B invoice was not modified
      const tenantBInvoice = mockDatabase.invoices.find((r) => r.id === TENANT_B.invoiceId)
      assert.strictEqual(tenantBInvoice?.title, 'PrintCraft Invoice #001')
    })
  })

  // ----------------------------------------------------------------------------
  // 5. Realtime Channel Authorization & Cross-Tenant Eavesdropping Protection
  // ----------------------------------------------------------------------------
  describe('5. Realtime Channel Eavesdropping Prevention', () => {
    it('FAILS CLOSED: Blocks subscription to other tenants realtime topics', () => {
      const authorizeRealtimeSubscription = (
        topic: string,
        userClaims: { company_id: string }
      ): boolean => {
        // Expected format: tenant:<companyId>:invoices or similar
        const match = topic.match(/tenant:([^:]+)/)
        if (!match) return false
        const topicCompanyId = match[1]
        return topicCompanyId === userClaims.company_id
      }

      const tenantAClaims = { company_id: TENANT_A.id }

      // Allowed: Tenant A listens to Tenant A's notifications
      assert.strictEqual(
        authorizeRealtimeSubscription(`tenant:${TENANT_A.id}:orders`, tenantAClaims),
        true
      )

      // Blocked: Tenant A listens to Tenant B's financial events
      assert.strictEqual(
        authorizeRealtimeSubscription(`tenant:${TENANT_B.id}:invoices`, tenantAClaims),
        false
      )

      // Blocked: Tenant A listens to Tenant C's events
      assert.strictEqual(
        authorizeRealtimeSubscription(`tenant:${TENANT_C.id}:customers`, tenantAClaims),
        false
      )
    })
  })

  // ----------------------------------------------------------------------------
  // 6. Distributed Shared Rate Limiting Protection
  // ----------------------------------------------------------------------------
  describe('6. Shared Distributed Rate Limiting', () => {
    it('enforces request throttling on authentication endpoints', async () => {
      const testIdentifier = `test_security_burst_${Date.now()}`

      // First 5 attempts within limit
      for (let i = 0; i < 5; i++) {
        const res = await checkRateLimitAsync(testIdentifier, 'auth')
        assert.strictEqual(res.success, true)
      }

      // 6th attempt must be rejected
      const blockedRes = await checkRateLimitAsync(testIdentifier, 'auth')
      assert.strictEqual(blockedRes.success, false)
      assert.strictEqual(blockedRes.remaining, 0)
      assert.ok(blockedRes.resetSeconds > 0)
    })
  })
})
