// ==============================================================================
// PrintERP SaaS - Phase 22: In-Memory Sliding Window Rate Limiter Architecture
// Protects authentication endpoints, financial transaction mutators, and API routes.
// ==============================================================================

export type RateLimitTier = 'auth' | 'financial' | 'mutation' | 'api'

interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
}

const TIER_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  auth: { maxRequests: 5, windowSeconds: 60 }, // 5 login/password attempts per minute
  financial: { maxRequests: 30, windowSeconds: 60 }, // 30 payments/invoices per minute
  mutation: { maxRequests: 60, windowSeconds: 60 }, // 60 general updates per minute
  api: { maxRequests: 150, windowSeconds: 60 }, // 150 general reads/writes per minute
}

interface WindowRecord {
  timestamps: number[]
}

const store = new Map<string, WindowRecord>()

// Periodically clean up stale rate-limit records (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 300000)
      if (record.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }, 300000)
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetSeconds: number
  limit: number
}

export function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = 'api'
): RateLimitResult {
  const now = Date.now()
  const config = TIER_CONFIGS[tier]
  const windowMs = config.windowSeconds * 1000
  const key = `${tier}:${identifier}`

  let record = store.get(key)
  if (!record) {
    record = { timestamps: [] }
    store.set(key, record)
  }

  // Filter timestamps within the current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs)

  if (record.timestamps.length >= config.maxRequests) {
    const oldestTimestamp = record.timestamps[0]
    const resetSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000)

    return {
      success: false,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
      limit: config.maxRequests,
    }
  }

  record.timestamps.push(now)
  const remaining = config.maxRequests - record.timestamps.length

  return {
    success: true,
    remaining,
    resetSeconds: config.windowSeconds,
    limit: config.maxRequests,
  }
}
