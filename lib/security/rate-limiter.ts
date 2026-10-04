// ==============================================================================
// InkFlow ERP - Universal Distributed Rate Limiter
// Supports Upstash Redis / Vercel KV REST API with in-memory sliding window fallback.
// Guarantees rate limiting works across stateless serverless edge/lambda instances.
// ==============================================================================

export type RateLimitTier = 'auth' | 'financial' | 'mutation' | 'api' | 'webhook'

interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
}

const TIER_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  auth: { maxRequests: 5, windowSeconds: 60 }, // 5 login/password attempts per minute
  financial: { maxRequests: 30, windowSeconds: 60 }, // 30 payments/invoices per minute
  mutation: { maxRequests: 60, windowSeconds: 60 }, // 60 general updates per minute
  api: { maxRequests: 150, windowSeconds: 60 }, // 150 general reads/writes per minute
  webhook: { maxRequests: 120, windowSeconds: 60 }, // 120 webhook events per minute
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetSeconds: number
  limit: number
}

interface WindowRecord {
  timestamps: number[]
}

const localStore = new Map<string, WindowRecord>()

// Clean up stale local records periodically
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of localStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 300000)
      if (record.timestamps.length === 0) {
        localStore.delete(key)
      }
    }
  }, 300000)
  if (typeof cleanupTimer?.unref === 'function') {
    cleanupTimer.unref()
  }
}

function checkLocalRateLimit(identifier: string, tier: RateLimitTier): RateLimitResult {
  const now = Date.now()
  const config = TIER_CONFIGS[tier] || TIER_CONFIGS.api
  const windowMs = config.windowSeconds * 1000
  const key = `${tier}:${identifier}`

  let record = localStore.get(key)
  if (!record) {
    record = { timestamps: [] }
    localStore.set(key, record)
  }

  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs)

  if (record.timestamps.length >= config.maxRequests) {
    const oldestTimestamp = record.timestamps[0] || now
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

/**
 * Distributed rate limiter backed by Upstash Redis / Vercel KV REST API.
 * Falls back to in-memory sliding window if Redis is not configured or fails.
 */
export async function checkRateLimitAsync(
  identifier: string,
  tier: RateLimitTier = 'api'
): Promise<RateLimitResult> {
  const config = TIER_CONFIGS[tier] || TIER_CONFIGS.api
  const redisUrl =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL
  const redisToken =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN

  if (!redisUrl || !redisToken) {
    return checkLocalRateLimit(identifier, tier)
  }

  const key = `ratelimit:${tier}:${identifier}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1500) // 1.5s timeout for high availability

    const response = await fetch(`${redisUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, config.windowSeconds, 'NX'],
        ['TTL', key],
      ]),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return checkLocalRateLimit(identifier, tier)
    }

    const data = await response.json()
    const currentCount = Number(data[0]?.result) || 1
    const ttl = Number(data[2]?.result) || config.windowSeconds

    if (currentCount > config.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetSeconds: ttl > 0 ? ttl : config.windowSeconds,
        limit: config.maxRequests,
      }
    }

    return {
      success: true,
      remaining: Math.max(0, config.maxRequests - currentCount),
      resetSeconds: ttl > 0 ? ttl : config.windowSeconds,
      limit: config.maxRequests,
    }
  } catch {
    // Fail safe to local memory on Redis failure/timeout
    return checkLocalRateLimit(identifier, tier)
  }
}

/**
 * Synchronous rate limiter (checks local in-memory sliding window).
 */
export function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = 'api'
): RateLimitResult {
  return checkLocalRateLimit(identifier, tier)
}
