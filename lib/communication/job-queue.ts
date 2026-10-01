// ==============================================================================
// PrintERP SaaS - Asynchronous Communication Job Queue & Retry Worker
// Database-backed job queue with exponential backoff, rate limiting, and idempotency.
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
        next_attempt_at: nowIso,
        next_retry_at: nowIso,
        idempotency_key: job.idempotencyKey || null,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      throw new Error(`Failed to enqueue communication job: ${error?.message || 'DB error'}`)
    }

    // Kick off background execution without blocking caller
    queueMicrotask(() => {
      this.processJob(inserted.id).catch((err) => {
        console.error(`[JobQueue] Async execution error for job ${inserted.id}:`, err)
      })
    })

    return { jobId: inserted.id, alreadyQueued: false }
  }

  /**
   * Processes a single communication job with exponential backoff on failure
   */
  static async processJob(jobId: string): Promise<boolean> {
    const adminClient = createAdminClient()

    // 1. Acquire job (optimistic lock: update status to processing)
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
      // Job already picked up by another worker or not pending
      return false
    }

    const jobRecord = job as CommunicationJobRecord
    const payload = jobRecord.payload || {}
    let success = false
    let errorMessage: string | undefined

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
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)

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
          last_error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      return false
    }

    // Exponential delay: 30s, 60s, 120s, 240s, 480s, etc. (Max 2 hours)
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    return false
  }

  /**
   * Worker: Sweeps and processes all due pending jobs across tenants
   */
  static async processPendingBatch(limit = 20): Promise<{ processed: number; succeeded: number }> {
    const adminClient = createAdminClient()
    const now = new Date().toISOString()

    // 0. Auto-reclaim stale locked jobs from crashed or timed-out workers (10-minute lease)
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      await (adminClient as any)
        .from('communication_jobs')
        .update({
          status: 'retrying',
          next_retry_at: now,
          next_attempt_at: now,
          last_error: 'Worker lease expired (recovered from worker timeout or container restart)',
          updated_at: now,
        })
        .eq('status', 'processing')
        .lte('locked_at', tenMinutesAgo)
    } catch (reclaimErr) {
      console.warn('[JobQueue] Stale lock reclamation warning:', reclaimErr)
    }

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
}
