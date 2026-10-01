// ==============================================================================
// PrintERP / InkFlow SaaS - Tenant Subdomain URL Generator
// Canonical URL builders for tenant-scoped links, document sharing, and notifications.
// ==============================================================================

import { getRootDomain, isReservedSlug, resolveHostname } from './tenant-resolution.ts'

/**
 * Returns the fully qualified origin for a given tenant subdomain.
 * Format is strictly: [tenantSlug].app.TLD
 * Examples:
 * - https://rangao.inkflow-erp.vercel.app
 * - https://rangao.inkflow.bd
 * - https://vision-sign.inkflow.com
 * - https://vision.inkflow.com.bd
 * - http://vision.localhost:3000
 */
export function getTenantBaseUrl(slug: string, customRootDomain?: string): string {
  const cleanSlug = (slug || '').toLowerCase().trim()
  const rawRootDomain = customRootDomain || getRootDomain()
  const rootDomain = rawRootDomain.replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./i, '')

  const isLocalhost =
    rootDomain.includes('localhost') ||
    rootDomain.includes('127.0.0.1')

  if (!cleanSlug) {
    const isProd = (process.env.NODE_ENV === 'production' || rootDomain.includes('.')) && !isLocalhost
    return `${isProd ? 'https' : 'http'}://${rootDomain}`
  }

  // Handle localhost development: http://${cleanSlug}.localhost:3000
  if (isLocalhost) {
    const port = rootDomain.includes(':') ? `:${rootDomain.split(':')[1]}` : ':3000'
    return `http://${cleanSlug}.localhost${port}`
  }

  // Handle remote / production subdomain: https://${cleanSlug}.${rootDomain}
  // All tenants MUST be: [tenantSlug].app.TLD
  const isProd = process.env.NODE_ENV === 'production' || rootDomain.includes('.')
  const protocol = isProd ? 'https' : 'http'
  return `${protocol}://${cleanSlug}.${rootDomain}`
}

/**
 * Generates a full tenant-scoped URL for a specific resource path.
 * Examples:
 * getTenantLink('rangao', '/invoices/INV-001', 'inkflow-erp.vercel.app') -> https://rangao.inkflow-erp.vercel.app/invoices/INV-001
 * getTenantLink('rangao', 'dashboard', 'inkflow.bd') -> https://rangao.inkflow.bd/dashboard
 * getTenantLink('vision-sign', '/orders', 'inkflow.com') -> https://vision-sign.inkflow.com/orders
 */
export function getTenantLink(slug: string, path: string = '', customRootDomain?: string): string {
  const cleanSlug = (slug || '').toLowerCase().trim()
  let cleanPath = path.startsWith('/') ? path : `/${path}`
  if (cleanSlug && cleanPath.startsWith(`/${cleanSlug}/`)) {
    cleanPath = cleanPath.slice(`/${cleanSlug}`.length)
  } else if (cleanSlug && cleanPath === `/${cleanSlug}`) {
    cleanPath = ''
  }

  const baseUrl = getTenantBaseUrl(slug, customRootDomain)
  return `${baseUrl}${cleanPath}`
}

/**
 * Formats public customer-facing document links without exposing internal UUIDs.
 * Examples:
 * formatDocumentUrl('vision', 'invoice', 'INV-2026-0012') -> https://vision.inkflow.com.bd/invoices/INV-2026-0012
 * formatDocumentUrl('vision', 'quotation', 'QUO-2026-0089') -> https://vision.inkflow.com.bd/quotations/QUO-2026-0089
 * formatDocumentUrl('vision', 'receipt', 'MR-2026-0044') -> https://vision.inkflow.com.bd/billing/receipts/MR-2026-0044
 */
export function formatDocumentUrl(
  slug: string,
  type: 'invoice' | 'quotation' | 'receipt' | 'challan' | 'order',
  docNumberOrId: string,
  customRootDomain?: string
): string {
  switch (type) {
    case 'invoice':
      return getTenantLink(slug, `/invoices/${encodeURIComponent(docNumberOrId)}`, customRootDomain)
    case 'quotation':
      return getTenantLink(slug, `/quotations/${encodeURIComponent(docNumberOrId)}`, customRootDomain)
    case 'receipt':
      return getTenantLink(slug, `/billing?receipt=${encodeURIComponent(docNumberOrId)}`, customRootDomain)
    case 'challan':
      return getTenantLink(slug, `/delivery?challan=${encodeURIComponent(docNumberOrId)}`, customRootDomain)
    case 'order':
      return getTenantLink(slug, `/orders/${encodeURIComponent(docNumberOrId)}`, customRootDomain)
    default:
      return getTenantLink(slug, `/dashboard`, customRootDomain)
  }
}

/**
 * Generates formatted WhatsApp share link for document notification.
 */
export function formatWhatsAppShareLink(
  phone: string,
  message: string
): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  const formattedPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
}

/**
 * Resolves an internal navigation href (e.g. '/orders', '/quotations', '/sales/new-work', '/finishing')
 * to the proper tenant-scoped route based on current URL path context and tenant slug.
 * 
 * Works symmetrically across:
 * - Path-based tenant routing (e.g., localhost:3000/vision/dashboard -> /vision/orders)
 * - Subdomain tenant routing (e.g., vision.inkflow.com.bd/dashboard -> /orders)
 * - Client-side Next.js Link and router navigation
 */
/**
 * Resolves an internal navigation href (e.g. '/orders', '/quotations', '/sales/new-work', '/finishing')
 * to the proper tenant-scoped route based on current URL context.
 * 
 * Symmetrically handles:
 * 1. Subdomain tenant routing (e.g. rangao.inkflow-erp.vercel.app/production or vision.inkflow.com.bd/dashboard):
 *    -> Hrefs remain clean relative paths: '/sales/new-work', '/orders', '/finishing'
 * 2. Path-based tenant routing (e.g. localhost:3000/rangao/dashboard or inkflow.com.bd/vision/orders):
 *    -> Hrefs are prefixed with tenant slug: '/rangao/sales/new-work', '/vision/orders'
 */
export function getTenantNavHref(
  href: string,
  pathname?: string | null,
  tenantSlug?: string | null
): string {
  if (!href) return '/'
  if (href.startsWith('http://') || href.startsWith('https://')) return href

  const cleanHref = href.startsWith('/') ? href : `/${href}`
  let cleanSlug = (tenantSlug || '').toLowerCase().trim()
  const activePath = pathname || (typeof window !== 'undefined' ? window.location?.pathname || '' : '')
  const firstPathSegment = activePath ? activePath.split('/')[1]?.toLowerCase().trim() : ''
  if ((!cleanSlug || cleanSlug === 'my-company' || cleanSlug === 'default') && firstPathSegment && !isReservedSlug(firstPathSegment)) {
    cleanSlug = firstPathSegment
  }

  // 1. Client-Side Resolution (Browser context with window.location)
  if (typeof window !== 'undefined') {
    const host = window.location.host.toLowerCase().trim()
    const browserPathname = window.location.pathname

    // Check if host is an authoritative tenant subdomain (e.g. rangao.inkflow-erp.vercel.app or vision.inkflow.com.bd or vision.localhost:3000)
    const isSubdomain = resolveHostname(host).hostType === 'tenant'

    if (isSubdomain) {
      // On subdomain routing, NEVER prefix with slug in browser pathname
      // If href already has /slug/xyz, strip it
      if (cleanSlug && cleanHref.startsWith(`/${cleanSlug}/`)) {
        return cleanHref.slice(`/${cleanSlug}`.length) || '/'
      }
      if (cleanSlug && cleanHref === `/${cleanSlug}`) {
        return '/dashboard'
      }
      return cleanHref
    }

    // On root host (e.g. localhost:3000 or inkflow.com.bd), check if browserPathname is path-based
    const pathToCheck = pathname || browserPathname
    if (cleanSlug) {
      if (pathToCheck.startsWith(`/${cleanSlug}/`) || pathToCheck === `/${cleanSlug}`) {
        if (cleanHref.startsWith(`/${cleanSlug}/`) || cleanHref === `/${cleanSlug}`) {
          return cleanHref
        }
        return `/${cleanSlug}${cleanHref}`
      }
    }
  }

  // 2. Server-Side SSR Resolution
  if (pathname && cleanSlug) {
    if (pathname.startsWith(`/${cleanSlug}/`) || pathname === `/${cleanSlug}`) {
      if (cleanHref.startsWith(`/${cleanSlug}/`) || cleanHref === `/${cleanSlug}`) {
        return cleanHref
      }
      return `/${cleanSlug}${cleanHref}`
    }
  }

  // If on subdomain or non-prefixed path, strip any redundant tenant slug from href
  if (cleanSlug && cleanHref.startsWith(`/${cleanSlug}/`)) {
    return cleanHref.slice(`/${cleanSlug}`.length) || '/'
  }
  if (cleanSlug && cleanHref === `/${cleanSlug}`) {
    return '/dashboard'
  }

  return cleanHref
}


