// ==============================================================================
// PrintERP SaaS - Multi-Tenant Communication Router
// Intelligently routes outbound communication through tenant-isolated OpenWA sessions
// with automated SMS fallback, daily limit validation, and queue integration.
// ==============================================================================

import { createAdminClient } from '../lib/supabase/admin.ts'
import { OpenWAAdapter } from '../lib/whatsapp/adapters/openwa.adapter.ts'
import { normalizeBdPhoneNumber } from '../lib/gateway/phone-utils.ts'
import type {
  WhatsAppSendResult,
  WhatsAppSendTextPayload,
  WhatsAppSendDocumentPayload,
} from '../lib/whatsapp/types.ts'
import type { TenantWhatsAppConnectionRecord } from '../types/communication.types.ts'

export interface WhatsAppRouteResult extends WhatsAppSendResult {
  routedProvider: 'openwa' | 'platform_fallback' | 'none'
  sessionId?: string
  fallbackToSms?: boolean
}

export class CommunicationRouter {
  private static openwaAdapter = new OpenWAAdapter()

  /**
   * Resolves the active OpenWA session configuration for a tenant
   */
  static async resolveTenantSession(companyId: string): Promise<{
    isConnected: boolean
    connectionId?: string
    sessionId?: string
    phoneNumber?: string | null
    dailySendLimit: number
    sendDelaySeconds: number
  }> {
    const adminClient = createAdminClient()

    const { data: conn } = await (adminClient as any)
      .from('tenant_whatsapp_connections')
      .select('*')
      .eq('tenant_id', companyId)
      .maybeSingle()

    if (!conn) {
      return {
        isConnected: false,
        dailySendLimit: 500,
        sendDelaySeconds: 3,
      }
    }

    const record = conn as TenantWhatsAppConnectionRecord
    const isConnected = record.status === 'connected'

    return {
      isConnected,
      connectionId: record.id,
      sessionId: record.openwa_session_id,
      phoneNumber: record.phone_number,
      dailySendLimit: record.daily_send_limit || 500,
      sendDelaySeconds: record.send_delay_seconds || 3,
    }
  }

  /**
   * Verifies that tenant has not exceeded their daily send quota
   */
  static async checkDailySendQuota(companyId: string, limit: number): Promise<boolean> {
    const adminClient = createAdminClient()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count, error } = await (adminClient as any)
      .from('whatsapp_messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', companyId)
      .eq('direction', 'outbound')
      .gte('created_at', todayStart.toISOString())

    if (error || count === null) return true // Fail open on count error
    return count < limit
  }

  /**
   * Dispatches an outbound WhatsApp text or document message via the tenant's OpenWA gateway
   */
  static async sendTenantWhatsApp(options: {
    companyId: string
    recipientPhone: string
    messageText: string
    documentUrl?: string
    documentFilename?: string
    sentByUserId?: string
    idempotencyKey?: string
    customerId?: string
    employeeId?: string
  }): Promise<WhatsAppRouteResult> {
    const start = Date.now()
    const {
      companyId,
      recipientPhone,
      messageText,
      documentUrl,
      documentFilename,
      sentByUserId,
      idempotencyKey,
      customerId,
      employeeId,
    } = options

    // 1. Normalize destination phone number
    const { isValid, formatted, error: phoneErr } = normalizeBdPhoneNumber(recipientPhone, false)
    if (!isValid || !formatted) {
      return {
        success: false,
        routedProvider: 'none',
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: phoneErr || 'Invalid Bangladeshi mobile phone number.',
        errorCode: 'INVALID_RECIPIENT',
      }
    }

    // 2. Resolve Tenant OpenWA Connection
    const sessionInfo = await this.resolveTenantSession(companyId)
    if (!sessionInfo.isConnected || !sessionInfo.sessionId) {
      return {
        success: false,
        routedProvider: 'none',
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: 'Tenant does not have an active connected WhatsApp session.',
        errorCode: 'TENANT_WHATSAPP_DISCONNECTED',
        fallbackToSms: true,
      }
    }

    // 3. Check Daily Quota
    const withinQuota = await this.checkDailySendQuota(companyId, sessionInfo.dailySendLimit)
    if (!withinQuota) {
      return {
        success: false,
        routedProvider: 'openwa',
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: `Daily WhatsApp send limit (${sessionInfo.dailySendLimit}) reached for today.`,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        fallbackToSms: true,
      }
    }

    const adminClient = createAdminClient()

    // 4. Resolve or upsert Contact
    let contactId: string | null = null
    try {
      const { data: contact } = await (adminClient as any)
        .from('whatsapp_contacts')
        .select('id, is_opted_in')
        .eq('tenant_id', companyId)
        .eq('phone_number', formatted)
        .maybeSingle()

      if (contact) {
        if (!contact.is_opted_in) {
          return {
            success: false,
            routedProvider: 'openwa',
            timestamp: new Date().toISOString(),
            latency_ms: Date.now() - start,
            error: 'Recipient has opted out of WhatsApp notifications.',
            errorCode: 'OPTED_OUT',
          }
        }
        contactId = contact.id
      } else {
        const { data: newContact } = await (adminClient as any)
          .from('whatsapp_contacts')
          .insert({
            tenant_id: companyId,
            phone_number: formatted,
            display_name: formatted,
            customer_id: customerId || null,
            employee_id: employeeId || null,
            contact_type: customerId ? 'customer' : employeeId ? 'employee' : 'customer',
            last_message_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        contactId = newContact?.id || null
      }
    } catch {}

    // 5. Dispatch via OpenWA Adapter
    let sendResult: WhatsAppSendResult
    if (documentUrl) {
      sendResult = await this.openwaAdapter.sendDocumentMessage(
        {
          to: formatted,
          documentUrl,
          filename: documentFilename || 'document.pdf',
          caption: messageText,
        },
        sessionInfo.sessionId
      )
    } else {
      sendResult = await this.openwaAdapter.sendTextMessage(
        {
          to: formatted,
          text: messageText,
        },
        sessionInfo.sessionId
      )
    }

    // 6. Record outbound message in database
    try {
      await (adminClient as any).from('whatsapp_messages').insert({
        tenant_id: companyId,
        contact_id: contactId,
        direction: 'outbound',
        openwa_message_id: sendResult.messageId || null,
        sender_phone: sessionInfo.phoneNumber || null,
        recipient_phone: formatted,
        message_type: documentUrl ? 'document' : 'text',
        body: messageText,
        media_url: documentUrl || null,
        media_filename: documentFilename || null,
        status: sendResult.success ? 'sent' : 'failed',
        sent_by_user_id: sentByUserId || null,
        error_message: sendResult.error || null,
        sent_at: sendResult.success ? new Date().toISOString() : null,
      })

      // Also record in communication_logs for unified reporting
      await (adminClient as any).from('communication_logs').insert({
        company_id: companyId,
        channel: 'whatsapp',
        recipient_name: formatted,
        recipient_destination: formatted,
        provider_used: 'openwa',
        message_content: messageText,
        status: sendResult.success ? 'sent' : 'failed',
        error_message: sendResult.error || null,
      })
    } catch (dbErr: any) {
      console.warn('[CommunicationRouter] Failed to log outbound message:', dbErr.message)
    }

    return {
      ...sendResult,
      routedProvider: 'openwa',
      sessionId: sessionInfo.sessionId,
      fallbackToSms: !sendResult.success,
    }
  }
}
