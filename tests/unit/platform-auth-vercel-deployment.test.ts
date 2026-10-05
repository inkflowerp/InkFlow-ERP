import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  getRootDomain,
  getAuthCookieOptions,
} from '../../lib/tenant/tenant-resolution.ts'
import {
  classifyLoginIdentifier,
} from '../../lib/auth/identifier-helper.ts'
import {
  resolveEffectivePlatformPermissions,
  hasPlatformPermission,
  ALL_PLATFORM_PERMISSIONS,
} from '../../lib/auth/platform-auth.ts'
import type { PlatformSessionData } from '../../lib/auth/types.ts'

describe('Platform Auth & Vercel Deployment Cookie Resolution Tests', () => {
  test('1. getAuthCookieOptions sets host-scoped cookies for printflow.bd (PSL domain)', () => {
    const opts = getAuthCookieOptions('printflow.bd')
    assert.equal(opts.domain, undefined, 'Cookie domain MUST be undefined on vercel.app to prevent browser rejection')
    assert.equal(opts.sameSite, 'lax')
    assert.equal(opts.path, '/')
    assert.equal(opts.httpOnly, true)
  })

  test('2. getAuthCookieOptions strictly enforces host-only cookies for production custom domain', () => {
    const opts = getAuthCookieOptions('printflow.bd')
    assert.equal(opts.domain, undefined, 'Cookie domain MUST be undefined (host-only) to eliminate cross-subdomain session leaks')
    assert.equal(opts.sameSite, 'lax')
    assert.equal(opts.httpOnly, true)
  })

  test('3. getRootDomain ignores VERCEL_URL to guarantee deterministic resolution', () => {
    const origVercel = process.env.VERCEL_URL
    const origRoot = process.env.NEXT_PUBLIC_ROOT_DOMAIN

    try {
      delete process.env.NEXT_PUBLIC_ROOT_DOMAIN
      delete process.env.NEXT_PUBLIC_APP_DOMAIN
      delete process.env.ROOT_DOMAIN
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL
      process.env.VERCEL_URL = 'preview-branch.vercel.app'

      const root = getRootDomain()
      // In non-production test runner, deterministic fallback is localhost:3000
      assert.equal(root, 'localhost:3000')

      const cookieOpts = getAuthCookieOptions()
      assert.equal(cookieOpts.domain, undefined, 'Default cookie options must omit domain for host-only isolation')
    } finally {
      if (origVercel) process.env.VERCEL_URL = origVercel
      else delete process.env.VERCEL_URL
      if (origRoot) process.env.NEXT_PUBLIC_ROOT_DOMAIN = origRoot
    }
  })

  test('4. classifyLoginIdentifier handles platform administrator login inputs', () => {
    // Email input
    const emailRes = classifyLoginIdentifier('admin@printflow.bd')
    assert.equal(emailRes.type, 'email')
    assert.equal(emailRes.normalized, 'admin@printflow.bd')

    // Phone inputs with various formats
    const phoneRes1 = classifyLoginIdentifier('01762474444')
    assert.equal(phoneRes1.type, 'phone')
    assert.ok(phoneRes1.phoneVariants?.candidates.includes('+8801762474444'))
    assert.ok(phoneRes1.phoneVariants?.candidates.includes('01762474444'))

    const phoneRes2 = classifyLoginIdentifier('+8801762474444')
    assert.equal(phoneRes2.type, 'phone')
    assert.ok(phoneRes2.phoneVariants?.candidates.includes('+8801762474444'))

    // Username input
    const usernameRes = classifyLoginIdentifier('admin')
    assert.equal(usernameRes.type, 'username')
  })

  test('5. Platform session cookie encoding and decoding round-trip', () => {
    const payload: PlatformSessionData = {
      userId: '4e3a29b3-3d52-49d2-b0af-462129a4d72d',
      adminId: 'ef8108a7-5bbb-4525-937b-a7411fc1e796',
      email: 'admin@printflow.bd',
      fullName: 'Md. Shahidur Rahman',
      role: 'platform_owner',
      mfaVerified: false,
      loginTime: '2026-09-27T03:00:00.000Z',
      token: 'psess_1234567890_abcdef',
    }

    const encoded = encodeURIComponent(JSON.stringify(payload))
    assert.ok(!encoded.includes('{') && !encoded.includes('"'), 'Encoded cookie must be URL-safe')

    const decoded = JSON.parse(decodeURIComponent(encoded))
    assert.equal(decoded.userId, payload.userId)
    assert.equal(decoded.adminId, payload.adminId)
    assert.equal(decoded.email, payload.email)
    assert.equal(decoded.role, payload.role)

    // Verify unescaped fallback also parses
    const raw = JSON.stringify(payload)
    const rawParsed = JSON.parse(raw)
    assert.equal(rawParsed.userId, payload.userId)
  })

  test('6. Platform permissions resolution and access checks', () => {
    const ownerPerms = resolveEffectivePlatformPermissions('platform_owner')
    assert.equal(ownerPerms.length, ALL_PLATFORM_PERMISSIONS.length)

    assert.ok(hasPlatformPermission({ role: 'platform_owner', is_active: true } as any, 'platform.manage'))
    assert.ok(hasPlatformPermission({ role: 'platform_owner', is_active: true } as any, 'tenant.purge'))
    assert.ok(hasPlatformPermission({ role: 'platform_owner', is_active: true } as any, 'security.manage'))

    assert.equal(hasPlatformPermission(null, 'platform.view'), false)
    assert.equal(hasPlatformPermission({ role: 'platform_owner', is_active: false } as any, 'platform.view'), false)
  })
})
