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

  if (!cleanSlug) {
    const isProd = process.env.NODE_ENV === 'production' && !rootDomain.includes('localhost')
    return `${isProd ? 'https' : 'http'}://${rootDomain}`
  }

  // Handle localhost development
  if (rootDomain.includes('localhost') || rootDomain.includes('127.0.0.1')) {
    const port = rootDomain.includes(':') ? `:${rootDomain.split(':')[1]}` : ':3000'
    return `http://${cleanSlug}.localhost${port}`
  }

  // Handle production subdomain
  const isProd = process.env.NODE_ENV === 'production'
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
