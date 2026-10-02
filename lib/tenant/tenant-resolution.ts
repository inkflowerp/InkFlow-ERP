// ==============================================================================
// InkFlow ERP - Authoritative Tenant Subdomain & Domain Resolution Engine
// Single shared resolution utility for middleware, DAL, server actions, and auth hooks.
// Strict single-label validation, host normalization, and host-only cookie isolation.
// ==============================================================================

/**
 * Authoritative list of reserved system subdomains and routes.
 * Cannot be claimed as tenant slugs during registration, onboarding, or renames.
 */
export const RESERVED_SLUGS = new Set([
  'www',
  'app',
  'admin',
  'platform',
  'platform-admin',
  'api',
  'auth',
  'login',
  'signin',
  'signup',
  'register',
  'mail',
  'smtp',
  'static',
  'cdn',
  'assets',
  'public',
  'docs',
  'documentation',
  'help',
  'support',
  'status',
  'billing',
  'staging',
  'stage',
  'dev',
  'test',
  'demo',
  'root',
  'system',
  'null',
  'undefined',
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
  'media',
  'ws',
])

/**
 * Standard two-part ccTLDs where registration occurs at the third level
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
 * Fallback hosts where path-based tenant routing is permitted for development/preview.
 */
export const FALLBACK_HOST_SUFFIXES = [
  '.vercel.app',
  '.pages.dev',
  '.netlify.app',
]

export type TenantResolutionType =
  | 'tenant'
  | 'platform'
  | 'marketing'
  | 'not_found'
  | 'suspended'
  | 'expired'
  | 'pending_setup'
  | 'invalid'

export interface TenantResolution {
  type: TenantResolutionType
  slug: string | null
  hostname: string
  rootDomain: string
  isCustomDomain: boolean
  isFallback: boolean
  pathname?: string
  normalizedPath?: string
  error?: string
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

export interface ResolveTenantOptions {
  overrideRootDomain?: string
  customDomains?: Map<string, string> | Record<string, string>
  allowPathFallback?: boolean
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
 * Extracts the canonical root domain from any raw host across all environments.
 */
export function extractCanonicalRootDomain(rawHost: string | null | undefined): string {
  if (!rawHost || typeof rawHost !== 'string' || !rawHost.trim()) {
    return 'localhost:3000'
  }

  const fullHost = rawHost.toLowerCase().trim().replace(/^https?:\/\//i, '').split('/')[0]
  const hostWithoutPort = fullHost.split(':')[0].replace(/\.$/, '')
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

/**
 * Normalizes and extracts the configured root domain.
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
    process.env.ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_DOMAIN ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL

  if (configured && configured.trim() !== '') {
    const clean = configured.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().trim()
    return clean.replace(/^www\./i, '').replace(/\.$/, '')
  }

  if (process.env.NODE_ENV === 'production') {
    return 'inkflowerp.com'
  }

  return 'localhost:3000'
}

/**
 * Checks whether a given slug conflicts with reserved system subdomains.
 */
export function isReservedSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return true
  const clean = slug.toLowerCase().trim()
  return RESERVED_SLUGS.has(clean)
}

/**
 * Validates slug format according to strict security & DNS invariants:
 * - Lowercase alphanumeric characters and single hyphens [a-z0-9-]
 * - Between 3 and 30 characters in length
 * - Cannot start or end with a hyphen
 * - No consecutive hyphens (--)
 * - Zero Unicode lookalike / non-ASCII characters
 */
export function isValidSlugFormat(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false
  const clean = slug.trim()
  if (clean.length < 3 || clean.length > 30) return false
  if (clean.startsWith('-') || clean.endsWith('-') || clean.includes('--')) return false
  // Strict lowercase alphanumeric + single hyphens only
  return /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(clean)
}

/**
 * Normalizes a company or workspace name into a suggested URL-safe slug.
 */
export function normalizeSlug(input: string): string {
  if (!input || typeof input !== 'string') return ''

  let normalized = input
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!normalized) {
    normalized = `workspace-${Math.random().toString(36).substring(2, 7)}`
  }

  return normalized.substring(0, 30)
}

/**
 * Normalizes raw host string:
 * - Lowercase
 * - Strips protocol (http://, https://)
 * - Strips port (:3000)
 * - Strips trailing dot (.)
 * - Strips path and query
 */
export function normalizeHost(rawHost: string | null | undefined): string {
  if (!rawHost || typeof rawHost !== 'string') return ''
  return rawHost
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .split(':')[0]
    .replace(/\.+$/, '')
}

/**
 * THE SINGLE, AUTHORITATIVE TENANT RESOLUTION UTILITY.
 * Used by proxy/middleware, server components, route handlers, Server Actions, and auth hooks.
 * 
 * Rules:
 * 1. Normalizes host (lowercase, strips port, trailing dot, protocol).
 * 2. Validates host against allowed domain patterns (ROOT_DOMAIN, *.ROOT_DOMAIN, verified custom domains, fallback hosts).
 * 3. Enforces EXACTLY ONE label for subdomains (multi-label like a.b.root.com is rejected as invalid).
 * 4. Checks reserved keywords (admin -> platform, www -> marketing, api/billing -> reserved/not_found).
 * 5. In fallback mode (localhost, *.vercel.app), resolves path-based tenant /t/[slug]/* or /[slug]/* cleanly.
 * 6. Never accepts tenant slug from arbitrary client-supplied headers in production.
 */
export function resolveTenant(
  rawHost: string | null | undefined,
  pathname = '',
  options: ResolveTenantOptions = {}
): TenantResolution {
  const host = normalizeHost(rawHost)
  const configuredRoot = normalizeHost(options.overrideRootDomain || getRootDomain())
  const inferredRoot = extractCanonicalRootDomain(host).split(':')[0]
  const rootDomain = (
    options.overrideRootDomain
      ? configuredRoot
      : (host === configuredRoot || host.endsWith(`.${configuredRoot}`))
        ? configuredRoot
        : inferredRoot
  )

  if (!host) {
    return {
      type: 'invalid',
      slug: null,
      hostname: '',
      rootDomain,
      isCustomDomain: false,
      isFallback: false,
      error: 'Host header is missing or empty',
    }
  }

  // Reject malformed hostnames (consecutive dots, invalid characters)
  if (host.includes('..') || /[^a-z0-9.-]/.test(host)) {
    return {
      type: 'invalid',
      slug: null,
      hostname: host,
      rootDomain,
      isCustomDomain: false,
      isFallback: false,
      error: 'Malformed hostname characters or consecutive dots',
    }
  }

  const isLocalhost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')

  const isPreviewHost = FALLBACK_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  const isFallbackHost = isLocalhost || isPreviewHost

  // ---------------------------------------------------------------------------
  // 1. Check Platform Host (admin.ROOT_DOMAIN or platform.ROOT_DOMAIN or admin.localhost)
  // ---------------------------------------------------------------------------
  if (
    host === `admin.${rootDomain}` ||
    host === `platform.${rootDomain}` ||
    host === 'admin.localhost' ||
    host === 'platform.localhost'
  ) {
    return {
      type: 'platform',
      slug: null,
      hostname: host,
      rootDomain,
      isCustomDomain: false,
      isFallback: isFallbackHost,
      pathname,
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Check Localhost Subdomain (e.g. vision.localhost, rangao.localhost)
  // ---------------------------------------------------------------------------
  if (host.endsWith('.localhost')) {
    const rawSubdomain = host.slice(0, -'.localhost'.length)
    const labels = rawSubdomain.split('.')

    if (labels.length !== 1) {
      return {
        type: 'invalid',
        slug: null,
        hostname: host,
        rootDomain,
        isCustomDomain: false,
        isFallback: true,
        error: 'Multi-label subdomains are not permitted',
      }
    }

    const slug = labels[0]
    if (!slug || slug === 'www') {
      return {
        type: 'marketing',
        slug: null,
        hostname: host,
        rootDomain,
        isCustomDomain: false,
        isFallback: true,
        pathname,
      }
    }

    if (slug === 'admin' || slug === 'platform' || slug === 'platform-admin') {
      return {
        type: 'platform',
        slug: null,
        hostname: host,
        rootDomain,
        isCustomDomain: false,
        isFallback: true,
        pathname,
      }
    }

    if (isReservedSlug(slug)) {
      return {
        type: 'not_found',
        slug,
        hostname: host,
        rootDomain,
        isCustomDomain: false,
        isFallback: true,
        error: `Reserved system subdomain: ${slug}`,
      }
    }

    if (!isValidSlugFormat(slug)) {
      return {
        type: 'invalid',
        slug: null,
        hostname: host,
        rootDomain,
        isCustomDomain: false,
        isFallback: true,
        error: 'Subdomain does not match required format (3-30 chars, [a-z0-9-])',
      }
    }

    return {
      type: 'tenant',
      slug,
      hostname: host,
      rootDomain,
      isCustomDomain: false,
      isFallback: true,
      pathname,
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Exact Root Domain (Marketing Portal)
  // ---------------------------------------------------------------------------
  if (host === rootDomain || host === `www.${rootDomain}` || host === 'localhost' || host === '127.0.0.1') {
    // In fallback / development / preview environments, inspect path for path-based tenant
    const allowPath = options.allowPathFallback ?? isFallbackHost
    if (allowPath && pathname) {
      const segments = pathname.split('/').filter(Boolean)
      let candidateSlug: string | null = null
      let remainingPath = pathname

      if (segments[0] === 't' && segments[1]) {
        candidateSlug = segments[1].toLowerCase().trim()
        remainingPath = '/' + segments.slice(2).join('/')
      } else if (segments[0] && !isReservedSlug(segments[0]) && isValidSlugFormat(segments[0])) {
        candidateSlug = segments[0].toLowerCase().trim()
        remainingPath = '/' + segments.slice(1).join('/')
      }

      if (candidateSlug && isValidSlugFormat(candidateSlug) && !isReservedSlug(candidateSlug)) {
        return {
          type: 'tenant',
          slug: candidateSlug,
          hostname: host,
          rootDomain,
          isCustomDomain: false,
          isFallback: true,
          pathname,
          normalizedPath: remainingPath || '/dashboard',
        }
      }
    }

    return {
      type: 'marketing',
      slug: null,
      hostname: host,
      rootDomain,
      isCustomDomain: false,
      isFallback: isFallbackHost,
      pathname,
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Subdomain Matching on Canonical Root Domain
  // ---------------------------------------------------------------------------
  if (host.endsWith(`.${rootDomain}`)) {
    const rawSubdomain = host.slice(0, -(rootDomain.length + 1))
    const cleanSubdomain = rawSubdomain.replace(/^www\./i, '')
    const labels = cleanSubdomain.split('.')

    // SECURITY INVARIANT: Accept EXACTLY ONE label
    if (labels.length !== 1) {
      return {
        type: 'invalid',
        slug: null,
        hostname: host,
        rootDomain,
        isCustomDomain: false,
        isFallback: isFallbackHost,
        error: 'Multi-label subdomains are strictly rejected',
      }
    }

    const slug = labels[0]

    if (slug === 'admin' || slug === 'platform' || slug === 'platform-admin') {
      return {
        type: 'platform',
        slug: null,
        hostname: host,
        rootDomain,
        isCustomDomain: false,
        isFallback: isFallbackHost,
        pathname,
      }
    }

    if (isReservedSlug(slug)) {
      return {
        type: 'not_found',
        slug,
        hostname: host,
        rootDomain,
        isCustomDomain: false,
        isFallback: isFallbackHost,
        error: `Reserved system subdomain: ${slug}`,
      }
    }

    if (!isValidSlugFormat(slug)) {
      return {
        type: 'invalid',
        slug: null,
        hostname: host,
        rootDomain,
        isCustomDomain: false,
        isFallback: isFallbackHost,
        error: 'Subdomain does not match required format (3-30 chars, [a-z0-9-])',
      }
    }

    return {
      type: 'tenant',
      slug,
      hostname: host,
      rootDomain,
      isCustomDomain: false,
      isFallback: isFallbackHost,
      pathname,
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Preview Fallback Hosts (e.g. *.vercel.app, *.pages.dev)
  // ---------------------------------------------------------------------------
  if (isPreviewHost) {
    // If the host itself is a preview deployment URL (e.g. inkflow-erp.vercel.app or branch-xyz.vercel.app)
    const previewRoot = extractCanonicalRootDomain(host).split(':')[0]
    if (host === previewRoot || host === `www.${previewRoot}`) {
      // Path-based tenant resolution on preview host
      const segments = pathname.split('/').filter(Boolean)
      let candidateSlug: string | null = null
      let remainingPath = pathname

      if (segments[0] === 't' && segments[1]) {
        candidateSlug = segments[1].toLowerCase().trim()
        remainingPath = '/' + segments.slice(2).join('/')
      } else if (segments[0] && !isReservedSlug(segments[0]) && isValidSlugFormat(segments[0])) {
        candidateSlug = segments[0].toLowerCase().trim()
        remainingPath = '/' + segments.slice(1).join('/')
      }

      if (candidateSlug && isValidSlugFormat(candidateSlug) && !isReservedSlug(candidateSlug)) {
        return {
          type: 'tenant',
          slug: candidateSlug,
          hostname: host,
          rootDomain: previewRoot,
          isCustomDomain: false,
          isFallback: true,
          pathname,
          normalizedPath: remainingPath || '/dashboard',
        }
      }

      return {
        type: 'marketing',
        slug: null,
        hostname: host,
        rootDomain: previewRoot,
        isCustomDomain: false,
        isFallback: true,
        pathname,
      }
    }

    // Subdomain on preview root (e.g. vision.inkflow-erp.vercel.app)
    if (host.endsWith(`.${previewRoot}`)) {
      const rawSub = host.slice(0, -(previewRoot.length + 1)).replace(/^www\./i, '')
      const labels = rawSub.split('.')
      if (labels.length === 1 && isValidSlugFormat(labels[0]) && !isReservedSlug(labels[0])) {
        return {
          type: 'tenant',
          slug: labels[0],
          hostname: host,
          rootDomain: previewRoot,
          isCustomDomain: false,
          isFallback: true,
          pathname,
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Custom Domain Mapping
  // ---------------------------------------------------------------------------
  if (options.customDomains) {
    let customSlug: string | undefined
    if (options.customDomains instanceof Map) {
      customSlug = options.customDomains.get(host)
    } else {
      customSlug = options.customDomains[host]
    }

    if (customSlug && isValidSlugFormat(customSlug)) {
      return {
        type: 'tenant',
        slug: customSlug,
        hostname: host,
        rootDomain,
        isCustomDomain: true,
        isFallback: false,
        pathname,
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Untrusted / Unrecognized Host -> Fail Closed
  // ---------------------------------------------------------------------------
  return {
    type: 'not_found',
    slug: null,
    hostname: host,
    rootDomain,
    isCustomDomain: false,
    isFallback: false,
    error: 'Unrecognized host header outside configured domains',
  }
}

/**
 * Backward-compatible helper for existing callers.
 * Delegates directly to the authoritative resolveTenant.
 */
export function resolveHostname(
  rawHost: string | null | undefined,
  overrideRootDomain?: string
): HostnameResolution {
  const resolution = resolveTenant(rawHost, '', { overrideRootDomain })
  const isLocalhost =
    resolution.hostname === 'localhost' ||
    resolution.hostname === '127.0.0.1' ||
    resolution.hostname.endsWith('.localhost') ||
    resolution.hostname.endsWith('.local')

  let hostType: HostType = 'root'
  let tenantSlug = resolution.slug
  if (resolution.type === 'tenant') {
    hostType = 'tenant'
  } else if (resolution.type === 'platform') {
    const isLegacyAdmin = resolution.hostname.startsWith('admin.')
    hostType = isLegacyAdmin ? 'reserved' : 'platform'
    tenantSlug = isLegacyAdmin ? 'admin' : 'platform'
  } else if (resolution.type === 'invalid') {
    hostType = 'invalid'
  } else if (resolution.type === 'not_found' && resolution.slug && isReservedSlug(resolution.slug)) {
    hostType = 'reserved'
  } else if (resolution.type === 'marketing') {
    hostType = 'root'
  }

  return {
    hostname: resolution.hostname,
    hostType,
    tenantSlug,
    isLocalhost,
    isDevelopment: isLocalhost,
    rootDomain: resolution.rootDomain,
  }
}

/**
 * Fast helper to extract verified tenant slug from request hostname.
 */
export function extractTenantSlug(
  rawHost: string | null | undefined,
  overrideRootDomain?: string
): string | null {
  const resolution = resolveTenant(rawHost, '', { overrideRootDomain })
  return resolution.type === 'tenant' ? resolution.slug : null
}

/**
 * Returns security cookie options for authentication.
 * 
 * STRICT SECURITY INVARIANT:
 * - Cookies are strictly HOST-ONLY (domain is undefined).
 * - NEVER sets a wildcard domain cookie (.ROOT_DOMAIN) to eliminate cross-subdomain session leaks.
 * - Platform and tenant cookies never share scope.
 * - Always httpOnly: true to prevent script-based token harvesting.
 */
export function getAuthCookieOptions(requestHost?: string) {
  const isProd = process.env.NODE_ENV === 'production'
  const host = normalizeHost(requestHost)
  const isLocalhost = !host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')

  return {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax' as const,
    secure: isProd && !isLocalhost,
    domain: undefined, // STRICTLY HOST-ONLY! Zero wildcard domain cookies.
    httpOnly: true, // Secure against client-side script access
  }
}
