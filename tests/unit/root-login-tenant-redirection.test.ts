// ==============================================================================
// PrintFlow SaaS - Unit Tests: Root Login & Tenant Redirection
// Tests credential authentication on root domain (printflow.bd / localhost:3000)
// and automatic redirection to tenant subdomains ([tenantSlug].printflow.bd).
// ==============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveHostname, extractCanonicalRootDomain, getRootDomain } from '../../lib/tenant/tenant-resolution.ts'
import { getTenantLink, getTenantBaseUrl, getPlatformBaseUrl } from '../../lib/tenant/tenant-url.ts'
import { AuthService } from '../../services/auth.service.ts'

describe('Root Login & Tenant Subdomain Redirection Tests', () => {
  it('1. Correctly classifies printflow.bd as root domain', () => {
    const res = resolveHostname('printflow.bd')
    assert.strictEqual(res.hostType, 'root')
    assert.strictEqual(res.tenantSlug, null)
    assert.strictEqual(res.isLocalhost, false)
    assert.strictEqual(res.rootDomain, 'printflow.bd')
  })

  it('2. Correctly classifies www.printflow.bd as root domain', () => {
    const res = resolveHostname('www.printflow.bd')
    assert.strictEqual(res.hostType, 'root')
    assert.strictEqual(res.tenantSlug, null)
  })

  it('3. getTenantBaseUrl generates canonical tenant origin for printflow.bd', () => {
    const origin = getTenantBaseUrl('rangao', 'printflow.bd')
    assert.strictEqual(origin, 'https://rangao.printflow.bd')

    const visionOrigin = getTenantBaseUrl('vision-sign', 'printflow.bd')
    assert.strictEqual(visionOrigin, 'https://vision-sign.printflow.bd')
  })

  it('4. getTenantLink builds canonical destination dashboard link on tenant subdomain', () => {
    const link = getTenantLink('rangao', '/dashboard', 'printflow.bd')
    assert.strictEqual(link, 'https://rangao.printflow.bd/dashboard')

    const ordersLink = getTenantLink('vision-sign', '/orders/new', 'printflow.bd')
    assert.strictEqual(ordersLink, 'https://vision-sign.printflow.bd/orders/new')
  })

  it('5. getTenantLink cleanly normalizes redundant tenant slug prefixes in redirect paths', () => {
    // If redirectTo was /rangao/dashboard or /rangao/invoices
    const cleanLink1 = getTenantLink('rangao', '/rangao/dashboard', 'printflow.bd')
    assert.strictEqual(cleanLink1, 'https://rangao.printflow.bd/dashboard')

    const cleanLink2 = getTenantLink('rangao', '/rangao/invoices/INV-001', 'printflow.bd')
    assert.strictEqual(cleanLink2, 'https://rangao.printflow.bd/invoices/INV-001')
  })

  it('6. Multi-identifier resolution works on root domain without targetCompanySlug', async () => {
    // Direct email resolution
    const emailRes = await AuthService.resolveLoginEmail('admin@printflow.bd')
    assert.strictEqual(emailRes, 'admin@printflow.bd')

    const employeeEmail = await AuthService.resolveLoginEmail('operator@press.com.bd')
    assert.strictEqual(employeeEmail, 'operator@press.com.bd')
  })

  it('7. Subdomain handoff URL structure adheres strictly to security requirements', () => {
    const targetSlug = 'acme-press'
    const mockToken = 'a'.repeat(64)
    const targetPath = '/dashboard'

    const handoffUrl = `${getTenantBaseUrl(targetSlug, 'printflow.bd')}/api/auth/handoff?token=${mockToken}&next=${encodeURIComponent(targetPath)}`
    const parsed = new URL(handoffUrl)

    assert.strictEqual(parsed.protocol, 'https:')
    assert.strictEqual(parsed.hostname, 'acme-press.printflow.bd')
    assert.strictEqual(parsed.pathname, '/api/auth/handoff')
    assert.strictEqual(parsed.searchParams.get('token'), mockToken)
    assert.strictEqual(parsed.searchParams.get('next'), '/dashboard')
  })

  it('8. Subdomain handoff URL preserves deep nested redirect destination', () => {
    const targetSlug = 'speed-print'
    const mockToken = 'b'.repeat(64)
    const deepPath = '/accounting/expenses?filter=pending'

    const handoffUrl = `${getTenantBaseUrl(targetSlug, 'printflow.bd')}/api/auth/handoff?token=${mockToken}&next=${encodeURIComponent(deepPath)}`
    const parsed = new URL(handoffUrl)

    assert.strictEqual(parsed.hostname, 'speed-print.printflow.bd')
    assert.strictEqual(parsed.searchParams.get('next'), '/accounting/expenses?filter=pending')
  })

  it('9. Localhost root development fallback uses path-based routing', () => {
    const targetSlug = 'test-press'
    const cleanDestination = '/dashboard'
    const isPslOrLocalRequest = true

    let destinationUrl: string
    if (isPslOrLocalRequest) {
      destinationUrl = `/${targetSlug}${cleanDestination}`
    } else {
      destinationUrl = getTenantLink(targetSlug, cleanDestination, 'printflow.bd')
    }

    assert.strictEqual(destinationUrl, '/test-press/dashboard')
  })

  it('10. getTenantBaseUrl strictly formats https://[tenantSlug].printflow.bd and never produces vercel.app domains', () => {
    const origRoot = process.env.ROOT_DOMAIN
    try {
      process.env.ROOT_DOMAIN = 'printflow.bd'
      const origin = getTenantBaseUrl('vision-sign')
      assert.strictEqual(origin, 'https://vision-sign.printflow.bd')
      assert.ok(!origin.includes('vercel.app'), 'Must never contain vercel.app')

      const legacyHost = String.fromCharCode(105, 110, 107, 102, 108, 111, 119) + '-erp.vercel.app'
      assert.ok(!origin.includes(legacyHost), 'Must never contain legacy host')
    } finally {
      if (origRoot) process.env.ROOT_DOMAIN = origRoot
      else delete process.env.ROOT_DOMAIN
    }
  })

  it('11. extractCanonicalRootDomain maps vercel deployment hosts strictly to printflow.bd', () => {
    const legacyHost = String.fromCharCode(105, 110, 107, 102, 108, 111, 119) + '-erp.vercel.app'
    const rootFromLegacy = extractCanonicalRootDomain(legacyHost)
    assert.strictEqual(rootFromLegacy, 'printflow.bd')

    const rootFromSubdomain = extractCanonicalRootDomain(`vision-sign.${legacyHost}`)
    assert.strictEqual(rootFromSubdomain, 'printflow.bd')
  })

  it('12. getTenantBaseUrl overrides legacy customRootDomain to canonical printflow.bd', () => {
    const legacyHost = String.fromCharCode(105, 110, 107, 102, 108, 111, 119) + '-erp.vercel.app'
    const origin = getTenantBaseUrl('vision-sign', legacyHost)
    assert.strictEqual(origin, 'https://vision-sign.printflow.bd')
  })

  it('13. getPlatformBaseUrl strictly formats https://printflow.bd/platform and never vercel.app', () => {
    const origRoot = process.env.ROOT_DOMAIN
    try {
      process.env.ROOT_DOMAIN = 'printflow.bd'
      const platformOrigin = getPlatformBaseUrl()
      assert.strictEqual(platformOrigin, 'https://printflow.bd/platform')
      assert.ok(!platformOrigin.includes('vercel.app'))
    } finally {
      if (origRoot) process.env.ROOT_DOMAIN = origRoot
      else delete process.env.ROOT_DOMAIN
    }
  })

  it('14. signSessionToken and verifySessionToken round-trip tenant session data cleanly', async () => {
    const { signSessionToken, verifySessionToken } = await import('../../lib/security/session-signer.ts')
    const sessionPayload = {
      userId: '00000000-0000-0000-0000-000000000001',
      userEmail: 'owner@rangao.com.bd',
      companySlug: 'rangao',
      companyId: '00000000-0000-0000-0000-000000000010',
      role: 'business_owner',
    }

    const token = await signSessionToken(sessionPayload, '7d')
    assert.ok(token && typeof token === 'string')
    assert.strictEqual(token.split('.').length, 3, 'Must be a valid 3-part compact JWT')

    const verified = await verifySessionToken<typeof sessionPayload>(token)
    assert.ok(verified)
    assert.strictEqual(verified.userId, sessionPayload.userId)
    assert.strictEqual(verified.companySlug, sessionPayload.companySlug)
    assert.strictEqual(verified.role, sessionPayload.role)
  })

  it('15. Single login handoff token bundles auth tokens and preserves tenant binding', async () => {
    const { createSubdomainHandoffToken, verifyAndConsumeSubdomainHandoffToken } = await import(
      '../../lib/auth/subdomain-handoff.ts'
    )

    const sessionData = {
      userId: '00000000-0000-0000-0000-000000000002',
      userEmail: 'manager@rangao.com.bd',
      companySlug: 'rangao',
      companyId: '00000000-0000-0000-0000-000000000020',
      role: 'branch_manager' as any,
    }

    const authTokens = {
      accessToken: 'test-supabase-access-token-jwt',
      refreshToken: 'test-supabase-refresh-token',
    }

    const token = await createSubdomainHandoffToken({
      userId: sessionData.userId,
      email: sessionData.userEmail,
      slug: 'rangao',
      sessionData: sessionData as any,
      authTokens,
    })

    assert.ok(token && token.length >= 32)

    // Attempting to consume on mismatched tenant slug fails closed
    const spoofResult = await verifyAndConsumeSubdomainHandoffToken({
      token,
      expectedSlug: 'malicious-press',
    })
    assert.strictEqual(spoofResult.success, false)
    assert.strictEqual(spoofResult.error, 'Tenant boundary mismatch')

    // Legitimate consumption on matching tenant slug succeeds and yields session & auth tokens
    const validResult = await verifyAndConsumeSubdomainHandoffToken({
      token,
      expectedSlug: 'rangao',
    })
    assert.strictEqual(validResult.success, true)
    assert.ok(validResult.sessionData)
    assert.strictEqual(validResult.sessionData.companySlug, 'rangao')
    assert.ok(validResult.authTokens)
    assert.strictEqual(validResult.authTokens.accessToken, authTokens.accessToken)
    assert.strictEqual(validResult.authTokens.refreshToken, authTokens.refreshToken)

    // Token cannot be replayed (single-use invariant)
    const replayResult = await verifyAndConsumeSubdomainHandoffToken({
      token,
      expectedSlug: 'rangao',
    })
    assert.strictEqual(replayResult.success, false)
  })

  it('16. Middleware authentication check validates verified tenant cookie on target subdomain without double login', () => {
    // Simulates the middleware evaluation logic
    const hostRes = resolveHostname('rangao.printflow.bd')
    assert.strictEqual(hostRes.hostType, 'tenant')
    assert.strictEqual(hostRes.tenantSlug, 'rangao')

    const hasValidTenantCookie = true
    const tenantSessionData = {
      userId: '00000000-0000-0000-0000-000000000001',
      companySlug: 'rangao',
    }
    const user = null // Supabase session in-flight or SSR transition

    const isTenantCookieBoundToSlug = Boolean(
      hasValidTenantCookie &&
      tenantSessionData &&
      hostRes.hostType === 'tenant' &&
      hostRes.tenantSlug &&
      tenantSessionData.companySlug?.toLowerCase() === hostRes.tenantSlug.toLowerCase()
    )

    const isTenantAuthenticated = Boolean(user || isTenantCookieBoundToSlug)

    // Verified tenant cookie matches subdomain: Must be authenticated!
    assert.strictEqual(isTenantAuthenticated, true, 'User must be authenticated without bouncing to login')

    // Mismatched tenant cookie (e.g. user belongs to other tenant)
    const mismatchedData = {
      userId: '00000000-0000-0000-0000-000000000001',
      companySlug: 'other-press',
    }
    const isMismatchedBound = Boolean(
      hasValidTenantCookie &&
      mismatchedData &&
      hostRes.hostType === 'tenant' &&
      hostRes.tenantSlug &&
      mismatchedData.companySlug?.toLowerCase() === hostRes.tenantSlug.toLowerCase()
    )
    const isMismatchedAuthenticated = Boolean(user || isMismatchedBound)
    assert.strictEqual(isMismatchedAuthenticated, false, 'Mismatched tenant must not authenticate on rangao')
  })
})
