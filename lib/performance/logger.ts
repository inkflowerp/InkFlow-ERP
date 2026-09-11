// ==============================================================================
// PrintERP / InkFlow SaaS - Performance & Latency Telemetry Monitor
// Tracks server-side execution latency, query durations, and slow-path alerts.
// Automatically scrubs sensitive credentials and PII from telemetry logs.
// ==============================================================================

export type OperationCategory = 'db' | 'api' | 'external_service' | 'general'

export interface PerformanceTrace {
  name: string
  category: OperationCategory
  durationMs: number
  timestamp: string
  metadata?: Record<string, unknown>
  isSlow: boolean
}

export interface MeasureOptions {
  category?: OperationCategory
  thresholdMs?: number
  metadata?: Record<string, unknown>
}

const DEFAULT_THRESHOLDS: Record<OperationCategory, number> = {
  db: 100, // DB operations > 100ms
  api: 500, // API routes and server actions > 500ms
  external_service: 1000, // Gateway / Email / Webhooks > 1000ms
  general: 200,
}

const MAX_IN_MEMORY_LOGS = 500
const traceLogs: PerformanceTrace[] = []

// Sensitive keys to scrub from telemetry metadata
const SENSITIVE_KEY_REGEX = /password|secret|token|api_key|authorization|bearer|pin|cvv|credit_card|auth_token/i

/**
 * Sanitizes metadata to prevent accidental PII / credential leakage in telemetry
 */
export function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]'
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

/**
 * Measures execution time of an asynchronous operation and logs telemetry
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  optionsOrMetadata?: MeasureOptions | Record<string, unknown>
): Promise<T> {
  const options: MeasureOptions =
    optionsOrMetadata && ('category' in optionsOrMetadata || 'thresholdMs' in optionsOrMetadata)
      ? (optionsOrMetadata as MeasureOptions)
      : { metadata: optionsOrMetadata as Record<string, unknown> }

  const category: OperationCategory = options.category || (name.includes('Repository') ? 'db' : 'general')
  const thresholdMs = options.thresholdMs || DEFAULT_THRESHOLDS[category]
  const cleanMetadata = sanitizeMetadata(options.metadata)

  const start = performance.now()
  try {
    const result = await operation()
    const durationMs = Math.round((performance.now() - start) * 100) / 100
    const isSlow = durationMs >= thresholdMs

    recordTrace({
      name,
      category,
      durationMs,
      timestamp: new Date().toISOString(),
      metadata: cleanMetadata,
      isSlow,
    })

    if (isSlow && process.env.NODE_ENV === 'development') {
      console.warn(`[PERFORMANCE WARNING] [${category.toUpperCase()}] ${name} took ${durationMs}ms (threshold: ${thresholdMs}ms)`)
    }

    return result
  } catch (error) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100
    recordTrace({
      name: `${name} (FAILED)`,
      category,
      durationMs,
      timestamp: new Date().toISOString(),
      metadata: { ...cleanMetadata, error: error instanceof Error ? error.message : String(error) },
      isSlow: true,
    })
    throw error
  }
}

/**
 * Synchronous execution timer
 */
export function measureSync<T>(
  name: string,
  operation: () => T,
  optionsOrMetadata?: MeasureOptions | Record<string, unknown>
): T {
  const options: MeasureOptions =
    optionsOrMetadata && ('category' in optionsOrMetadata || 'thresholdMs' in optionsOrMetadata)
      ? (optionsOrMetadata as MeasureOptions)
      : { metadata: optionsOrMetadata as Record<string, unknown> }

  const category: OperationCategory = options.category || (name.includes('Repository') ? 'db' : 'general')
  const thresholdMs = options.thresholdMs || DEFAULT_THRESHOLDS[category]
  const cleanMetadata = sanitizeMetadata(options.metadata)

  const start = performance.now()
  try {
    const result = operation()
    const durationMs = Math.round((performance.now() - start) * 100) / 100
    const isSlow = durationMs >= thresholdMs

    recordTrace({
      name,
      category,
      durationMs,
      timestamp: new Date().toISOString(),
      metadata: cleanMetadata,
      isSlow,
    })

    return result
  } catch (error) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100
    recordTrace({
      name: `${name} (FAILED)`,
      category,
      durationMs,
      timestamp: new Date().toISOString(),
      metadata: { ...cleanMetadata, error: error instanceof Error ? error.message : String(error) },
      isSlow: true,
    })
    throw error
  }
}

function recordTrace(trace: PerformanceTrace) {
  traceLogs.push(trace)
  if (traceLogs.length > MAX_IN_MEMORY_LOGS) {
    traceLogs.shift()
  }
}

/**
 * Retrieves recent performance traces
 */
export function getRecentTraces(limit = 50): PerformanceTrace[] {
  return [...traceLogs].slice(-limit)
}

/**
 * Retrieves traces for slow operations
 */
export function getSlowTraces(limit = 50): PerformanceTrace[] {
  return traceLogs.filter((t) => t.isSlow).slice(-limit)
}

/**
 * Clears in-memory trace buffer (for testing isolation)
 */
export function clearTraces(): void {
  traceLogs.length = 0
}
