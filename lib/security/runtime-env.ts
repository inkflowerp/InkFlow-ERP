/**
 * Runtime environment detection for InkFlow SaaS.
 * Distinguishes between test suites, browser, and server execution.
 */
export function isTestEnvironment(): boolean {
  if (typeof process === 'undefined') return false
  if (process.env.NODE_ENV === 'production') return false
  return (
    process.env.NODE_ENV === 'test' ||
    typeof process.env.NODE_TEST_CONTEXT !== 'undefined' ||
    Boolean(process.env.npm_lifecycle_event && process.env.npm_lifecycle_event.includes('test')) ||
    (Array.isArray(process.execArgv) && process.execArgv.includes('--test')) ||
    (Array.isArray(process.argv) && process.argv.some(arg => arg.includes('--test') || arg.includes('tests/')))
  )
}

/**
 * Resolves the canonical application base URL dynamically across Vercel, production, and dev environments.
 */
export function resolveAppBaseUrl(explicitUrl?: string): string {
  const isLocal = (url: string) =>
    url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0')

  // If explicitUrl is provided and is a valid non-localhost URL, honor it immediately
  if (explicitUrl && typeof explicitUrl === 'string' && explicitUrl.trim() !== '') {
    const trimmed = explicitUrl.trim().replace(/\/$/, '')
    if (!isLocal(trimmed)) {
      return trimmed
    }
  }

  // 1. Explicit Application URLs from environment
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('your-domain')) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '')
    if (!isLocal(appUrl) || (explicitUrl && isLocal(explicitUrl))) {
      return appUrl
    }
  }
  if (process.env.APP_URL && !process.env.APP_URL.includes('your-domain')) {
    const appUrl = process.env.APP_URL.trim().replace(/\/$/, '')
    if (!isLocal(appUrl) || (explicitUrl && isLocal(explicitUrl))) {
      return appUrl
    }
  }

  // 2. Vercel System URLs
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().replace(/\/$/, '')}`
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    const url = process.env.NEXT_PUBLIC_VERCEL_URL.trim().replace(/\/$/, '')
    return url.startsWith('http') ? url : `https://${url}`
  }
  if (process.env.VERCEL_URL) {
    const url = process.env.VERCEL_URL.trim().replace(/\/$/, '')
    return url.startsWith('http') ? url : `https://${url}`
  }

  // 3. Browser runtime origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }

  // 4. Fallback to explicitUrl if provided (even if local)
  if (explicitUrl && typeof explicitUrl === 'string' && explicitUrl.trim() !== '') {
    return explicitUrl.trim().replace(/\/$/, '')
  }

  // 5. Default local development fallback
  return 'http://localhost:3000'
}

/**
 * Resolves request origin dynamically from Request or Headers (e.g., x-forwarded-host, host)
 */
export function resolveRequestOrigin(
  reqOrHeaders?: Request | Headers | { get(name: string): string | null } | null
): string {
  let forwardedHost: string | null = null
  let forwardedProto: string | null = null

  if (reqOrHeaders) {
    if ('headers' in reqOrHeaders && reqOrHeaders.headers && typeof reqOrHeaders.headers.get === 'function') {
      forwardedHost = reqOrHeaders.headers.get('x-forwarded-host') || reqOrHeaders.headers.get('host')
      forwardedProto = reqOrHeaders.headers.get('x-forwarded-proto')
    } else if (typeof (reqOrHeaders as any).get === 'function') {
      forwardedHost = (reqOrHeaders as any).get('x-forwarded-host') || (reqOrHeaders as any).get('host')
      forwardedProto = (reqOrHeaders as any).get('x-forwarded-proto')
    }
  }

  let derivedOrigin: string | undefined
  if (forwardedHost) {
    const proto =
      forwardedProto ||
      (forwardedHost.includes('localhost') || forwardedHost.includes('127.0.0.1') ? 'http' : 'https')
    derivedOrigin = `${proto}://${forwardedHost}`
  }

  return resolveAppBaseUrl(derivedOrigin)
}
