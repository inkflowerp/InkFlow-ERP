import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { resolveHostname, resolveTenant } from '../../lib/tenant/tenant-resolution.ts'
import { getPlatformBaseUrl, getPlatformLink } from '../../lib/tenant/tenant-url.ts'

describe('Platform Admin URL Consolidation & Duplicate URL Elimination', () => {
  const ROOT = 'printflow.bd'

  test('1. getPlatformBaseUrl returns canonical root-domain platform path', () => {
    const prodUrl = getPlatformBaseUrl('printflow.bd')
    assert.equal(prodUrl, 'https://printflow.bd/platform')

    const devUrl = getPlatformBaseUrl('localhost:3000')
    assert.equal(devUrl, 'http://localhost:3000/platform')
  })

  test('2. getPlatformLink formats clean relative paths and strips redundant /platform segments', () => {
    assert.equal(getPlatformLink('/tenants', 'printflow.bd'), 'https://printflow.bd/platform/tenants')
    assert.equal(getPlatformLink('login', 'printflow.bd'), 'https://printflow.bd/platform/login')
    assert.equal(getPlatformLink('', 'printflow.bd'), 'https://printflow.bd/platform')
    assert.equal(getPlatformLink('/', 'printflow.bd'), 'https://printflow.bd/platform')
    assert.equal(getPlatformLink('/platform', 'printflow.bd'), 'https://printflow.bd/platform')
    assert.equal(getPlatformLink('/platform/tenants', 'printflow.bd'), 'https://printflow.bd/platform/tenants')
  })

  test('3. Host resolution correctly identifies admin and platform subdomains as reserved hostType', () => {
    const adminRes = resolveHostname('admin.printflow.bd', ROOT)
    assert.equal(adminRes.hostType, 'reserved')
    assert.equal(adminRes.tenantSlug, 'admin')
    assert.equal(adminRes.rootDomain, ROOT)

    const platformRes = resolveHostname('platform.printflow.bd', ROOT)
    assert.equal(platformRes.hostType, 'reserved')
    assert.equal(platformRes.tenantSlug, 'platform')
    assert.equal(platformRes.rootDomain, ROOT)

    const adminLocalRes = resolveHostname('admin.localhost:3000')
    assert.equal(adminLocalRes.hostType, 'reserved')
    assert.equal(adminLocalRes.tenantSlug, 'admin')
    assert.equal(adminLocalRes.isLocalhost, true)
  })

  test('4. Root domain correctly resolves to root hostType for canonical printflow.bd/platform serving', () => {
    const rootRes = resolveHostname('printflow.bd', ROOT)
    assert.equal(rootRes.hostType, 'root')
    assert.equal(rootRes.tenantSlug, null)

    const devRes = resolveHostname('localhost:3000')
    assert.equal(devRes.hostType, 'root')
  })

  test('5. Simulation of 308 cross-host redirect from platform subdomains to canonical printflow.bd/platform', () => {
    function simulatePlatformHostRedirect(rawHost: string, pathname: string, search: string = ''): {
      shouldRedirect: boolean
      targetUrl?: string
      status?: number
    } {
      const resolution = resolveHostname(rawHost, rawHost.includes('localhost') ? undefined : ROOT)
      if (
        (resolution.hostType === 'reserved' && (resolution.tenantSlug === 'admin' || resolution.tenantSlug === 'platform')) ||
        resolution.hostType === 'platform'
      ) {
        const targetProtocol = resolution.isDevelopment ? 'http' : 'https'
        const port = (resolution.isDevelopment || resolution.isLocalhost) && rawHost.includes(':') ? `:${rawHost.split(':')[1]}` : ''
        const targetHost = resolution.rootDomain.includes(':') ? resolution.rootDomain : `${resolution.rootDomain}${port}`
        let targetPath = pathname
        if (pathname === '/' || pathname === '') {
          targetPath = '/platform'
        } else if (pathname === '/login') {
          targetPath = '/platform/login'
        } else if (pathname.startsWith('/platform/platform')) {
          targetPath = pathname.replace(/^\/platform\/platform(\/|$)/, '/platform$1') || '/platform'
        } else if (pathname.startsWith('/platform')) {
          targetPath = pathname
        } else {
          targetPath = `/platform${pathname}`
        }
        return {
          shouldRedirect: true,
          targetUrl: `${targetProtocol}://${targetHost}${targetPath}${search}`,
          status: 308,
        }
      }
      return { shouldRedirect: false }
    }

    // admin.printflow.bd/ -> 308 to https://printflow.bd/platform
    const r1 = simulatePlatformHostRedirect('admin.printflow.bd', '/')
    assert.equal(r1.shouldRedirect, true)
    assert.equal(r1.status, 308)
    assert.equal(r1.targetUrl, 'https://printflow.bd/platform')

    // platform.printflow.bd/login -> 308 to https://printflow.bd/platform/login
    const r2 = simulatePlatformHostRedirect('platform.printflow.bd', '/login')
    assert.equal(r2.shouldRedirect, true)
    assert.equal(r2.status, 308)
    assert.equal(r2.targetUrl, 'https://printflow.bd/platform/login')

    // admin.printflow.bd/platform/tenants?page=2 -> 308 to https://printflow.bd/platform/tenants?page=2
    const r3 = simulatePlatformHostRedirect('admin.printflow.bd', '/platform/tenants', '?page=2')
    assert.equal(r3.shouldRedirect, true)
    assert.equal(r3.status, 308)
    assert.equal(r3.targetUrl, 'https://printflow.bd/platform/tenants?page=2')

    // admin.printflow.bd/tenants -> 308 to https://printflow.bd/platform/tenants
    const r4 = simulatePlatformHostRedirect('admin.printflow.bd', '/tenants')
    assert.equal(r4.shouldRedirect, true)
    assert.equal(r4.status, 308)
    assert.equal(r4.targetUrl, 'https://printflow.bd/platform/tenants')

    // admin.localhost:3000/settings -> 308 to http://localhost:3000/platform/settings
    const r5 = simulatePlatformHostRedirect('admin.localhost:3000', '/settings')
    assert.equal(r5.shouldRedirect, true)
    assert.equal(r5.status, 308)
    assert.equal(r5.targetUrl, 'http://localhost:3000/platform/settings')

    // printflow.bd/platform -> does not trigger platform host redirect (served by root)
    const r6 = simulatePlatformHostRedirect('printflow.bd', '/platform')
    assert.equal(r6.shouldRedirect, false)
  })

  test('6. Simulation of duplicate URL path normalization on /platform', () => {
    function normalizeDuplicatePlatformPath(pathname: string): string {
      if (pathname.startsWith('/platform/platform')) {
        return pathname.replace(/^\/platform\/platform(\/|$)/, '/platform$1') || '/platform'
      }
      if (pathname === '/platform-admin' || pathname.startsWith('/platform-admin/')) {
        return pathname.replace(/^\/platform-admin(\/|$)/, '/platform$1') || '/platform'
      }
      if (pathname === '/platform/tenant' || pathname.startsWith('/platform/tenant/')) {
        return pathname.replace(/^\/platform\/tenant(\/|$)/, '/platform/tenants$1')
      }
      return pathname
    }

    assert.equal(normalizeDuplicatePlatformPath('/platform/platform'), '/platform')
    assert.equal(normalizeDuplicatePlatformPath('/platform/platform/tenants'), '/platform/tenants')
    assert.equal(normalizeDuplicatePlatformPath('/platform-admin'), '/platform')
    assert.equal(normalizeDuplicatePlatformPath('/platform-admin/users'), '/platform/users')
    assert.equal(normalizeDuplicatePlatformPath('/platform/tenant'), '/platform/tenants')
    assert.equal(normalizeDuplicatePlatformPath('/platform/tenant/create'), '/platform/tenants/create')
  })
})
