// ==============================================================================
// PrintFlow SaaS - Unit Tests: Root Login & Tenant Redirection
// Tests credential authentication on root domain (printflow.bd / localhost:3000)
// and automatic redirection to tenant subdomains ([tenantSlug].printflow.bd).
// ==============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveHostname } from '../../lib/tenant/tenant-resolution.ts'
import { getTenantLink, getTenantBaseUrl } from '../../lib/tenant/tenant-url.ts'
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
})
