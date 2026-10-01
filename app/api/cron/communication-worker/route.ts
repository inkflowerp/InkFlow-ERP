import { NextResponse } from 'next/server.js'
import { CommunicationJobQueue } from '../../../../lib/communication/job-queue.ts'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/communication-worker
 * Sweeps and processes pending/retrying asynchronous communication jobs across tenants.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Enforce fail-closed Bearer token verification if secret is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    const { processed, succeeded } = await CommunicationJobQueue.processPendingBatch(25)

    return NextResponse.json({
      success: true,
      processed,
      succeeded,
      message: `Processed ${processed} pending communication jobs (${succeeded} succeeded).`,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[CommunicationWorker Cron] Error processing communication jobs:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to execute communication worker cron' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/communication-worker
 * Allows manual or webhook trigger for the communication worker.
 */
export async function POST(request: Request) {
  return GET(request)
}
