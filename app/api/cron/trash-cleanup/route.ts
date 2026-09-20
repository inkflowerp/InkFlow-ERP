import { NextResponse } from 'next/server'
import { TrashService } from '@/services/trash.service'
import { TRASH_RETENTION_DAYS } from '@/types/trash.types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/trash-cleanup
 * Automatically purges all trash items older than 30 days permanently.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is configured in environment, enforce Bearer token verification
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    const { purgedCount, purgedIds } = await TrashService.purgeExpiredTrash(undefined, TRASH_RETENTION_DAYS)

    return NextResponse.json({
      success: true,
      purgedCount,
      purgedIds,
      retentionDays: TRASH_RETENTION_DAYS,
      message: `Permanently auto-deleted ${purgedCount} expired trash items (retention: ${TRASH_RETENTION_DAYS} days).`,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to execute trash cleanup cron' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/trash-cleanup
 * Allows manual or webhook trigger for trash cleanup.
 */
export async function POST(request: Request) {
  return GET(request)
}
