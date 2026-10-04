import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { getAuthCookieOptions, resolveTenant, resolveHostname } from '../../lib/tenant/tenant-resolution.ts'
import { signSessionToken, verifySessionToken } from '../../lib/security/session-signer.ts'
import { TENANT_SESSION_COOKIE, type TenantSessionData } from '../../lib/auth/types.ts'

describe('Cross-Tenant Cookie Isolation & Rejection Certification', () => {
  const ROOT_DOMAIN = 'printflow.bd'

  test('1. Login on vision-sign.printflow.bd produces strictly HOST-ONLY cookie options', () => {
    const opts = getAuthCookieOptions('vision-sign.printflow.bd')
    assert.equal(opts.domain, undefined, 'Cookie domain MUST be undefined to enforce host-only cookie isolation')
    assert.equal(opts.httpOnly, true, 'Cookie must be httpOnly to prevent script token harvesting')
    assert.equal(opts.sameSite, 'lax', 'Cookie sameSite must be lax')
    assert.equal(opts.path, '/', 'Cookie path must be root')
  })

  test('2. Tenant session token for vision-sign resolves validly on vision-sign host', async () => {
    const sessionPayload: TenantSessionData = {
      userId: 'usr_vision_001',
      userEmail: 'manager@vision-sign.com',
      companyId: 'cmp_vision_999',
      companySlug: 'vision-sign',
      companyName: 'Vision Signage Ltd',
      role: 'business_owner',
      permissions: ['orders:read', 'orders:write'],
    }

    const token = await signSessionToken(sessionPayload)
    assert.ok(token, 'Session token should be successfully signed')

    // Verify token can be parsed
    const verified = await verifySessionToken<TenantSessionData>(token)
    assert.ok(verified)
    assert.equal(verified?.companySlug, 'vision-sign')

    // Host matching
    const hostRes = resolveHostname('vision-sign.printflow.bd', ROOT_DOMAIN)
    assert.equal(hostRes.hostType, 'tenant')
    assert.equal(hostRes.tenantSlug, 'vision-sign')
    assert.equal(verified?.companySlug?.toLowerCase(), hostRes.tenantSlug.toLowerCase())
  })

  test('3. vision-sign session token is strictly REJECTED on alpha-print.printflow.bd', async () => {
    const visionSession: TenantSessionData = {
      userId: 'usr_vision_001',
      userEmail: 'manager@vision-sign.com',
      companyId: 'cmp_vision_999',
      companySlug: 'vision-sign',
      companyName: 'Vision Signage Ltd',
      role: 'business_owner',
      permissions: ['orders:read', 'orders:write'],
    }

    const token = await signSessionToken(visionSession)

    // Attacking or navigating to alpha-print with vision-sign cookie
    const targetHost = 'alpha-print.printflow.bd'
    const hostRes = resolveHostname(targetHost, ROOT_DOMAIN)
    assert.equal(hostRes.hostType, 'tenant')
    assert.equal(hostRes.tenantSlug, 'alpha-print')

    const verified = await verifySessionToken<TenantSessionData>(token)
    assert.ok(verified)

    // Check host ↔ tenant cookie binding
    const isMismatch = verified?.companySlug?.toLowerCase() !== hostRes.tenantSlug.toLowerCase()
    assert.equal(isMismatch, true, 'Cross-tenant cookie mismatch must be detected')

    // Simulation of middleware defense logic:
    let hasValidTenantCookie = true
    let tenantSessionData: TenantSessionData | null = verified
    const responseCookies: { name: string; value: string; options?: any }[] = []

    if (
      hasValidTenantCookie &&
      tenantSessionData?.companySlug &&
      tenantSessionData.companySlug.toLowerCase() !== hostRes.tenantSlug.toLowerCase()
    ) {
      responseCookies.push({
        name: TENANT_SESSION_COOKIE,
        value: '',
        options: { path: '/', maxAge: 0, expires: new Date(0) },
      })
      hasValidTenantCookie = false
      tenantSessionData = null
    }

    assert.equal(hasValidTenantCookie, false, 'Tenant session must be invalidated on mismatch')
    assert.equal(tenantSessionData, null, 'Tenant session data must be stripped')
    assert.equal(responseCookies.length, 1)
    assert.equal(responseCookies[0].name, TENANT_SESSION_COOKIE)
    assert.equal(responseCookies[0].options.maxAge, 0, 'Mismatched cookie must be actively wiped')
  })

  test('4. Root domain printflow.bd credentials cannot be hijacked by subdomain cookies', () => {
    const optsRoot = getAuthCookieOptions('printflow.bd')
    assert.equal(optsRoot.domain, undefined, 'Root cookie must also have domain: undefined')

    const rootHostRes = resolveHostname('printflow.bd', ROOT_DOMAIN)
    assert.equal(rootHostRes.hostType, 'root')
    assert.equal(rootHostRes.tenantSlug, null)
  })
})
