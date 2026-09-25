// ==============================================================================
// PrintERP / InkFlow SaaS - Tenant Subdomain Resolution & Validation Engine
// Robust, production-grade hostname extraction, slug normalization, and reserved protection.
// ==============================================================================

/**
 * List of reserved system subdomains and paths that cannot be claimed as tenant slugs.
 */
export const RESERVED_SLUGS = new Set([
  'www',
  'app',
  'admin',
  'api',
  'support',
  'status',
  'docs',
  'documentation',
  'mail',
  'email',
  'billing',
  'login',
  'signin',
  'signup',
  'register',
  'auth',
  'oauth',
  'static',
  'assets',
  'public',
  'platform',
  'platform-admin',
  'help',
  'root',
  'ws',
  'cdn',
  'media',
  'test',
  'dev',
  'staging',
  'stage',
  'portal',
  'webhook',
  'webhooks',
  'account',
  'accounts',
  'dashboard',
  'settings',
  'onboarding',
  'pricing',
  'features',
  'solutions',
  'about',
  'contact',
  'terms',
  'privacy',
  'faq',
  'logout',
  'signout',
  'verify',
  'forgot-password',
  'reset-password',
  '403',
  '404',
  '500',
  'health',
  'healthz',
  'ping',
  'sitemap',
  'robots',
  'manifest',
  'icons',
  'fonts',
  'images',
  'download',
  'files',
  'system',
  'root',
  'demo',
])

/**
 * Standard two-part ccTLDs where the registry requires second-level registration
 * (e.g. inkflow.com.bd, not inkflow.bd).
 */
export const TWO_PART_TLDS = new Set([
  'com.bd',
  'net.bd',
  'org.bd',
  'edu.bd',
  'gov.bd',
  'ac.bd',
  'mil.bd',
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'co.nz',
  'net.nz',
  'org.nz',
  'com.au',
  'net.au',
  'org.au',
  'co.in',
  'net.in',
  'org.in',
  'co.jp',
  'ne.jp',
  'or.jp',
  'com.br',
  'net.br',
  'org.br',
  'com.sg',
  'com.my',
  'com.ph',
  'com.pk',
])

/**
 * Extracts the canonical root domain from any raw host across all environments.
 * Examples:
 * - 'rangao.inkflow-erp.vercel.app' -> 'inkflow-erp.vercel.app'
 * - 'inkflow-erp.vercel.app' -> 'inkflow-erp.vercel.app'
 * - 'rangao.inkflow.bd' -> 'inkflow.bd'
 * - 'inkflow.bd' -> 'inkflow.bd'
 * - 'vision-sign.inkflow.com' -> 'inkflow.com'
 * - 'inkflow.com' -> 'inkflow.com'
 * - 'vision.inkflow.com.bd' -> 'inkflow.com.bd'
 * - 'inkflow.com.bd' -> 'inkflow.com.bd'
 * - 'vision.localhost:3000' -> 'localhost:3000'
 * - 'localhost:3000' -> 'localhost:3000'
 */
export function extractCanonicalRootDomain(rawHost: string | null | undefined): string {
  if (!rawHost || typeof rawHost !== 'string' || !rawHost.trim()) {
    return 'localhost:3000'
  }

  const fullHost = rawHost.toLowerCase().trim().replace(/^https?:\/\//i, '').split('/')[0]
  const hostWithoutPort = fullHost.split(':')[0]
  const port = fullHost.includes(':') ? `:${fullHost.split(':')[1]}` : ''

  // 1. Localhost and local IP development hosts
  if (
    hostWithoutPort === 'localhost' ||
    hostWithoutPort === '127.0.0.1' ||
    hostWithoutPort.endsWith('.localhost') ||
    hostWithoutPort.endsWith('.local') ||
    hostWithoutPort.startsWith('192.168.') ||
    hostWithoutPort.startsWith('10.') ||
    hostWithoutPort.startsWith('172.')
  ) {
    return `localhost${port || ':3000'}`
  }

  // 2. Vercel deployment URLs (*.vercel.app)
  if (hostWithoutPort.endsWith('.vercel.app')) {
    const parts = hostWithoutPort.split('.')
    if (parts.length >= 3) {
      return parts.slice(-3).join('.') + port
    }
    return hostWithoutPort + port
  }

  // 3. General domain parsing (Two-part TLD vs Single-part TLD)
  const parts = hostWithoutPort.split('.')
  if (parts.length >= 2) {
    const lastTwo = parts.slice(-2).join('.')
    if (TWO_PART_TLDS.has(lastTwo)) {
      if (parts.length >= 3) {
        return parts.slice(-3).join('.') + port
      }
      return hostWithoutPort + port
    } else {
      return parts.slice(-2).join('.') + port
    }
  }

  return hostWithoutPort + port
}

let runtimeRootDomain: string | null = null

/**
 * Sets the active platform-configured root domain dynamically.
 */
export function setRuntimeRootDomain(domain: string | null | undefined): void {
  if (domain && domain.trim()) {
    runtimeRootDomain = domain.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().trim()
  } else {
    runtimeRootDomain = null
  }
}

/**
 * Normalizes and extracts the configured root domain.
 * Context-aware: In browser context, derives the active root domain directly from window.location.host.
 */
export function getRootDomain(): string {
  if (runtimeRootDomain) {
    return runtimeRootDomain
  }

  // 1. Client-side browser runtime: Extract canonical root from active browser host
  if (typeof window !== 'undefined' && window.location && window.location.host) {
    return extractCanonicalRootDomain(window.location.host)
  }

  // 2. Explicit server environment variables
  const configured =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_DOMAIN ||
    process.env.ROOT_DOMAIN ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL

  if (configured && configured.trim() !== '') {
    // Strip protocol if present and strip leading www.
    const clean = configured.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().trim()
    return clean.replace(/^www\./i, '')
  }

  if (process.env.NODE_ENV === 'production') {
    return 'inkflow.com.bd'
  }

  return 'localhost:3000'
}

/**
 * Checks whether a given slug conflicts with reserved system subdomains.
 */
export function isReservedSlug(slug: string): boolean {
  if (!slug) return true
  const clean = slug.toLowerCase().trim()
  return RESERVED_SLUGS.has(clean)
}

/**
 * Validates slug format:
 * - Lowercase alphanumeric characters and single hyphens
 * - Cannot start or end with a hyphen
 * - Length between 3 and 63 characters (RFC 1035 / DNS standard)
 * - Rejects path traversal (../), spaces, slashes, uppercase, symbols
 */
export function isValidSlugFormat(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false
  const clean = slug.trim()
  if (clean.length < 3 || clean.length > 63) return false
  // Disallow leading/trailing hyphens and consecutive hyphens
  if (clean.startsWith('-') || clean.endsWith('-') || clean.includes('--')) return false
  // Strict regex matching DNS subdomain naming conventions
  return /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])$/.test(clean)
}

/**
 * Normalizes a company name into a suggested URL-safe slug.
 * Examples:
 * "Vision Sign" -> "vision-sign"
 * "ABC Printing Ltd." -> "abc-printing-ltd"
 * "Rahman's Signage 2026" -> "rahmans-signage-2026"
 */
export function normalizeSlug(input: string): string {
  if (!input || typeof input !== 'string') return ''

  let normalized = input
    .toLowerCase()
    .trim()
    // Remove apostrophes and quotes
    .replace(/['"`]/g, '')
    // Replace non-alphanumeric characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Replace multiple consecutive hyphens with a single hyphen
    .replace(/-+/g, '-')
    // Strip leading and trailing hyphens
    .replace(/^-+|-+$/g, '')

  // Fallback for non-Latin / Bengali names where regex leaves nothing
  if (!normalized) {
    normalized = `company-${Math.random().toString(36).substring(2, 7)}`
  }

  return normalized.substring(0, 50)
}

export type HostType =
  | 'root'
  | 'tenant'
  | 'platform'
  | 'reserved'
  | 'invalid'

export interface HostnameResolution {
  hostname: string
  hostType: HostType
  tenantSlug: string | null
  isLocalhost: boolean
  isDevelopment: boolean
  rootDomain: string
}

/**
 * Authoritative hostname parsing and tenant resolution.
 * Detects whether the incoming request is for:
 * 1. Root domain (e.g. inkflow.com.bd, www.inkflow.com.bd, localhost:3000, 127.0.0.1)
 * 2. Tenant subdomain (e.g. vision.inkflow.com.bd, abc-print.inkflow.com.bd, vision.localhost:3000)
 * 3. Reserved subdomain (e.g. app.inkflow.com.bd, admin.inkflow.com.bd)
 * 4. Invalid or malformed hostnames
 */
export function resolveHostname(
  rawHost: string | null | undefined,
  overrideRootDomain?: string
): HostnameResolution {
  const fallbackRoot = (overrideRootDomain || getRootDomain()).toLowerCase().trim()

  if (!rawHost || typeof rawHost !== 'string' || !rawHost.trim()) {
    return {
      hostname: '',
      hostType: 'invalid',
      tenantSlug: null,
      isLocalhost: true,
      isDevelopment: process.env.NODE_ENV !== 'production',
      rootDomain: fallbackRoot,
    }
  }

  // Normalize host: lowercase, strip protocol, strip port for analysis
  const fullHost = rawHost.toLowerCase().trim().replace(/^https?:\/\//i, '').split('/')[0]
  const hostWithoutPort = fullHost.split(':')[0]
  const port = fullHost.includes(':') ? `:${fullHost.split(':')[1]}` : ''

  // Reject malformed hostnames (double dots, leading/trailing dots)
  if (hostWithoutPort.includes('..') || hostWithoutPort.startsWith('.') || hostWithoutPort.endsWith('.')) {
    return {
      hostname: fullHost,
      hostType: 'invalid',
      tenantSlug: null,
      isLocalhost: false,
      isDevelopment: process.env.NODE_ENV !== 'production',
      rootDomain: fallbackRoot,
    }
  }

  const isLocalhost =
    hostWithoutPort === 'localhost' ||
    hostWithoutPort === '127.0.0.1' ||
    hostWithoutPort.endsWith('.localhost') ||
    hostWithoutPort.endsWith('.local') ||
    hostWithoutPort.startsWith('192.168.') ||
    hostWithoutPort.startsWith('10.') ||
    hostWithoutPort.startsWith('172.')

  const isDevelopment = isLocalhost

  // 1. Explicit Localhost / Development IP Root
  if (
    hostWithoutPort === 'localhost' ||
    hostWithoutPort === '127.0.0.1' ||
    hostWithoutPort.startsWith('192.168.') ||
    hostWithoutPort.startsWith('10.') ||
    hostWithoutPort.startsWith('172.')
  ) {
    return {
      hostname: fullHost,
      hostType: 'root',
      tenantSlug: null,
      isLocalhost: true,
      isDevelopment: true,
      rootDomain: `localhost${port || ':3000'}`,
    }
  }

  // 2. Localhost Subdomains (e.g. vision.localhost, rangao.localhost:3000)
  if (hostWithoutPort.endsWith('.localhost')) {
    const slug = hostWithoutPort.replace(/\.localhost$/, '').toLowerCase().trim()
    const targetRoot = `localhost${port || ':3000'}`

    if (!slug || slug === 'www') {
      return {
        hostname: fullHost,
        hostType: 'root',
        tenantSlug: null,
        isLocalhost: true,
        isDevelopment: true,
        rootDomain: targetRoot,
      }
    }

    if (isReservedSlug(slug)) {
      return {
        hostname: fullHost,
        hostType: slug === 'platform' ? 'platform' : 'reserved',
        tenantSlug: slug,
        isLocalhost: true,
        isDevelopment: true,
        rootDomain: targetRoot,
      }
    }

    if (!isValidSlugFormat(slug)) {
      return {
        hostname: fullHost,
        hostType: 'invalid',
        tenantSlug: null,
        isLocalhost: true,
        isDevelopment: true,
        rootDomain: targetRoot,
      }
    }

    return {
      hostname: fullHost,
      hostType: 'tenant',
      tenantSlug: slug,
      isLocalhost: true,
      isDevelopment: true,
      rootDomain: targetRoot,
    }
  }

  // 3. Determine the canonical root domain for this request
  const canonicalRoot = (
    overrideRootDomain
      ? overrideRootDomain.toLowerCase().trim().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '')
      : extractCanonicalRootDomain(hostWithoutPort).split(':')[0]
  )

  // 4. Exact Root Domain matches (e.g. inkflow-erp.vercel.app, inkflow.bd, inkflow.com, inkflow.com.bd, and www.*)
  if (
    hostWithoutPort === canonicalRoot ||
    hostWithoutPort === `www.${canonicalRoot}`
  ) {
    return {
      hostname: fullHost,
      hostType: 'root',
      tenantSlug: null,
      isLocalhost: false,
      isDevelopment: false,
      rootDomain: canonicalRoot,
    }
  }

  // 5. Canonical Subdomain matching on canonicalRoot
  if (hostWithoutPort.endsWith(`.${canonicalRoot}`)) {
    const rawSubdomain = hostWithoutPort.slice(0, -(canonicalRoot.length + 1)).toLowerCase().trim()
    const slugParts = rawSubdomain.split('.').filter((p) => Boolean(p) && p !== 'www')
    const slug = slugParts[slugParts.length - 1] || ''

    if (!slug || slug === 'www') {
      return {
        hostname: fullHost,
        hostType: 'root',
        tenantSlug: null,
        isLocalhost: false,
        isDevelopment: false,
        rootDomain: canonicalRoot,
      }
    }

    if (isReservedSlug(slug)) {
      return {
        hostname: fullHost,
        hostType: slug === 'platform' ? 'platform' : 'reserved',
        tenantSlug: slug,
        isLocalhost: false,
        isDevelopment: false,
        rootDomain: canonicalRoot,
      }
    }

    if (!isValidSlugFormat(slug)) {
      return {
        hostname: fullHost,
        hostType: 'invalid',
        tenantSlug: null,
        isLocalhost: false,
        isDevelopment: false,
        rootDomain: canonicalRoot,
      }
    }

    return {
      hostname: fullHost,
      hostType: 'tenant',
      tenantSlug: slug,
      isLocalhost: false,
      isDevelopment: false,
      rootDomain: canonicalRoot,
    }
  }

  // 6. Dynamic multi-domain fallback:
  // If an overrideRootDomain was provided that didn't match the host, check host's intrinsic root
  const hostRoot = extractCanonicalRootDomain(hostWithoutPort).split(':')[0]
  if (hostRoot !== hostWithoutPort && hostWithoutPort.endsWith(`.${hostRoot}`)) {
    const rawSubdomain = hostWithoutPort.slice(0, -(hostRoot.length + 1)).toLowerCase().trim()
    const slugParts = rawSubdomain.split('.').filter((p) => Boolean(p) && p !== 'www')
    const slug = slugParts[slugParts.length - 1] || ''

    if (!slug || slug === 'www') {
      return {
        hostname: fullHost,
        hostType: 'root',
        tenantSlug: null,
        isLocalhost: false,
        isDevelopment: false,
        rootDomain: hostRoot,
      }
    }

    if (isReservedSlug(slug)) {
      return {
        hostname: fullHost,
        hostType: slug === 'platform' ? 'platform' : 'reserved',
        tenantSlug: slug,
        isLocalhost: false,
        isDevelopment: false,
        rootDomain: hostRoot,
      }
    }

    if (!isValidSlugFormat(slug)) {
      return {
        hostname: fullHost,
        hostType: 'invalid',
        tenantSlug: null,
        isLocalhost: false,
        isDevelopment: false,
        rootDomain: hostRoot,
      }
    }

    return {
      hostname: fullHost,
      hostType: 'tenant',
      tenantSlug: slug,
      isLocalhost: false,
      isDevelopment: false,
      rootDomain: hostRoot,
    }
  }

  // 7. Standalone domain fallback
  return {
    hostname: fullHost,
    hostType: 'root',
    tenantSlug: null,
    isLocalhost,
    isDevelopment,
    rootDomain: canonicalRoot || hostWithoutPort,
  }
}

/**
 * Fast helper to extract verified tenant slug from request hostname.
 * Returns null for root, reserved, or invalid domains.
 */
export function extractTenantSlug(
  rawHost: string | null | undefined,
  overrideRootDomain?: string
): string | null {
  const resolution = resolveHostname(rawHost, overrideRootDomain)
  return resolution.hostType === 'tenant' ? resolution.tenantSlug : null
}

/**
 * Returns security cookie options for cross-subdomain authentication.
 * In production: Configures domain attribute to .inkflow.com.bd (derived dynamically from root domain)
 * In development: Omits domain attribute so localhost and *.localhost share session smoothly.
 */
export function getAuthCookieOptions(customDomain?: string) {
  const rootDomain = (customDomain || getRootDomain()).toLowerCase().trim()
  const cleanRoot = rootDomain.split(':')[0].replace(/^www\./i, '')
  const isLocalhost =
    cleanRoot === 'localhost' ||
    cleanRoot === '127.0.0.1' ||
    cleanRoot.endsWith('.localhost') ||
    cleanRoot.endsWith('.local') ||
    cleanRoot.startsWith('192.168.') ||
    cleanRoot.startsWith('10.') ||
    cleanRoot.startsWith('172.')

  // Domains on the Public Suffix List (like vercel.app, pages.dev, netlify.app)
  // cannot set wildcard cookies (e.g. .inkflow-erp.vercel.app is rejected by browsers)
  const isPublicSuffix =
    cleanRoot.endsWith('.vercel.app') ||
    cleanRoot.endsWith('.pages.dev') ||
    cleanRoot.endsWith('.netlify.app')

  const isExplicitProdDomain = Boolean(customDomain && !isLocalhost && customDomain.includes('.'))
  const isProd = process.env.NODE_ENV === 'production' || isExplicitProdDomain

  const domain = isProd && !isLocalhost && !isPublicSuffix ? `.${cleanRoot}` : undefined

  return {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax' as const,
    secure: isProd && !isLocalhost,
    domain,
  }
}

