// ==============================================================================
// PrintERP SaaS - Phase 22: Secrets Sanitizer & Masking
// Guards API credentials, bKash merchant tokens, and sensitive personal info in logs.
// ==============================================================================

const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'api_key',
  'app_secret',
  'merchant_secret',
  'service_role',
  'auth_token',
  'credential',
  'private_key',
])

/**
 * Recursively masks sensitive fields in diagnostic payloads or audit records
 */
export function sanitizeForLog<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLog(item)) as unknown as T
  }

  const sanitized: Record<string, any> = {}
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = Array.from(SENSITIVE_KEYS).some((s) => lowerKey.includes(s))

    if (isSensitive) {
      sanitized[key] = typeof val === 'string' ? maskString(val) : '***REDACTED***'
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeForLog(val)
    } else {
      sanitized[key] = val
    }
  }

  return sanitized as T
}

export function maskString(str: string): string {
  if (!str || str.length <= 4) return '****'
  return `${str.slice(0, 2)}****${str.slice(-2)}`
}
