// ==============================================================================
// PrintERP / InkFlow SaaS - Tenant Subdomain URL Generator
// Canonical URL builders for tenant-scoped links, document sharing, and notifications.
// ==============================================================================

import { getRootDomain } from './tenant-resolution.ts'

/**
 * Returns the fully qualified origin for a given tenant subdomain.
 * Examples:
 * Production: https://vision.inkflow.com.bd
 * Development: http://vision.localhost:3000
 */
export function getTenantBaseUrl(slug: string): string {
  const cleanSlug = (slug || '').toLowerCase().trim()
  const rootDomain = getRootDomain()

  const isLocalhost =
    rootDomain.includes('localhost') ||
    rootDomain.includes('127.0.0.1')

  if (!cleanSlug) {
    const isProd = (process.env.NODE_ENV === 'production' || rootDomain.includes('vercel.app')) && !isLocalhost
    return `${isProd ? 'https' : 'http'}://${rootDomain}`
  }

  // Handle localhost development
  if (isLocalhost) {
    const port = rootDomain.includes(':') ? `:${rootDomain.split(':')[1]}` : ':3000'
    return `http://${cleanSlug}.localhost${port}`
  }

  // Handle remote / production subdomain (e.g. vision.inkflow.com.bd or vision.inkflow-erp.vercel.app)
  const isProd = process.env.NODE_ENV === 'production' || rootDomain.includes('vercel.app') || rootDomain.includes('.')
  const protocol = isProd ? 'https' : 'http'
  return `${protocol}://${cleanSlug}.${rootDomain}`
}

/**
 * Generates a full tenant-scoped URL for a specific resource path.
 * Examples:
 * getTenantLink('vision', '/invoices/INV-001') -> https://vision.inkflow.com.bd/invoices/INV-001
 * getTenantLink('vision', 'dashboard') -> https://vision.inkflow.com.bd/dashboard
 */
export function getTenantLink(slug: string, path: string = ''): string {
  const baseUrl = getTenantBaseUrl(slug)
  const cleanPath = path.startsWith('/') ? path : `/${path}`
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
  docNumberOrId: string
): string {
  switch (type) {
    case 'invoice':
      return getTenantLink(slug, `/invoices/${encodeURIComponent(docNumberOrId)}`)
    case 'quotation':
      return getTenantLink(slug, `/quotations/${encodeURIComponent(docNumberOrId)}`)
    case 'receipt':
      return getTenantLink(slug, `/billing?receipt=${encodeURIComponent(docNumberOrId)}`)
    case 'challan':
      return getTenantLink(slug, `/delivery?challan=${encodeURIComponent(docNumberOrId)}`)
    case 'order':
      return getTenantLink(slug, `/orders/${encodeURIComponent(docNumberOrId)}`)
    default:
      return getTenantLink(slug, `/dashboard`)
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
  const cleanSlug = (tenantSlug || '').toLowerCase().trim()

  // 1. Client-Side Resolution (Browser context with window.location)
  if (typeof window !== 'undefined') {
    const host = window.location.host.toLowerCase().trim()
    const hostWithoutPort = host.split(':')[0]
    const browserPathname = window.location.pathname

    // Check if host is a tenant subdomain (e.g. rangao.inkflow-erp.vercel.app or vision.localhost:3000)
    const isSubdomain =
      (cleanSlug && host.startsWith(`${cleanSlug}.`)) ||
      (hostWithoutPort.endsWith('.vercel.app') && hostWithoutPort.split('.').length === 4) ||
      (hostWithoutPort.endsWith('.inkflow.com.bd') && hostWithoutPort.split('.').length >= 4) ||
      (hostWithoutPort.endsWith('.localhost') && hostWithoutPort !== 'localhost') ||
      (hostWithoutPort.split('.').length > 1 && !hostWithoutPort.includes('127.0.0.1') && hostWithoutPort !== 'localhost')

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


