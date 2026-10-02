import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveTenant,
  isValidSlugFormat,
  isReservedSlug,
  normalizeSlug,
  normalizeHost,
  getAuthCookieOptions,
} from '../../lib/tenant/tenant-resolution.ts'

describe('Authoritative Tenant Resolution (resolveTenant) Unit Tests', () => {
  const ROOT_DOMAIN = 'inkflowerp.com'

  test('1. Normalizes standard production tenant subdomain', () => {
    const res = resolveTenant('vision.inkflowerp.com', '', { overrideRootDomain: ROOT_DOMAIN })
    assert.equal(res.type, 'tenant')
    assert.equal(res.slug, 'vision')
    assert.equal(res.rootDomain, 'inkflowerp.com')
    assert.equal(res.isCustomDomain, false)
    assert.equal(res.isFallback, false)
  })

  test('2. Normalizes uppercase and mixed-case hostnames to lowercase', () => {
    const res = resolveTenant('VISION-SIGN.INKFLOWERP.COM', '', { overrideRootDomain: ROOT_DOMAIN })
    assert.equal(res.type, 'tenant')
    assert.equal(res.slug, 'vision-sign')
  })

  test('3. Strips port numbers cleanly', () => {
    const res = resolveTenant('vision.inkflowerp.com:8443', '', { overrideRootDomain: ROOT_DOMAIN })
    assert.equal(res.type, 'tenant')
    assert.equal(res.slug, 'vision')
    assert.equal(res.hostname, 'vision.inkflowerp.com')
  })

  test('4. Strips trailing dots (FQDN format)', () => {
    const res = resolveTenant('vision.inkflowerp.com.', '', { overrideRootDomain: ROOT_DOMAIN })
    assert.equal(res.type, 'tenant')
    assert.equal(res.slug, 'vision')
  })

  test('5. Identifies platform host (admin.ROOT_DOMAIN)', () => {
    const res = resolveTenant('admin.inkflowerp.com', '', { overrideRootDomain: ROOT_DOMAIN })
    assert.equal(res.type, 'platform')
    assert.equal(res.slug, null)
  })

  test('6. Identifies platform host alias (platform.ROOT_DOMAIN)', () => {
    const res = resolveTenant('platform.inkflowerp.com', '', { overrideRootDomain: ROOT_DOMAIN })
    assert.equal(res.type, 'platform')
    assert.equal(res.slug, null)
  })

  test('7. Identifies root marketing domain (inkflowerp.com & www.inkflowerp.com)', () => {
    const res1 = resolveTenant('inkflowerp.com', '', { overrideRootDomain: ROOT_DOMAIN })
    assert.equal(res1.type, 'marketing')
    assert.equal(res1.slug, null)

    const res2 = resolveTenant('www.inkflowerp.com', '', { overrideRootDomain: ROOT_DOMAIN })
    assert.equal(res2.type, 'marketing')
    assert.equal(res2.slug, null)
  })

  test('8. Rejects reserved system subdomains with not_found', () => {
    const reservedCases = ['api', 'auth', 'login', 'billing', 'mail', 'smtp', 'status', 'cdn', 'static', 'system', 'null']
    for (const r of reservedCases) {
      const res = resolveTenant(`${r}.inkflowerp.com`, '', { overrideRootDomain: ROOT_DOMAIN })
      assert.equal(res.type, 'not_found', `Subdomain ${r} must be flagged as not_found`)
      assert.equal(res.slug, r)
    }
  })

  test('9. Strictly rejects multi-label / double subdomains (a.b.root.com)', () => {
    const res = resolveTenant('evil.vision.inkflowerp.com', '', { overrideRootDomain: ROOT_DOMAIN })
    assert.equal(res.type, 'invalid', 'Multi-label subdomains must be rejected as invalid')
    assert.equal(res.slug, null)
  })

  test('10. Rejects invalid slug formats (symbols, consecutive hyphens, too short/long)', () => {
    const invalidCases = [
      'vi.inkflowerp.com', // < 3 chars
      'a--b.inkflowerp.com', // double hyphen
      '-leading.inkflowerp.com', // leading hyphen
      'trailing-.inkflowerp.com', // trailing hyphen
      'under_score.inkflowerp.com', // underscore
      'dots.in.slug.inkflowerp.com', // dots
      `${'a'.repeat(31)}.inkflowerp.com`, // > 30 chars
    ]

    for (const host of invalidCases) {
      const res = resolveTenant(host, '', { overrideRootDomain: ROOT_DOMAIN })
      assert.equal(res.type, 'invalid', `Host ${host} must be marked invalid`)
      assert.equal(res.slug, null)
    }
  })

  test('11. Fails closed on untrusted or spoofed host headers', () => {
    const spoofedCases = [
      'attacker.com',
      'evil-phish.net',
      'inkflowerp.com.attacker.com',
      'fake-tenant.com',
    ]

    for (const host of spoofedCases) {
      const res = resolveTenant(host, '', { overrideRootDomain: ROOT_DOMAIN })
      assert.equal(res.type, 'not_found', `Host ${host} outside allowed root domain must be not_found`)
    }
  })

  test('12. Resolves verified custom domains', () => {
    const customMap = new Map([
      ['erp.visionsignbd.com', 'vision-sign'],
      ['print.dhakagroup.com', 'dhaka-print'],
    ])

    const res = resolveTenant('erp.visionsignbd.com', '', {
      overrideRootDomain: ROOT_DOMAIN,
      customDomains: customMap,
    })
    assert.equal(res.type, 'tenant')
    assert.equal(res.slug, 'vision-sign')
    assert.equal(res.isCustomDomain, true)
    assert.equal(res.isFallback, false)
  })

  test('13. Resolves local development root (localhost:3000) and tenant subdomain (vision.localhost:3000)', () => {
    const rootRes = resolveTenant('localhost:3000', '', { overrideRootDomain: 'localhost:3000' })
    assert.equal(rootRes.type, 'marketing')
    assert.equal(rootRes.isFallback, true)

    const tenantRes = resolveTenant('vision.localhost:3000', '', { overrideRootDomain: 'localhost:3000' })
    assert.equal(tenantRes.type, 'tenant')
    assert.equal(tenantRes.slug, 'vision')
    assert.equal(tenantRes.isFallback, true)
  })

  test('14. Resolves path-based tenant fallback on localhost and preview domains', () => {
    // Path-based tenant on localhost: /vision/dashboard -> tenant: vision
    const localRes = resolveTenant('localhost:3000', '/vision/dashboard', {
      overrideRootDomain: 'localhost:3000',
    })
    assert.equal(localRes.type, 'tenant')
    assert.equal(localRes.slug, 'vision')
    assert.equal(localRes.isFallback, true)

    // Path-based tenant on Vercel preview: inkflow-erp.vercel.app/t/vision/invoices
    const previewRes = resolveTenant('inkflow-erp.vercel.app', '/t/vision/invoices', {
      overrideRootDomain: 'inkflow-erp.vercel.app',
    })
    assert.equal(previewRes.type, 'tenant')
    assert.equal(previewRes.slug, 'vision')
    assert.equal(previewRes.isFallback, true)
  })

  test('15. Disallows path-based tenant on production root domain to prevent isolation bypass', () => {
    // In production on root domain, /vision/dashboard resolves as marketing, leaving redirect to subdomain
    const prodRes = resolveTenant('inkflowerp.com', '/vision/dashboard', {
      overrideRootDomain: ROOT_DOMAIN,
      allowPathFallback: false,
    })
    assert.equal(prodRes.type, 'marketing', 'Path fallback must be disabled on production root domain')
  })

  test('16. Validates slug format invariants (3-30 chars, ASCII only)', () => {
    assert.equal(isValidSlugFormat('abc'), true)
    assert.equal(isValidSlugFormat('vision-360'), true)
    assert.equal(isValidSlugFormat('a'.repeat(30)), true)
    assert.equal(isValidSlugFormat('ab'), false)
    assert.equal(isValidSlugFormat('a'.repeat(31)), false)
    assert.equal(isValidSlugFormat('vision_print'), false)
    assert.equal(isValidSlugFormat('vision--print'), false)
    assert.equal(isValidSlugFormat('-vision'), false)
    assert.equal(isValidSlugFormat('vision-'), false)
    assert.equal(isValidSlugFormat('বাংলা'), false, 'Non-ASCII Unicode rejected')
  })

  test('17. Enforces host-only cookies (zero wildcard domain cookies)', () => {
    const opts = getAuthCookieOptions('vision.inkflowerp.com')
    assert.equal(opts.domain, undefined, 'Cookie domain MUST be undefined to enforce host-only scope')
    assert.equal(opts.httpOnly, true, 'Cookie MUST be httpOnly to prevent script token theft')
    assert.equal(opts.sameSite, 'lax')
    assert.equal(opts.path, '/')
  })
})
