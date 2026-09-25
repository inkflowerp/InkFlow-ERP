import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveHostname,
  isReservedSlug,
  isValidSlugFormat,
  normalizeSlug,
  getRootDomain,
  getAuthCookieOptions,
  RESERVED_SLUGS,
} from '../../lib/tenant/tenant-resolution.ts'
import {
  getTenantBaseUrl,
  getTenantLink,
  formatDocumentUrl,
  formatWhatsAppShareLink,
  getTenantNavHref,
} from '../../lib/tenant/tenant-url.ts'

describe('Tenant Subdomain Resolution & DNS Utility Unit Tests', () => {
  test('1. Resolves standard production tenant subdomains', () => {
    const res = resolveHostname('vision.inkflow.com.bd')
    assert.equal(res.hostType, 'tenant')
    assert.equal(res.tenantSlug, 'vision')
    assert.equal(res.rootDomain, 'inkflow.com.bd')
    assert.equal(res.isDevelopment, false)
  })

  test('2. Resolves hyphenated multi-word tenant subdomains', () => {
    const res = resolveHostname('abc-print-dhaka.inkflow.com.bd')
    assert.equal(res.hostType, 'tenant')
    assert.equal(res.tenantSlug, 'abc-print-dhaka')
    assert.equal(res.rootDomain, 'inkflow.com.bd')
  })

  test('3. Handles uppercase and mixed-case hostnames by normalizing to lowercase', () => {
    const res = resolveHostname('VISION-SIGN.INKFLOW.COM.BD')
    assert.equal(res.hostType, 'tenant')
    assert.equal(res.tenantSlug, 'vision-sign')
  })

  test('4. Resolves root production domain as root (not a tenant)', () => {
    const res = resolveHostname('inkflow.com.bd')
    assert.equal(res.hostType, 'root')
    assert.equal(res.tenantSlug, null)
    assert.equal(res.rootDomain, 'inkflow.com.bd')
  })

  test('5. Resolves www subdomain as root domain (not a tenant)', () => {
    const res = resolveHostname('www.inkflow.com.bd')
    assert.equal(res.hostType, 'root')
    assert.equal(res.tenantSlug, null)
  })

  test('6. Identifies reserved system subdomains', () => {
    const reservedCases = ['admin.inkflow.com.bd', 'api.inkflow.com.bd', 'mail.inkflow.com.bd', 'billing.inkflow.com.bd', 'auth.inkflow.com.bd']
    for (const host of reservedCases) {
      const res = resolveHostname(host)
      assert.equal(res.hostType, 'reserved', `Host ${host} should be identified as reserved`)
      assert.ok(res.tenantSlug, `Reserved slug should be captured`)
    }
  })

  test('7. Resolves local development root host (localhost:3000)', () => {
    const res = resolveHostname('localhost:3000')
    assert.equal(res.hostType, 'root')
    assert.equal(res.tenantSlug, null)
    assert.equal(res.isDevelopment, true)
  })

  test('8. Resolves local development tenant subdomain (vision.localhost:3000)', () => {
    const res = resolveHostname('vision.localhost:3000')
    assert.equal(res.hostType, 'tenant')
    assert.equal(res.tenantSlug, 'vision')
    assert.equal(res.isDevelopment, true)
  })

  test('9. Resolves local 127.0.0.1 as root development host', () => {
    const res = resolveHostname('127.0.0.1:3000')
    assert.equal(res.hostType, 'root')
    assert.equal(res.tenantSlug, null)
    assert.equal(res.isDevelopment, true)
  })

  test('10. Flags malformed or invalid hostnames', () => {
    const invalidCases = ['', '..invalid', 'vision..sign.inkflow.com.bd', '-invalid-.inkflow.com.bd']
    for (const host of invalidCases) {
      const res = resolveHostname(host)
      assert.equal(res.hostType, 'invalid', `Host ${host} should be identified as invalid`)
    }
  })

  test('11. isReservedSlug accurately matches all reserved keywords', () => {
    for (const slug of RESERVED_SLUGS) {
      assert.equal(isReservedSlug(slug), true, `Reserved slug ${slug} should return true`)
      assert.equal(isReservedSlug(slug.toUpperCase()), true, `Uppercase ${slug} should return true`)
    }
    assert.equal(isReservedSlug('vision'), false)
    assert.equal(isReservedSlug('abc-print'), false)
    assert.equal(isReservedSlug('rahman-signage'), false)
  })

  test('12. isValidSlugFormat validates DNS subdomain compatibility (3-63 chars, lowercase, hyphens)', () => {
    // Valid slugs
    assert.equal(isValidSlugFormat('vision'), true)
    assert.equal(isValidSlugFormat('abc-print'), true)
    assert.equal(isValidSlugFormat('sign-360'), true)
    assert.equal(isValidSlugFormat('rahman-print-dhaka-1'), true)

    // Invalid slugs
    assert.equal(isValidSlugFormat('vi'), false, 'Too short (<3 chars)')
    assert.equal(isValidSlugFormat('Vision Sign'), false, 'Spaces not allowed')
    assert.equal(isValidSlugFormat('vision_sign'), false, 'Underscores not allowed in DNS hostnames')
    assert.equal(isValidSlugFormat('vision.sign'), false, 'Periods not allowed in slug')
    assert.equal(isValidSlugFormat('-vision'), false, 'Leading hyphen not allowed')
    assert.equal(isValidSlugFormat('vision-'), false, 'Trailing hyphen not allowed')
    assert.equal(isValidSlugFormat('a'.repeat(64)), false, 'Too long (>63 chars)')
  })

  test('13. normalizeSlug transforms raw names into clean, URL-safe slugs', () => {
    assert.equal(normalizeSlug('Vision Sign'), 'vision-sign')
    assert.equal(normalizeSlug('  ABC & Co. Printing  '), 'abc-co-printing')
    assert.equal(normalizeSlug('Rahman---Signage___2026'), 'rahman-signage-2026')
    assert.equal(normalizeSlug('!@#$% Dhaka Press 123'), 'dhaka-press-123')
  })

  test('14. getAuthCookieOptions sets cross-subdomain domain in production and host-scoped in dev', () => {
    const prodOpts = getAuthCookieOptions('inkflow.com.bd')
    assert.equal(prodOpts.domain, '.inkflow.com.bd')
    assert.equal(prodOpts.sameSite, 'lax')
    assert.equal(prodOpts.secure, true)

    const devOpts = getAuthCookieOptions('localhost:3000')
    assert.equal(devOpts.domain, undefined)
    assert.equal(devOpts.sameSite, 'lax')
    assert.equal(devOpts.secure, false)
  })

  test('15. getTenantBaseUrl and getTenantLink generate clean URLs without double slashes', () => {
    const base = getTenantBaseUrl('vision')
    assert.ok(base.includes('vision'))
    
    const invoiceLink = getTenantLink('vision', '/invoices/INV-2026-001')
    assert.ok(invoiceLink.endsWith('/invoices/INV-2026-001'))
    assert.ok(!invoiceLink.includes('//invoices'))
  })

  test('16. formatDocumentUrl generates proper tenant links for invoices, quotations, receipts', () => {
    const invUrl = formatDocumentUrl('vision', 'invoice', 'INV-001')
    assert.ok(invUrl.includes('/invoices/INV-001'))

    const quoUrl = formatDocumentUrl('vision', 'quotation', 'QUO-001')
    assert.ok(quoUrl.includes('/quotations/QUO-001'))

    const rcptUrl = formatDocumentUrl('vision', 'receipt', 'MR-100')
    assert.ok(rcptUrl.includes('/billing?receipt=MR-100'))
  })

  test('17. formatWhatsAppShareLink formats Bangladesh numbers and encodes messages', () => {
    const link1 = formatWhatsAppShareLink('01711223344', 'Invoice #INV-001 is ready')
    assert.equal(link1, 'https://wa.me/8801711223344?text=Invoice%20%23INV-001%20is%20ready')

    const link2 = formatWhatsAppShareLink('+8801811223344', 'Hello Vision')
    assert.equal(link2, 'https://wa.me/8801811223344?text=Hello%20Vision')
  })

  test('18. Resolves inkflow-erp.vercel.app as root and *.inkflow-erp.vercel.app as tenant subdomains', () => {
    const rootRes = resolveHostname('inkflow-erp.vercel.app', 'inkflow-erp.vercel.app')
    assert.equal(rootRes.hostType, 'root')
    assert.equal(rootRes.tenantSlug, null)

    const tenantRes1 = resolveHostname('vision.inkflow-erp.vercel.app', 'inkflow-erp.vercel.app')
    assert.equal(tenantRes1.hostType, 'tenant')
    assert.equal(tenantRes1.tenantSlug, 'vision')

    const tenantRes2 = resolveHostname('abc-print.inkflow-erp.vercel.app', 'inkflow-erp.vercel.app')
    assert.equal(tenantRes2.hostType, 'tenant')
    assert.equal(tenantRes2.tenantSlug, 'abc-print')

    const reservedRes = resolveHostname('dashboard.inkflow-erp.vercel.app', 'inkflow-erp.vercel.app')
    assert.equal(reservedRes.hostType, 'reserved')
  })

  test('19. Sets secure host-scoped cookies for PSL domain inkflow-erp.vercel.app', () => {
    const opts = getAuthCookieOptions('inkflow-erp.vercel.app')
    assert.equal(opts.domain, undefined, 'PSL domain must omit wildcard domain to prevent browser cookie drop')
    assert.equal(opts.sameSite, 'lax')
  })

  test('20. getTenantNavHref resolves symmetrical clean hrefs on subdomains and path-based routing', () => {
    // Subdomain routing (pathname is /production or /dashboard, without slug prefix)
    assert.equal(getTenantNavHref('/sales/new-work', '/production', 'rangao'), '/sales/new-work')
    assert.equal(getTenantNavHref('/orders', '/dashboard', 'vision'), '/orders')
    assert.equal(getTenantNavHref('/finishing', '/production', 'abc'), '/finishing')
    assert.equal(getTenantNavHref('/support', '/settings', 'rangao'), '/support')

    // Redundant slug in href is stripped on subdomain
    assert.equal(getTenantNavHref('/rangao/sales/new-work', '/production', 'rangao'), '/sales/new-work')

    // Path-based routing (pathname starts with /rangao/...)
    assert.equal(getTenantNavHref('/sales/new-work', '/rangao/production', 'rangao'), '/rangao/sales/new-work')
    assert.equal(getTenantNavHref('/orders', '/vision/dashboard', 'vision'), '/vision/orders')
  })

  test('21. Resolves nested www on Vercel preview domain cleanly', () => {
    const res = resolveHostname('www.vision.inkflow-erp.vercel.app', 'inkflow-erp.vercel.app')
    assert.equal(res.hostType, 'tenant')
    assert.equal(res.tenantSlug, 'vision')
    assert.equal(res.rootDomain, 'inkflow-erp.vercel.app')
  })

  test('22. getTenantBaseUrl and getTenantLink strip www. prefixes from root domain', () => {
    const base = getTenantBaseUrl('vision')
    assert.ok(!base.includes('www.inkflow.com.bd'))
    assert.ok(base.includes('vision.'))

    const link = getTenantLink('vision', '/vision/orders')
    assert.ok(!link.includes('/vision/vision/orders'))
    assert.ok(link.endsWith('/orders'))
  })

  test('23. getAuthCookieOptions normalizes www root domain', () => {
    const opts = getAuthCookieOptions('www.inkflow.com.bd')
    assert.equal(opts.domain, '.inkflow.com.bd')
  })

  test('24. Resolves [tenantSlug].app.TLD subdomains across Vercel, .bd, .com, and .com.bd', () => {
    // Vercel deployment: rangao.inkflow-erp.vercel.app
    const vercelTenant = resolveHostname('rangao.inkflow-erp.vercel.app')
    assert.equal(vercelTenant.hostType, 'tenant')
    assert.equal(vercelTenant.tenantSlug, 'rangao')
    assert.equal(vercelTenant.rootDomain, 'inkflow-erp.vercel.app')

    const vercelRoot = resolveHostname('inkflow-erp.vercel.app')
    assert.equal(vercelRoot.hostType, 'root')
    assert.equal(vercelRoot.tenantSlug, null)

    // ccTLD (.bd): rangao.inkflow.bd
    const bdTenant = resolveHostname('rangao.inkflow.bd')
    assert.equal(bdTenant.hostType, 'tenant')
    assert.equal(bdTenant.tenantSlug, 'rangao')
    assert.equal(bdTenant.rootDomain, 'inkflow.bd')

    const bdRoot = resolveHostname('inkflow.bd')
    assert.equal(bdRoot.hostType, 'root')
    assert.equal(bdRoot.tenantSlug, null)

    // gTLD (.com): vision-sign.inkflow.com
    const comTenant = resolveHostname('vision-sign.inkflow.com')
    assert.equal(comTenant.hostType, 'tenant')
    assert.equal(comTenant.tenantSlug, 'vision-sign')
    assert.equal(comTenant.rootDomain, 'inkflow.com')

    const comRoot = resolveHostname('inkflow.com')
    assert.equal(comRoot.hostType, 'root')
    assert.equal(comRoot.tenantSlug, null)

    // Second-level ccTLD (.com.bd): vision.inkflow.com.bd
    const comBdTenant = resolveHostname('vision.inkflow.com.bd')
    assert.equal(comBdTenant.hostType, 'tenant')
    assert.equal(comBdTenant.tenantSlug, 'vision')
    assert.equal(comBdTenant.rootDomain, 'inkflow.com.bd')

    const comBdRoot = resolveHostname('inkflow.com.bd')
    assert.equal(comBdRoot.hostType, 'root')
    assert.equal(comBdRoot.tenantSlug, null)
  })

  test('25. getTenantBaseUrl strictly formats [tenantSlug].app.TLD without path-based fallbacks', () => {
    assert.equal(
      getTenantBaseUrl('rangao', 'inkflow-erp.vercel.app'),
      'https://rangao.inkflow-erp.vercel.app'
    )
    assert.equal(
      getTenantBaseUrl('rangao', 'inkflow.bd'),
      'https://rangao.inkflow.bd'
    )
    assert.equal(
      getTenantBaseUrl('vision-sign', 'inkflow.com'),
      'https://vision-sign.inkflow.com'
    )
    assert.equal(
      getTenantBaseUrl('vision', 'inkflow.com.bd'),
      'https://vision.inkflow.com.bd'
    )
    assert.equal(
      getTenantBaseUrl('rangao', 'localhost:3000'),
      'http://rangao.localhost:3000'
    )
  })

  test('26. getTenantLink generates canonical subdomain paths across all domains', () => {
    assert.equal(
      getTenantLink('rangao', '/orders', 'inkflow-erp.vercel.app'),
      'https://rangao.inkflow-erp.vercel.app/orders'
    )
    assert.equal(
      getTenantLink('rangao', 'dashboard', 'inkflow.bd'),
      'https://rangao.inkflow.bd/dashboard'
    )
    assert.equal(
      getTenantLink('vision-sign', '/invoices/INV-2026-001', 'inkflow.com'),
      'https://vision-sign.inkflow.com/invoices/INV-2026-001'
    )
    assert.equal(
      getTenantLink('vision', '/quotations/QUO-2026-001', 'inkflow.com.bd'),
      'https://vision.inkflow.com.bd/quotations/QUO-2026-001'
    )
    assert.equal(
      getTenantLink('rangao', '/production', 'localhost:3000'),
      'http://rangao.localhost:3000/production'
    )
  })

  test('27. formatDocumentUrl generates public links using [tenantSlug].app.TLD', () => {
    assert.equal(
      formatDocumentUrl('rangao', 'invoice', 'INV-100', 'inkflow-erp.vercel.app'),
      'https://rangao.inkflow-erp.vercel.app/invoices/INV-100'
    )
    assert.equal(
      formatDocumentUrl('rangao', 'quotation', 'QUO-200', 'inkflow.bd'),
      'https://rangao.inkflow.bd/quotations/QUO-200'
    )
    assert.equal(
      formatDocumentUrl('vision-sign', 'receipt', 'MR-300', 'inkflow.com'),
      'https://vision-sign.inkflow.com/billing?receipt=MR-300'
    )
  })

  test('28. getAuthCookieOptions sets proper cookie domains for .bd, .com, .com.bd and omits for PSL', () => {
    assert.equal(getAuthCookieOptions('inkflow.bd').domain, '.inkflow.bd')
    assert.equal(getAuthCookieOptions('inkflow.com').domain, '.inkflow.com')
    assert.equal(getAuthCookieOptions('inkflow.com.bd').domain, '.inkflow.com.bd')
    assert.equal(getAuthCookieOptions('inkflow-erp.vercel.app').domain, undefined)
  })
})
