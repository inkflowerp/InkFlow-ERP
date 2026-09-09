// ==============================================================================
// PrintERP SaaS - Email Gateway & Queue Orchestration Service
// Manages gateway resolution, credential decryption, template merging, queue processing, and audit logging.
// ==============================================================================

import { createAdminClient } from '../lib/supabase/admin.ts'
import type {
  EmailGatewayRecord,
  EmailTemplateRecord,
  EmailLogRecord,
  EmailQueueJob,
  SendEmailOptions,
  SendEmailResult,
  ConnectionTestResult,
  EmailGatewayFormData,
} from '../types/communication.types.ts'
import { decryptSecret, encryptSecret, sanitizeGatewayRecord } from '../lib/security/encryption.ts'
import { createEmailProvider } from '../lib/email/provider.factory.ts'
import type { DecryptedGatewayConfig } from '../lib/email/types.ts'
import {
  interpolateVariables,
  wrapHtmlEmail,
  DEFAULT_EMAIL_TEMPLATES,
} from './email-template.service.ts'

export class EmailDataStore {
  private static memoryStore: Map<string, any> = new Map()

  static get<T>(key: string): T | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const item = window.localStorage.getItem(key)
        if (item) return JSON.parse(item)
      } catch {}
    }
    const val = this.memoryStore.get(key)
    return val !== undefined ? JSON.parse(JSON.stringify(val)) : null
  }

  static set<T>(key: string, value: T): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch {}
    }
    this.memoryStore.set(key, JSON.parse(JSON.stringify(value)))
  }

  static clear(): void {
    this.memoryStore.clear()
  }
}

// Global Fallback Default Platform Gateway (when DB is empty or during offline dev)
export const DEFAULT_PLATFORM_GATEWAY: EmailGatewayRecord = {
  id: 'gw-platform-default',
  tenant_id: null,
  provider: 'mock',
  type: 'transactional',
  smtp_host: 'smtp.printerp.com',
  smtp_port: 587,
  smtp_username: 'notifications@printerp.com',
  encrypted_credentials: null,
  encryption_type: 'tls',
  sender_name: 'PrintERP Notifications',
  sender_email: 'notifications@printerp.com',
  reply_to_email: 'support@printerp.com',
  status: 'active',
  is_default: true,
  extra_settings: {},
  last_tested_at: new Date().toISOString(),
  last_test_status: 'healthy',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export class EmailGatewayService {
  /**
   * Resolves the authoritative active gateway following priority logic:
   * 1. Active Tenant Custom Gateway
   * 2. Active Platform Default Gateway
   * 3. In-memory / data store default
   */
  static async resolveGateway(tenantId?: string | null): Promise<EmailGatewayRecord | null> {
    try {
      const adminClient = createAdminClient()

      // 1. Check if tenant has an active custom gateway
      if (tenantId) {
        const { data: tenantGw, error: tenantErr } = await (adminClient as any)
          .from('email_gateways')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .maybeSingle()

        if (!tenantErr && tenantGw) {
          return tenantGw as EmailGatewayRecord
        }

        // Check local data store for tenant gateway
        const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printerp_email_gateways') || []
        const tenantLocal = localGateways.find((g) => g.tenant_id === tenantId && g.status === 'active')
        if (tenantLocal) {
          return tenantLocal
        }
      }

      // 2. Fall back to Platform Default Gateway (tenant_id IS NULL)
      const { data: platformGw, error: platErr } = await (adminClient as any)
        .from('email_gateways')
        .select('*')
        .is('tenant_id', null)
        .eq('is_default', true)
        .eq('status', 'active')
        .maybeSingle()

      if (!platErr && platformGw) {
        return platformGw as EmailGatewayRecord
      }

      // Check local data store for platform gateway
      const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printerp_email_gateways') || []
      const platformLocal = localGateways.find((g) => !g.tenant_id && g.is_default && g.status === 'active')
      if (platformLocal) {
        return platformLocal
      }

      // 3. Fallback to constant default
      return DEFAULT_PLATFORM_GATEWAY
    } catch (err) {
      console.warn('[EmailGatewayService] Database gateway resolution fallback:', err)
      return DEFAULT_PLATFORM_GATEWAY
    }
  }

  /**
   * Resolves the matching email template (tenant override -> platform default -> built-in)
   */
  static async resolveTemplate(
    eventType: string,
    tenantId?: string | null
  ): Promise<EmailTemplateRecord | null> {
    try {
      const adminClient = createAdminClient()

      // 1. Check tenant custom template
      if (tenantId) {
        const { data: tenantTpl } = await (adminClient as any)
          .from('email_templates')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('event_type', eventType)
          .eq('status', 'active')
          .maybeSingle()

        if (tenantTpl) return tenantTpl as EmailTemplateRecord
      }

      // 2. Check platform custom template
      const { data: platTpl } = await (adminClient as any)
        .from('email_templates')
        .select('*')
        .is('tenant_id', null)
        .eq('event_type', eventType)
        .eq('status', 'active')
        .maybeSingle()

      if (platTpl) return platTpl as EmailTemplateRecord

      // 3. Check local data store templates
      const localTemplates =
        EmailDataStore.get<EmailTemplateRecord[]>('printerp_email_templates') || []
      const foundLocal =
        localTemplates.find((t) => t.tenant_id === tenantId && t.event_type === eventType) ||
        localTemplates.find((t) => !t.tenant_id && t.event_type === eventType)
      if (foundLocal) return foundLocal

      // 4. Fallback to built-in template
      const builtIn = DEFAULT_EMAIL_TEMPLATES.find((t) => t.event_type === eventType)
      return builtIn || null
    } catch {
      return DEFAULT_EMAIL_TEMPLATES.find((t) => t.event_type === eventType) || null
    }
  }

  /**
   * Prepares decrypted configuration object for provider instantiation
   */
  static prepareDecryptedConfig(gateway: EmailGatewayRecord): DecryptedGatewayConfig {
    let decryptedSecret = ''
    if (gateway.encrypted_credentials) {
      try {
        decryptedSecret = decryptSecret(gateway.encrypted_credentials)
      } catch {
        decryptedSecret = gateway.encrypted_credentials
      }
    }

    return {
      id: gateway.id,
      provider: gateway.provider,
      smtp_host: gateway.smtp_host,
      smtp_port: gateway.smtp_port,
      smtp_username: gateway.smtp_username,
      decrypted_secret: decryptedSecret,
      encryption_type: gateway.encryption_type,
      sender_name: gateway.sender_name,
      sender_email: gateway.sender_email,
      reply_to_email: gateway.reply_to_email,
      extra_settings: gateway.extra_settings,
    }
  }

  /**
   * Tests gateway connection and records result
   */
  static async testConnection(gateway: EmailGatewayRecord): Promise<ConnectionTestResult> {
    const startTime = Date.now()
    try {
      const decryptedConfig = this.prepareDecryptedConfig(gateway)
      const provider = createEmailProvider(decryptedConfig)
      const result = await provider.verifyConnection()

      // Update test status in database if gateway has an ID
      if (gateway.id && !gateway.id.startsWith('gw-platform-default')) {
        try {
          const adminClient = createAdminClient()
          await (adminClient as any)
            .from('email_gateways')
            .update({
              last_tested_at: new Date().toISOString(),
              last_test_status: result.success ? 'healthy' : 'error',
              last_test_error: result.success ? null : result.message || result.error,
              updated_at: new Date().toISOString(),
            })
            .eq('id', gateway.id)
        } catch {
          // ignore DB error in test connection
        }
      }

      return {
        success: result.success,
        provider: result.provider,
        latencyMs: result.latencyMs || Date.now() - startTime,
        message: result.message,
        details: result.details,
      }
    } catch (err: any) {
      return {
        success: false,
        provider: gateway.provider,
        latencyMs: Date.now() - startTime,
        message: err?.message || 'Connection test failed unexpectedly',
      }
    }
  }

  /**
   * Main dispatch method: resolves gateway, merges template, sends email, writes audit log.
   */
  static async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const {
      tenantId,
      eventType,
      recipient,
      variables = {},
      customSubject,
      customHtmlBody,
      customTextBody,
      replyTo,
      attachments,
      metadata,
      sentBy,
      queueNow = false,
      language = 'en',
    } = options

    try {
      // 1. Resolve active gateway
      const gateway = await this.resolveGateway(tenantId)
      if (!gateway || gateway.status !== 'active') {
        const errorMsg = 'No active email gateway available for delivery'
        await this.recordLog({
          tenant_id: tenantId || null,
          gateway_id: gateway?.id || null,
          event_type: eventType,
          recipient,
          subject: customSubject || 'Notification',
          status: 'failed',
          error_message: errorMsg,
          sent_by: sentBy || null,
          metadata,
        })

        return {
          success: false,
          status: 'failed',
          error: errorMsg,
        }
      }

      // 2. Resolve template & interpolate variables
      let finalSubject = customSubject || ''
      let finalHtml = customHtmlBody || ''
      let finalText = customTextBody || ''

      if (!customHtmlBody || !customSubject) {
        const template = await this.resolveTemplate(eventType, tenantId)
        if (template) {
          const subjectTpl =
            language === 'bn' && template.subject_template_bn
              ? template.subject_template_bn
              : template.subject_template
          const bodyTpl =
            language === 'bn' && template.body_template_bn
              ? template.body_template_bn
              : template.body_template

          finalSubject = customSubject || interpolateVariables(subjectTpl, variables)
          const interpolatedBody = interpolateVariables(bodyTpl, variables)
          finalHtml = wrapHtmlEmail(interpolatedBody, {
            companyName: variables.company_name || gateway.sender_name,
          })
          finalText = interpolatedBody.replace(/<[^>]*>?/gm, '')
        } else {
          finalSubject = customSubject || `Notification: ${eventType}`
          finalHtml = wrapHtmlEmail(`<p>${JSON.stringify(variables)}</p>`, {
            companyName: gateway.sender_name,
          })
        }
      }

      // 3. If asynchronous queue is requested
      if (queueNow) {
        const queueJobId = await this.enqueueJob({
          tenant_id: tenantId || null,
          event_type: eventType,
          recipient,
          subject: finalSubject,
          html_body: finalHtml,
          text_body: finalText,
          variables,
          attachments,
          metadata,
        })

        await this.recordLog({
          tenant_id: tenantId || null,
          gateway_id: gateway.id,
          event_type: eventType,
          recipient,
          subject: finalSubject,
          status: 'queued',
          sent_by: sentBy || null,
          metadata,
        })

        return {
          success: true,
          status: 'queued',
          messageId: queueJobId,
          providerUsed: gateway.provider,
          gatewayId: gateway.id,
        }
      }

      // 4. Synchronous Execution: Prepare provider adapter
      const decryptedConfig = this.prepareDecryptedConfig(gateway)
      const provider = createEmailProvider(decryptedConfig)

      const fromAddress = {
        name: gateway.sender_name,
        address: gateway.sender_email,
      }

      const sendResult = await provider.sendEmail({
        from: fromAddress,
        to: recipient,
        replyTo: replyTo || gateway.reply_to_email || undefined,
        subject: finalSubject,
        html: finalHtml,
        text: finalText,
        attachments,
        metadata,
      })

      // 5. Record Transmission Log
      await this.recordLog({
        tenant_id: tenantId || null,
        gateway_id: gateway.id,
        event_type: eventType,
        recipient,
        subject: finalSubject,
        status: sendResult.success ? 'sent' : 'failed',
        provider_message_id: sendResult.messageId || null,
        error_message: sendResult.error || null,
        sent_by: sentBy || null,
        sent_at: sendResult.success ? new Date().toISOString() : null,
        metadata,
      })

      return {
        success: sendResult.success,
        status: sendResult.success ? 'sent' : 'failed',
        messageId: sendResult.messageId,
        providerUsed: gateway.provider,
        gatewayId: gateway.id,
        error: sendResult.error,
      }
    } catch (err: any) {
      console.error('[EmailGatewayService] sendEmail error:', err)
      return {
        success: false,
        status: 'failed',
        error: err?.message || 'Unexpected failure in email gateway service',
      }
    }
  }

  /**
   * Enqueues an email job into the database queue
   */
  static async enqueueJob(
    jobData: Omit<EmailQueueJob, 'id' | 'created_at' | 'updated_at' | 'status' | 'attempts' | 'max_attempts' | 'next_run_at'>
  ): Promise<string> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    try {
      const adminClient = createAdminClient()
      const { data, error } = await (adminClient as any)
        .from('email_queue')
        .insert({
          id: jobId,
          tenant_id: jobData.tenant_id,
          event_type: jobData.event_type,
          recipient: jobData.recipient,
          subject: jobData.subject,
          html_body: jobData.html_body,
          text_body: jobData.text_body,
          variables: jobData.variables || {},
          attachments: jobData.attachments || [],
          metadata: jobData.metadata || {},
          status: 'pending',
          attempts: 0,
          max_attempts: 3,
          next_run_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle()

      if (!error && data?.id) return data.id
    } catch {
      // ignore
    }

    // Local DataStore fallback
    const localQueue = EmailDataStore.get<EmailQueueJob[]>('printerp_email_queue') || []
    localQueue.push({
      id: jobId,
      tenant_id: jobData.tenant_id,
      event_type: jobData.event_type,
      recipient: jobData.recipient,
      subject: jobData.subject,
      html_body: jobData.html_body,
      text_body: jobData.text_body,
      variables: jobData.variables,
      attachments: jobData.attachments,
      metadata: jobData.metadata,
      status: 'pending',
      attempts: 0,
      max_attempts: 3,
      next_run_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    EmailDataStore.set('printerp_email_queue', localQueue)

    return jobId
  }

  /**
   * Background Queue Worker: Processes pending email jobs with retry backoff
   */
  static async processQueue(batchSize: number = 10): Promise<{ processed: number; succeeded: number; failed: number }> {
    let processed = 0
    let succeeded = 0
    let failed = 0

    try {
      const adminClient = createAdminClient()
      const nowIso = new Date().toISOString()

      // Fetch pending jobs
      const { data: jobs, error } = await (adminClient as any)
        .from('email_queue')
        .select('*')
        .in('status', ['pending', 'failed'])
        .lte('next_run_at', nowIso)
        .lt('attempts', 3)
        .order('created_at', { ascending: true })
        .limit(batchSize)

      const jobsToProcess: EmailQueueJob[] = !error && jobs ? jobs : []

      // If DB has no jobs, check local store
      if (jobsToProcess.length === 0) {
        const localQueue = EmailDataStore.get<EmailQueueJob[]>('printerp_email_queue') || []
        const localPending = localQueue.filter(
          (j) => (j.status === 'pending' || j.status === 'failed') && j.attempts < 3
        )
        jobsToProcess.push(...localPending.slice(0, batchSize))
      }

      for (const job of jobsToProcess) {
        processed++
        const attempt = job.attempts + 1

        try {
          // Send email directly
          const result = await this.sendEmail({
            tenantId: job.tenant_id,
            eventType: job.event_type,
            recipient: job.recipient,
            customSubject: job.subject,
            customHtmlBody: job.html_body,
            customTextBody: job.text_body || undefined,
            variables: job.variables,
            attachments: job.attachments,
            metadata: job.metadata,
            queueNow: false,
          })

          const queueLocal = EmailDataStore.get<EmailQueueJob[]>('printerp_email_queue') || []
          const localItem = queueLocal.find((q) => q.id === job.id)

          if (result.success) {
            succeeded++
            try {
              await (adminClient as any)
                .from('email_queue')
                .update({
                  status: 'completed',
                  attempts: attempt,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', job.id)
            } catch {}

            if (localItem) {
              localItem.status = 'completed'
              localItem.attempts = attempt
              localItem.updated_at = new Date().toISOString()
              EmailDataStore.set('printerp_email_queue', queueLocal)
            }
          } else {
            failed++
            const nextMinutes = attempt * 5 // 5m, 10m, 15m exponential backoff
            const nextRun = new Date(Date.now() + nextMinutes * 60 * 1000).toISOString()
            const newStatus = attempt >= job.max_attempts ? 'failed' : 'pending'

            try {
              await (adminClient as any)
                .from('email_queue')
                .update({
                  status: newStatus,
                  attempts: attempt,
                  last_error: result.error,
                  next_run_at: nextRun,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', job.id)
            } catch {}

            if (localItem) {
              localItem.status = newStatus
              localItem.attempts = attempt
              localItem.last_error = result.error
              localItem.next_run_at = nextRun
              localItem.updated_at = new Date().toISOString()
              EmailDataStore.set('printerp_email_queue', queueLocal)
            }
          }
        } catch (jobErr: any) {
          failed++
          console.error(`[EmailQueue] Error processing job ${job.id}:`, jobErr)
        }
      }
    } catch (queueErr) {
      console.error('[EmailGatewayService] processQueue error:', queueErr)
    }

    return { processed, succeeded, failed }
  }

  /**
   * Non-destructive write to email_logs and communication_logs
   */
  static async recordLog(
    logData: Omit<EmailLogRecord, 'id' | 'created_at' | 'retry_count' | 'max_retries'> & {
      retry_count?: number
      max_retries?: number
    }
  ): Promise<void> {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const record: EmailLogRecord = {
      id: logId,
      tenant_id: logData.tenant_id,
      gateway_id: logData.gateway_id,
      event_type: logData.event_type,
      recipient: logData.recipient,
      subject: logData.subject,
      status: logData.status,
      provider_message_id: logData.provider_message_id || null,
      error_message: logData.error_message || null,
      retry_count: logData.retry_count || 0,
      max_retries: logData.max_retries || 3,
      sent_by: logData.sent_by || null,
      sent_at: logData.sent_at || (logData.status === 'sent' ? new Date().toISOString() : null),
      metadata: logData.metadata || {},
      created_at: new Date().toISOString(),
    }

    try {
      const adminClient = createAdminClient()
      await (adminClient as any).from('email_logs').insert(record)
    } catch {
      // Local fallback
    }

    // Always keep in local data store for instant offline UI reactivity
    const currentLogs = EmailDataStore.get<EmailLogRecord[]>('printerp_email_logs') || []
    currentLogs.unshift(record)
    EmailDataStore.set('printerp_email_logs', currentLogs.slice(0, 100))
  }
}
