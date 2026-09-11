// ==============================================================================
// PrintERP SaaS - Phase 28: Production API Pagination, Sorting, Filtering & Rate Limiting
// Prevents memory exhaustion and DDoS on tenant endpoints
// ==============================================================================

export interface PaginationParams {
  page: number
  pageSize: number
  offset: number
}

export interface SortParams<T = string> {
  sortBy: T
  sortDirection: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

/**
 * Extract safe, clamped pagination arguments from query params
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultPageSize = 25,
  maxPageSize = 100
): PaginationParams {
  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const rawPageSize = parseInt(searchParams.get('pageSize') || String(defaultPageSize), 10)

  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
  const pageSize =
    isNaN(rawPageSize) || rawPageSize < 1
      ? defaultPageSize
      : Math.min(rawPageSize, maxPageSize)

  const offset = (page - 1) * pageSize

  return { page, pageSize, offset }
}

/**
 * Extract validated sorting parameters
 */
export function parseSortParams<T extends string>(
  searchParams: URLSearchParams,
  allowedFields: readonly T[],
  defaultField: T,
  defaultDirection: 'asc' | 'desc' = 'desc'
): SortParams<T> {
  const rawSortBy = searchParams.get('sortBy') as T | null
  const rawDirection = searchParams.get('sortDirection')

  const sortBy = rawSortBy && allowedFields.includes(rawSortBy) ? rawSortBy : defaultField
  const sortDirection = rawDirection === 'asc' || rawDirection === 'desc' ? rawDirection : defaultDirection

  return { sortBy, sortDirection }
}

/**
 * Format records and metadata into a standard paginated response envelope
 */
export function buildPaginatedResponse<T>(
  data: T[],
  totalCount: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return {
    data,
    meta: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  }
}

export interface RateLimitResult {
  isAllowed: boolean
  remaining: number
  resetTime: number
  source: 'local_memory' | 'distributed_store'
}

// In-memory sliding window rate limiter for tenant API requests (Single-Instance / Local Protection)
const RATE_LIMIT_CACHE = new Map<string, { timestamps: number[] }>()

/**
 * Synchronous local sliding-window rate limiter (Single-Instance Protection)
 * Default limit: 120 requests per minute per tenant endpoint
 */
export function checkTenantRateLimit(
  companyId: string,
  endpoint: string,
  maxRequestsPerMinute = 120
): { isAllowed: boolean; remaining: number; resetTime: number; source: 'local_memory' } {
  const key = `${companyId}:${endpoint}`
  const now = Date.now()
  const windowMs = 60 * 1000

  let entry = RATE_LIMIT_CACHE.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    RATE_LIMIT_CACHE.set(key, entry)
  }

  // Filter timestamps within the sliding window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs)

  if (entry.timestamps.length >= maxRequestsPerMinute) {
    const oldestTimestamp = entry.timestamps[0]
    const resetTime = oldestTimestamp + windowMs
    return {
      isAllowed: false,
      remaining: 0,
      resetTime,
      source: 'local_memory',
    }
  }

  entry.timestamps.push(now)
  const remaining = maxRequestsPerMinute - entry.timestamps.length
  return {
    isAllowed: true,
    remaining,
    resetTime: now + windowMs,
    source: 'local_memory',
  }
}

/**
 * Distributed rate limiter adapter interface for multi-region serverless deployment
 */
export interface RateLimitAdapter {
  checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>
}

/**
 * Async rate limiter with distributed store support (e.g. Upstash Redis / Vercel KV)
 * Falls back seamlessly to local in-memory sliding window when no external store is configured.
 */
export async function checkDistributedRateLimit(
  companyId: string,
  endpoint: string,
  maxRequestsPerMinute = 120,
  adapter?: RateLimitAdapter
): Promise<RateLimitResult> {
  const key = `ratelimit:${companyId}:${endpoint}`
  const windowMs = 60 * 1000

  if (adapter) {
    try {
      return await adapter.checkLimit(key, maxRequestsPerMinute, windowMs)
    } catch {
      // Graceful degradation to local memory if external distributed store is unreachable
    }
  }

  const localRes = checkTenantRateLimit(companyId, endpoint, maxRequestsPerMinute)
  return {
    ...localRes,
    source: 'local_memory',
  }
}

