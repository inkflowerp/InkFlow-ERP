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
 * Normalizes and extracts the configured root domain.
 * Defaults to 'inkflow.com.bd' in production, 'localhost:3000' in development.
 */
export function getRootDomain(): string {
  const configured =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_DOMAIN ||
    process.env.ROOT_DOMAIN

  if (configured && configured.trim() !== '') {
    // Strip protocol if present
    return configured.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().trim()
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
  const rootDomain = (overrideRootDomain || getRootDomain()).toLowerCase().trim()
  const cleanRoot = rootDomain.split(':')[0] // strip port for comparison

  if (!rawHost || typeof rawHost !== 'string' || !rawHost.trim()) {
    return {
      hostname: '',
      hostType: 'invalid',
      tenantSlug: null,
      isLocalhost: true,
      isDevelopment: process.env.NODE_ENV !== 'production',
      rootDomain,
    }
  }

  // Normalize host: lowercase, strip protocol, strip port for analysis
  const fullHost = rawHost.toLowerCase().trim().replace(/^https?:\/\//i, '').split('/')[0]
  const hostWithoutPort = fullHost.split(':')[0]

  // Check for malformed double dots or empty segments
  if (hostWithoutPort.includes('..') || hostWithoutPort.startsWith('.') || hostWithoutPort.endsWith('.')) {
    return {
      hostname: fullHost,
      hostType: 'invalid',
      tenantSlug: null,
      isLocalhost: false,
      isDevelopment: process.env.NODE_ENV !== 'production',
      rootDomain,
    }
  }

  const isLocalhost =
    hostWithoutPort === 'localhost' ||
    hostWithoutPort === '127.0.0.1' ||
    hostWithoutPort.endsWith('.localhost') ||
    hostWithoutPort.endsWith('.local')

  const isDevelopment = isLocalhost || (process.env.NODE_ENV !== 'production' && !hostWithoutPort.endsWith('inkflow.com.bd'))

  // 1. Exact Root Domain matches (e.g. inkflow.com.bd, www.inkflow.com.bd, localhost, 127.0.0.1)
  if (
    hostWithoutPort === cleanRoot ||
    hostWithoutPort === 'inkflow.com.bd' ||
    hostWithoutPort === 'www.inkflow.com.bd' ||
    hostWithoutPort === `www.${cleanRoot}` ||
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
      isLocalhost,
      isDevelopment,
      rootDomain: hostWithoutPort.endsWith('inkflow.com.bd') ? 'inkflow.com.bd' : rootDomain,
    }
  }

  // 2. Vercel preview / deployment URLs (e.g. printerp-xxx.vercel.app)
  if (hostWithoutPort.endsWith('.vercel.app')) {
    if (hostWithoutPort === cleanRoot) {
      return {
        hostname: fullHost,
        hostType: 'root',
        tenantSlug: null,
        isLocalhost,
        isDevelopment,
        rootDomain,
      }
    }
    const vercelParts = hostWithoutPort.split('.')
    if (vercelParts.length <= 3) {
      return {
        hostname: fullHost,
        hostType: 'root',
        tenantSlug: null,
        isLocalhost,
        isDevelopment,
        rootDomain,
      }
    }
  }

  // 3. Localhost Subdomains (e.g. vision.localhost, abc.localhost:3000)
  if (hostWithoutPort.endsWith('.localhost')) {
    const slug = hostWithoutPort.replace(/\.localhost$/, '').toLowerCase().trim()
    if (!slug) {
      return {
        hostname: fullHost,
        hostType: 'root',
        tenantSlug: null,
        isLocalhost,
        isDevelopment,
        rootDomain,
      }
    }

    if (isReservedSlug(slug)) {
      return {
        hostname: fullHost,
        hostType: slug === 'platform' ? 'platform' : 'reserved',
        tenantSlug: slug,
        isLocalhost,
        isDevelopment,
        rootDomain,
      }
    }

    if (!isValidSlugFormat(slug)) {
      return {
        hostname: fullHost,
        hostType: 'invalid',
        tenantSlug: null,
        isLocalhost,
        isDevelopment,
        rootDomain,
      }
    }

    return {
      hostname: fullHost,
      hostType: 'tenant',
      tenantSlug: slug,
      isLocalhost,
      isDevelopment,
      rootDomain,
    }
  }

  // 4. Production Domain Subdomains (e.g. vision.inkflow.com.bd, or subdomains of cleanRoot)
  const canonicalRoot = hostWithoutPort.endsWith('.inkflow.com.bd') ? 'inkflow.com.bd' : cleanRoot
  if (hostWithoutPort.endsWith(`.${canonicalRoot}`)) {
    const rawSubdomain = hostWithoutPort.slice(0, -(canonicalRoot.length + 1)).toLowerCase().trim()

    // Handle nested subdomains if any (take the deepest label: e.g. vision in vision.inkflow.com.bd)
    const slugParts = rawSubdomain.split('.').filter(Boolean)
    const slug = slugParts[slugParts.length - 1] || ''

    if (!slug || slug === 'www') {
      return {
        hostname: fullHost,
        hostType: 'root',
        tenantSlug: null,
        isLocalhost,
        isDevelopment,
        rootDomain: canonicalRoot,
      }
    }

    if (isReservedSlug(slug)) {
      return {
        hostname: fullHost,
        hostType: slug === 'platform' ? 'platform' : 'reserved',
        tenantSlug: slug,
        isLocalhost,
        isDevelopment,
        rootDomain: canonicalRoot,
      }
    }

    if (!isValidSlugFormat(slug)) {
      return {
        hostname: fullHost,
        hostType: 'invalid',
        tenantSlug: null,
        isLocalhost,
        isDevelopment,
        rootDomain: canonicalRoot,
      }
    }

    return {
      hostname: fullHost,
      hostType: 'tenant',
      tenantSlug: slug,
      isLocalhost,
      isDevelopment,
      rootDomain: canonicalRoot,
    }
  }

  // 5. Standalone or custom domain resolution fallback
  return {
    hostname: fullHost,
    hostType: 'root',
    tenantSlug: null,
    isLocalhost,
    isDevelopment,
    rootDomain,
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
  const rootDomain = customDomain || getRootDomain()
  const isLocalhost =
    rootDomain.includes('localhost') ||
    rootDomain.includes('127.0.0.1') ||
    rootDomain.startsWith('192.168.') ||
    rootDomain.startsWith('10.') ||
    rootDomain.startsWith('172.')

  const isExplicitProdDomain = Boolean(customDomain && !isLocalhost && customDomain.includes('.'))
  const isProd = process.env.NODE_ENV === 'production' || isExplicitProdDomain

  const domain = isProd && !isLocalhost ? `.${rootDomain}` : undefined

  return {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax' as const,
    secure: isProd && !isLocalhost,
    domain,
  }
}

