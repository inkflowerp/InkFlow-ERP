import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/observability/structured-logger'

export const dynamic = 'force-dynamic'

interface HealthDiagnostic {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  app: string
  version: string
  region: string
  currency: string
  uptime_seconds: number
  memory_mb: number
  checks: {
    database: {
      status: 'ok' | 'degraded' | 'failed'
      latency_ms: number
      error?: string
    }
    queue: {
      status: 'ok' | 'lagging' | 'failed'
      pending_jobs: number
      failed_jobs: number
      queue_lag_seconds: number
    }
  }
}

export async function GET() {
  const startTime = Date.now()
  let dbStatus: 'ok' | 'degraded' | 'failed' = 'ok'
  let dbLatencyMs = 0
  let dbError: string | undefined

  let queueStatus: 'ok' | 'lagging' | 'failed' = 'ok'
  let pendingJobsCount = 0
  let failedJobsCount = 0
  let queueLagSeconds = 0

  // 1. Probe Database Connectivity & Latency
  const dbProbeStart = Date.now()
  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })

    dbLatencyMs = Date.now() - dbProbeStart

    if (error) {
      dbStatus = 'degraded'
      dbError = error.message
    } else if (dbLatencyMs > 500) {
      dbStatus = 'degraded'
    }
  } catch (err: any) {
    dbLatencyMs = Date.now() - dbProbeStart
    dbStatus = 'failed'
    dbError = err?.message || 'Database connection probe failed'
  }

  // 2. Probe Communication / Worker Queue Lag
  try {
    const supabase = await createClient()

    // Count queued jobs
    const { data: pendingData, error: pendingErr } = await (supabase as any)
      .from('communication_jobs')
      .select('created_at')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(10)

    if (!pendingErr && pendingData) {
      pendingJobsCount = pendingData.length
      if (pendingData.length > 0 && pendingData[0]?.created_at) {
        const oldestJobTime = new Date(pendingData[0].created_at).getTime()
        queueLagSeconds = Math.max(0, Math.round((Date.now() - oldestJobTime) / 1000))
        if (queueLagSeconds > 300) {
          queueStatus = 'lagging'
        }
      }
    }

    // Count failed jobs
    const { count: failedCount } = await (supabase as any)
      .from('communication_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')

    if (failedCount !== null && failedCount !== undefined) {
      failedJobsCount = failedCount
    }
  } catch {
    // Queue check optional fallback in test/offline environments
  }

  // Determine Overall Status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (dbStatus === 'failed') {
    overallStatus = 'unhealthy'
  } else if (dbStatus === 'degraded' || queueStatus === 'lagging') {
    overallStatus = 'degraded'
  }

  const memoryUsage = process.memoryUsage()
  const memoryMb = Math.round(memoryUsage.rss / 1024 / 1024)

  const payload: HealthDiagnostic = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    app: 'InkFlow ERP SaaS',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    region: 'BD',
    currency: 'BDT',
    uptime_seconds: Math.round(process.uptime()),
    memory_mb: memoryMb,
    checks: {
      database: {
        status: dbStatus,
        latency_ms: dbLatencyMs,
        error: dbError,
      },
      queue: {
        status: queueStatus,
        pending_jobs: pendingJobsCount,
        failed_jobs: failedJobsCount,
        queue_lag_seconds: queueLagSeconds,
      },
    },
  }

  if (overallStatus === 'unhealthy') {
    logger.error('Health Check Probes Failed', { action: 'health_check', durationMs: Date.now() - startTime }, undefined, {
      payload,
    })
    return NextResponse.json(payload, { status: 503 })
  }

  return NextResponse.json(payload, { status: 200 })
}
