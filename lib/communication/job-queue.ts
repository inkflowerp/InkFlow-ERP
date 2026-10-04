// ==============================================================================
// PrintERP SaaS - Asynchronous Communication Job Queue & Retry Worker (V2)
// Database-backed job queue with atomic FOR UPDATE SKIP LOCKED claiming,
// exponential backoff, dead-letter status, per-tenant rate limits, and PII protection.
// ==============================================================================

import { createAdminClient } from '../supabase/admin.ts'
import { CommunicationRouter } from '../../services/communication-router.ts'
import { EmailGatewayService } from '../../services/email-gateway.service.ts'
import { GatewayService } from '../../services/gateway.service.ts'
import type { CommunicationJobRecord } from '../../types/communication.types.ts'

export interface EnqueueJobPayload {
  tenantId: string
  eventType: string
  channel: 'whatsapp' | 'sms' | 'email' | 'in_app'
  recipientPhone?: string | null
  recipientEmail?: string | null
  recipientUserId?: string | null
  recipientCustomerId?: string | null
  templateKey?: string | null
  payload: Record<string, any>
  idempotencyKey?: string | null
  maxAttempts?: number
  scheduledFor?: string | null
}

// In-memory per-tenant rate-limit tracker (sliding 1-minute window)
const TENANT_RATE_LIMITS = new Map<string, number[]>()
const MAX_MESSAGES_PER_MINUTE = 60

function checkTenantRateLimit(tenantId: string): boolean {
  const now = Date.now()
  const windowStart = now - 60000

  let timestamps = TENANT_RATE_LIMITS.get(tenantId) || []
  timestamps = timestamps.filter((t) => t > windowStart)

  if (timestamps.length >= MAX_MESSAGES_PER_MINUTE) {
    TENANT_RATE_LIMITS.set(tenantId, timestamps)
    return false // Rate limit exceeded
  }

  timestamps.push(now)
  TENANT_RATE_LIMITS.set(tenantId, timestamps)
  return true
}

export class CommunicationJobQueue {
  /**
   * Enqueues a communication job asynchronously with idempotency deduplication
   */
  static async enqueue(job: EnqueueJobPayload): Promise<{ jobId: string; alreadyQueued: boolean }> {
    const adminClient = createAdminClient()

    // 1. Check idempotency
    if (job.idempotencyKey) {
      const { data: existing } = await (adminClient as any)
        .from('communication_jobs')
        .select('id, status')
        .eq('tenant_id', job.tenantId)
        .eq('idempotency_key', job.idempotencyKey)
        .maybeSingle()

      if (existing) {
        return { jobId: existing.id, alreadyQueued: true }
      }
    }

    // 2. Insert new job
    const recipientTarget = job.recipientPhone || job.recipientEmail || job.recipientUserId || 'recipient'
    const dbChannel = job.channel === 'in_app' ? 'email' : job.channel
    const nowIso = new Date().toISOString()
    const nextAttemptAt = job.scheduledFor || nowIso

    const { data: inserted, error } = await (adminClient as any)
      .from('communication_jobs')
      .insert({
        tenant_id: job.tenantId,
        event_type: job.eventType,
        channel: dbChannel,
        recipient: recipientTarget,
        recipient_phone: job.recipientPhone || null,
        recipient_email: job.recipientEmail || null,
        recipient_user_id: job.recipientUserId || null,
        recipient_customer_id: job.recipientCustomerId || null,
        template_key: job.templateKey || null,
        payload: job.payload || {},
        status: 'queued',
        attempts: 0,
        max_attempts: job.maxAttempts || 4,
        next_attempt_at: nextAttemptAt,
        next_retry_at: nextAttemptAt,
        idempotency_key: job.idempotencyKey || null,
        is_dead_letter: false,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      throw new Error(`Failed to enqueue communication job: ${error?.message || 'DB error'}`)
    }

    // Only kick off immediate background execution if not scheduled for future (e.g. quiet hours)
    const isFutureScheduled = job.scheduledFor && new Date(job.scheduledFor).getTime() > Date.now()
    if (!isFutureScheduled) {
      queueMicrotask(() => {
        this.processJob(inserted.id).catch((err) => {
          // Redact PII in info/error logs
          console.error(`[JobQueue] Async execution error for job ${inserted.id}:`, err?.message || 'Unknown error')
        })
      })
    }

    return { jobId: inserted.id, alreadyQueued: false }
  }

  /**
   * Processes an already claimed communication job
   */
  static async executeClaimedJob(jobRecord: CommunicationJobRecord): Promise<boolean> {
    const adminClient = createAdminClient()
    const payload = jobRecord.payload || {}
    let success = false
    let errorMessage: string | undefined
    let providerResponse: any = {}

    // Check per-tenant rate limit
    if (!checkTenantRateLimit(jobRecord.tenant_id)) {
      const nextDelay = new Date(Date.now() + 20000).toISOString()
      await (adminClient as any)
        .from('communication_jobs')
        .update({
          status: 'queued',
          next_attempt_at: nextDelay,
          next_retry_at: nextDelay,
          last_error: 'Tenant rate limit exceeded (60 messages/min). Rescheduled.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobRecord.id)
      return false
    }

    try {
      if (jobRecord.channel === 'whatsapp') {
        if (!jobRecord.recipient_phone) {
          throw new Error('Missing recipient phone for WhatsApp dispatch.')
        }

        const waRes = await CommunicationRouter.sendTenantWhatsApp({
          companyId: jobRecord.tenant_id,
          recipientPhone: jobRecord.recipient_phone,
          messageText: payload.message || payload.text || 'PrintERP Notification',
          documentUrl: payload.documentUrl,
          documentFilename: payload.documentFilename,
          customerId: jobRecord.recipient_customer_id || undefined,
          idempotencyKey: jobRecord.idempotency_key || undefined,
        })

        success = waRes.success
        providerResponse = { routedProvider: waRes.routedProvider, messageId: waRes.messageId }
        if (!waRes.success) {
          errorMessage = waRes.error || 'WhatsApp gateway dispatch failed.'
        }
      } else if (jobRecord.channel === 'sms') {
        if (!jobRecord.recipient_phone) {
          throw new Error('Missing recipient phone for SMS dispatch.')
        }

        const smsRes = await GatewayService.sendTestMessage({
          category: 'sms',
          recipient: jobRecord.recipient_phone,
          recipientName: payload.recipientName || 'Customer',
          message: payload.message || payload.text || 'PrintERP Alert',
        })

        success = smsRes.success
        providerResponse = { provider: 'sms', messageId: (smsRes as any).messageId || (smsRes as any).id || 'sms-sent' }
        if (!smsRes.success) {
          errorMessage = smsRes.error || 'SMS dispatch failed.'
        }
      } else if (jobRecord.channel === 'email') {
        if (!jobRecord.recipient_email) {
          throw new Error('Missing recipient email for Email dispatch.')
        }

        const emailRes = await EmailGatewayService.sendEmail({
          tenantId: jobRecord.tenant_id,
          eventType: jobRecord.event_type,
          recipient: jobRecord.recipient_email,
          customSubject: payload.subject,
          customTextBody: payload.body || payload.message,
          attachments: payload.attachmentUrl
            ? [{ filename: payload.attachmentFilename || 'document.pdf', path: payload.attachmentUrl }]
            : undefined,
        })

        success = emailRes.success
        providerResponse = { provider: 'email', messageId: emailRes.messageId }
        if (!emailRes.success) {
          errorMessage = emailRes.error || 'Email dispatch failed.'
        }
      } else if (jobRecord.channel === 'in_app') {
        await (adminClient as any).from('in_app_notifications').insert({
          company_id: jobRecord.tenant_id,
          user_id: jobRecord.recipient_user_id || null,
          type: payload.notificationType || 'customer_approval_needed',
          title: payload.title || 'PrintERP Alert',
          title_bn: payload.title_bn || payload.title,
          message: payload.message || '',
          message_bn: payload.message_bn || payload.message,
          action_url: payload.actionUrl || null,
          is_read: false,
        })
        success = true
        providerResponse = { provider: 'in_app' }
      }
    } catch (err: any) {
      success = false
      errorMessage = err?.message || 'Unexpected exception during job execution.'
    }

    const nextAttempts = (jobRecord.attempts || 0) + 1

    if (success) {
      await (adminClient as any)
        .from('communication_jobs')
        .update({
          status: 'sent',
          attempts: nextAttempts,
          completed_at: new Date().toISOString(),
          last_error: null,
          is_dead_letter: false,
          provider_response: providerResponse,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobRecord.id)

      // Ensure log record is saved in communication_logs
      try {
        await (adminClient as any).from('communication_logs').insert({
          company_id: jobRecord.tenant_id,
          channel: jobRecord.channel,
          recipient_name: payload.recipientName || 'Recipient',
          recipient_destination: jobRecord.recipient_phone || jobRecord.recipient_email || 'in_app',
          provider_used: jobRecord.channel,
          message_content: payload.message || payload.body || 'Dispatched notification',
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
      } catch {}

      return true
    }

    // Handle Failure and Exponential Backoff
    const maxAttempts = jobRecord.max_attempts || 4
    if (nextAttempts >= maxAttempts) {
      // Dead letter queue transition
      await (adminClient as any)
        .from('communication_jobs')
        .update({
          status: 'failed',
          attempts: nextAttempts,
          is_dead_letter: true,
          last_error: errorMessage,
          provider_response: { error: errorMessage },
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobRecord.id)

      // Log failure in communication_logs
      try {
        await (adminClient as any).from('communication_logs').insert({
          company_id: jobRecord.tenant_id,
          channel: jobRecord.channel,
          recipient_name: payload.recipientName || 'Recipient',
          recipient_destination: jobRecord.recipient_phone || jobRecord.recipient_email || 'in_app',
          provider_used: jobRecord.channel,
          message_content: payload.message || payload.body || 'Failed notification dispatch',
          status: 'failed',
          error_message: errorMessage,
          failed_at: new Date().toISOString(),
        })
      } catch {}

      return false
    }

    // Exponential delay: 30s, 60s, 120s, 240s (Max 2 hours)
    const delaySeconds = Math.min(30 * Math.pow(2, nextAttempts - 1), 7200)
    const nextRetryDate = new Date(Date.now() + delaySeconds * 1000).toISOString()

    await (adminClient as any)
      .from('communication_jobs')
      .update({
        status: 'retrying',
        attempts: nextAttempts,
        next_attempt_at: nextRetryDate,
        next_retry_at: nextRetryDate,
        last_error: errorMessage,
        provider_response: { error: errorMessage },
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobRecord.id)

    return false
  }

  /**
   * Processes a single communication job (with optimistic lock if not already claimed)
   */
  static async processJob(jobId: string): Promise<boolean> {
    const adminClient = createAdminClient()

    // Acquire job (optimistic lock: update status to processing)
    const { data: job, error: fetchErr } = await (adminClient as any)
      .from('communication_jobs')
      .update({
        status: 'processing',
        locked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .in('status', ['queued', 'retrying', 'pending'])
      .select('*')
      .maybeSingle()

    if (fetchErr || !job) {
      return false
    }

    return this.executeClaimedJob(job as CommunicationJobRecord)
  }

  /**
   * Worker: Sweeps and processes all due pending jobs across tenants using
   * atomic Postgres FOR UPDATE SKIP LOCKED function `fn_claim_communication_jobs`.
   */
  static async processPendingBatch(limit = 25): Promise<{ processed: number; succeeded: number }> {
    const adminClient = createAdminClient()
    const now = new Date().toISOString()

    // 0. Auto-reclaim stale locked jobs (10-minute lease)
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      await (adminClient as any)
        .from('communication_jobs')
        .update({
          status: 'retrying',
          next_retry_at: now,
          next_attempt_at: now,
          last_error: 'Worker lease expired (recovered from timeout)',
          updated_at: now,
        })
        .eq('status', 'processing')
        .lte('locked_at', tenMinutesAgo)
    } catch (reclaimErr) {
      console.warn('[JobQueue] Stale lock reclamation warning:', reclaimErr)
    }

    // 1. Claim batch atomically using FOR UPDATE SKIP LOCKED
    let claimedJobs: CommunicationJobRecord[] = []
    try {
      const { data: claimed, error: claimErr } = await (adminClient as any).rpc(
        'fn_claim_communication_jobs',
        { p_limit: limit, p_worker_id: 'cron-worker' }
      )

      if (!claimErr && Array.isArray(claimed)) {
        claimedJobs = claimed
      }
    } catch {
      // Fall back to standard query if RPC unavailable
    }

    // 2. Fallback query if RPC returned empty or failed
    if (claimedJobs.length === 0) {
      const { data: pendingJobs } = await (adminClient as any)
        .from('communication_jobs')
        .select('id')
        .in('status', ['queued', 'retrying', 'pending'])
        .or(`next_attempt_at.is.null,next_attempt_at.lte.${now},next_retry_at.is.null,next_retry_at.lte.${now}`)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (!pendingJobs || pendingJobs.length === 0) {
        return { processed: 0, succeeded: 0 }
      }

      let succeeded = 0
      for (const job of pendingJobs) {
        const ok = await this.processJob(job.id)
        if (ok) succeeded++
      }

      return { processed: pendingJobs.length, succeeded }
    }

    // 3. Process claimed jobs
    let succeeded = 0
    for (const job of claimedJobs) {
      const ok = await this.executeClaimedJob(job)
      if (ok) succeeded++
    }

    return { processed: claimedJobs.length, succeeded }
  }
}
