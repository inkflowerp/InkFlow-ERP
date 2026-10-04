import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveTenant,
  resolveHostname,
  extractCanonicalRootDomain,
} from '../../lib/tenant/tenant-resolution.ts'

describe('Host Matrix & Subdomain Resolution (11 Canonical Scenarios)', () => {
  const ROOT = 'printflow.bd'

  test('1. printflow.bd (marketing / root)', () => {
    const resTenant = resolveTenant('printflow.bd', '', { overrideRootDomain: ROOT })
    assert.equal(resTenant.type, 'marketing')
    assert.equal(resTenant.slug, null)

    const resHost = resolveHostname('printflow.bd', ROOT)
    assert.equal(resHost.hostType, 'root')
    assert.equal(resHost.tenantSlug, null)
  })

  test('2. www.printflow.bd (marketing / root)', () => {
    const resTenant = resolveTenant('www.printflow.bd', '', { overrideRootDomain: ROOT })
    assert.equal(resTenant.type, 'marketing')
    assert.equal(resTenant.slug, null)

    const resHost = resolveHostname('www.printflow.bd', ROOT)
    assert.equal(resHost.hostType, 'root')
    assert.equal(resHost.tenantSlug, null)
  })

  test('3. rangao.printflow.bd (tenant rangao)', () => {
    const resTenant = resolveTenant('rangao.printflow.bd', '', { overrideRootDomain: ROOT })
    assert.equal(resTenant.type, 'tenant')
    assert.equal(resTenant.slug, 'rangao')
    assert.equal(resTenant.rootDomain, 'printflow.bd')

    const resHost = resolveHostname('rangao.printflow.bd', ROOT)
    assert.equal(resHost.hostType, 'tenant')
    assert.equal(resHost.tenantSlug, 'rangao')
  })

  test('4. vision-sign.printflow.bd (tenant vision-sign)', () => {
    const resTenant = resolveTenant('vision-sign.printflow.bd', '', { overrideRootDomain: ROOT })
    assert.equal(resTenant.type, 'tenant')
    assert.equal(resTenant.slug, 'vision-sign')

    const resHost = resolveHostname('vision-sign.printflow.bd', ROOT)
    assert.equal(resHost.hostType, 'tenant')
    assert.equal(resHost.tenantSlug, 'vision-sign')
  })

  test('5. admin.printflow.bd and platform.printflow.bd (platform)', () => {
    const resAdmin = resolveTenant('admin.printflow.bd', '', { overrideRootDomain: ROOT })
    assert.equal(resAdmin.type, 'platform')
    assert.equal(resAdmin.slug, null)

    const resAdminHost = resolveHostname('admin.printflow.bd', ROOT)
    assert.equal(resAdminHost.hostType, 'platform')

    const resPlatform = resolveTenant('platform.printflow.bd', '', { overrideRootDomain: ROOT })
    assert.equal(resPlatform.type, 'platform')
    assert.equal(resPlatform.slug, null)

    const resPlatformHost = resolveHostname('platform.printflow.bd', ROOT)
    assert.equal(resPlatformHost.hostType, 'platform')
  })

  test('6. api.printflow.bd and mail.printflow.bd (reserved)', () => {
    const resApi = resolveTenant('api.printflow.bd', '', { overrideRootDomain: ROOT })
    assert.equal(resApi.type, 'not_found')
    assert.equal(resApi.slug, 'api')

    const resApiHost = resolveHostname('api.printflow.bd', ROOT)
    assert.equal(resApiHost.hostType, 'reserved')
    assert.equal(resApiHost.tenantSlug, 'api')

    const resMail = resolveTenant('mail.printflow.bd', '', { overrideRootDomain: ROOT })
    assert.equal(resMail.type, 'not_found')
    assert.equal(resMail.slug, 'mail')

    const resMailHost = resolveHostname('mail.printflow.bd', ROOT)
    assert.equal(resMailHost.hostType, 'reserved')
    assert.equal(resMailHost.tenantSlug, 'mail')
  })

  test('7. a.b.printflow.bd (invalid, multi-label)', () => {
    const resTenant = resolveTenant('a.b.printflow.bd', '', { overrideRootDomain: ROOT })
    assert.equal(resTenant.type, 'invalid')
    assert.equal(resTenant.slug, null)

    const resHost = resolveHostname('a.b.printflow.bd', ROOT)
    assert.equal(resHost.hostType, 'invalid')
  })

  test('8. Rangao.PrintFlow.BD:443 (normalised to tenant rangao)', () => {
    const resTenant = resolveTenant('Rangao.PrintFlow.BD:443', '', { overrideRootDomain: ROOT })
    assert.equal(resTenant.type, 'tenant')
    assert.equal(resTenant.slug, 'rangao')

    const resHost = resolveHostname('Rangao.PrintFlow.BD:443', ROOT)
    assert.equal(resHost.hostType, 'tenant')
    assert.equal(resHost.tenantSlug, 'rangao')
  })

  test('9. evil.com and rangao.printflow.bd.evil.com (not_found / untrusted)', () => {
    const resEvil = resolveTenant('evil.com', '', { overrideRootDomain: ROOT })
    assert.equal(resEvil.type, 'not_found')

    const resEvilSub = resolveTenant('rangao.printflow.bd.evil.com', '', { overrideRootDomain: ROOT })
    assert.equal(resEvilSub.type, 'not_found')
  })

  test('10. rangao.localhost:3000 (tenant on local dev)', () => {
    const resTenant = resolveTenant('rangao.localhost:3000')
    assert.equal(resTenant.type, 'tenant')
    assert.equal(resTenant.slug, 'rangao')
    assert.equal(resTenant.isFallback, true)

    const resHost = resolveHostname('rangao.localhost:3000')
    assert.equal(resHost.hostType, 'tenant')
    assert.equal(resHost.tenantSlug, 'rangao')
    assert.equal(resHost.isLocalhost, true)
  })

  test('11. rangao.inkflow-erp.vercel.app (tenant via preview fallback)', () => {
    const resTenant = resolveTenant('rangao.inkflow-erp.vercel.app')
    assert.equal(resTenant.type, 'tenant')
    assert.equal(resTenant.slug, 'rangao')
    assert.equal(resTenant.isFallback, true)

    const resHost = resolveHostname('rangao.inkflow-erp.vercel.app')
    assert.equal(resHost.hostType, 'tenant')
    assert.equal(resHost.tenantSlug, 'rangao')
  })

  test('extractCanonicalRootDomain("rangao.printflow.bd") returns "printflow.bd"', () => {
    const root = extractCanonicalRootDomain('rangao.printflow.bd')
    assert.equal(root, 'printflow.bd')
  })
})
