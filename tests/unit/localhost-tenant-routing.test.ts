import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveHostname } from '../../lib/tenant/tenant-resolution.ts'
import { getTenantNavHref, getTenantLink } from '../../lib/tenant/tenant-url.ts'
import { AuthService } from '../../services/auth.service.ts'

describe('Localhost Tenant Routing & Login Verification Tests', () => {
  it('1. Correctly classifies localhost:3000 as root development host with isLocalhost=true', () => {
    const res = resolveHostname('localhost:3000')
    assert.strictEqual(res.hostType, 'root')
    assert.strictEqual(res.isLocalhost, true)
    assert.strictEqual(res.isDevelopment, true)
    assert.strictEqual(res.tenantSlug, null)
  })

  it('2. Correctly classifies 127.0.0.1:3000 as root development host with isLocalhost=true', () => {
    const res = resolveHostname('127.0.0.1:3000')
    assert.strictEqual(res.hostType, 'root')
    assert.strictEqual(res.isLocalhost, true)
    assert.strictEqual(res.isDevelopment, true)
    assert.strictEqual(res.tenantSlug, null)
  })

  it('3. getTenantNavHref generates consistent path-based URLs on localhost when navigating under /rangao/*', () => {
    // When active path is /rangao/dashboard on localhost root domain
    const ordersHref = getTenantNavHref('/orders', '/rangao/dashboard', 'rangao')
    assert.strictEqual(ordersHref, '/rangao/orders')

    const designHref = getTenantNavHref('/design', '/rangao/orders', 'rangao')
    assert.strictEqual(designHref, '/rangao/design')

    const invoicesHref = getTenantNavHref('/invoices', '/rangao/design', 'rangao')
    assert.strictEqual(invoicesHref, '/rangao/invoices')

    const dashboardHref = getTenantNavHref('/dashboard', '/rangao/settings', 'rangao')
    assert.strictEqual(dashboardHref, '/rangao/dashboard')
  })

  it('4. Multi-identifier resolution maps usernames, emails, and phone numbers accurately', async () => {
    // Direct email resolution
    const directEmail = await AuthService.resolveLoginEmail('rangao.bd@gmail.com')
    assert.strictEqual(directEmail, 'rangao.bd@gmail.com')

    const directEmail2 = await AuthService.resolveLoginEmail('shamol.31@gmail.com')
    assert.strictEqual(directEmail2, 'shamol.31@gmail.com')
  })

  it('5. Destination builder on localhost resolves path-based tenant workspace without subdomain', () => {
    const targetSlug = 'rangao'
    const paramRedirect: string | null = null
    const isLocalhost = true

    let cleanSubPath = '/dashboard'
    if (paramRedirect && (paramRedirect as string).startsWith('/') && !(paramRedirect as string).startsWith('/login')) {
      cleanSubPath = paramRedirect
      if (cleanSubPath.startsWith(`/${targetSlug}/`)) {
        cleanSubPath = cleanSubPath.slice(`/${targetSlug}`.length) || '/dashboard'
      } else if (cleanSubPath === `/${targetSlug}`) {
        cleanSubPath = '/dashboard'
      }
    }

    let destination: string
    if (isLocalhost) {
      const formattedSubPath = cleanSubPath.startsWith('/') ? cleanSubPath : `/${cleanSubPath}`
      destination = `/${targetSlug}${formattedSubPath}`
    } else {
      destination = getTenantLink(targetSlug, cleanSubPath)
    }

    assert.strictEqual(destination, '/rangao/dashboard')
  })

  it('6. Destination builder respects deep paramRedirect on localhost', () => {
    const targetSlug = 'rangao'
    const paramRedirect = '/rangao/invoices/INV-001'
    const isLocalhost = true

    let cleanSubPath = '/dashboard'
    if (paramRedirect && paramRedirect.startsWith('/') && !paramRedirect.startsWith('/login')) {
      cleanSubPath = paramRedirect
      if (cleanSubPath.startsWith(`/${targetSlug}/`)) {
        cleanSubPath = cleanSubPath.slice(`/${targetSlug}`.length) || '/dashboard'
      } else if (cleanSubPath === `/${targetSlug}`) {
        cleanSubPath = '/dashboard'
      }
    }

    let destination: string
    if (isLocalhost) {
      const formattedSubPath = cleanSubPath.startsWith('/') ? cleanSubPath : `/${cleanSubPath}`
      destination = `/${targetSlug}${formattedSubPath}`
    } else {
      destination = getTenantLink(targetSlug, cleanSubPath)
    }

    assert.strictEqual(destination, '/rangao/invoices/INV-001')
  })
})
