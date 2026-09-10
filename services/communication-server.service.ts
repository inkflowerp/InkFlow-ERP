// ==============================================================================
// PrintERP SaaS - Communication Server Service (Server Only)
// Handles transactional email, SMS, WhatsApp, Telegram, and In-App notification dispatching.
// ==============================================================================

import type {
  InAppNotificationRecord,
  SendEmailOptions,
  SendEmailResult,
  EmailEventType,
} from '../types/communication.types.ts'
import { EmailGatewayService } from './email-gateway.service.ts'
import { GatewayService } from './gateway.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'

export class CommunicationService {
  /**
   * Dispatches transactional email through the resolved Email Gateway
   */
  static async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    return EmailGatewayService.sendEmail(options)
  }

  /**
   * Creates an In-App notification record
   */
  static async createInAppNotification(
    companyId: string,
    notification: Omit<InAppNotificationRecord, 'id' | 'created_at' | 'company_id'>
  ): Promise<InAppNotificationRecord> {
    const record: InAppNotificationRecord = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      company_id: companyId,
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      title_bn: notification.title_bn,
      message: notification.message,
      message_bn: notification.message_bn,
      action_url: notification.action_url,
      is_read: false,
      created_at: new Date().toISOString(),
    }

    // Save to local store
    const existing = PrintERPDataStore.get<InAppNotificationRecord[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS) || []
    existing.unshift(record)
    PrintERPDataStore.set(STORAGE_KEYS.IN_APP_NOTIFICATIONS, existing.slice(0, 50))

    return record
  }

  /**
   * Unified multi-channel notification dispatcher
   */
  static async dispatchWorkflowNotification(params: {
    companyId: string
    eventType: EmailEventType
    recipientName: string
    recipientEmail?: string
    recipientPhone?: string
    telegramChatId?: string
    variables: Record<string, any>
    channels?: Array<'email' | 'sms' | 'whatsapp' | 'telegram' | 'in_app'>
    actionUrl?: string
    customMessage?: string
  }): Promise<{
    email?: SendEmailResult
    sms?: boolean
    whatsapp?: boolean
    telegram?: boolean
    in_app?: boolean
  }> {
    const {
      companyId,
      eventType,
      recipientName,
      recipientEmail,
      recipientPhone,
      telegramChatId,
      variables,
      channels = ['email', 'in_app'],
      actionUrl,
      customMessage,
    } = params

    const results: {
      email?: SendEmailResult
      sms?: boolean
      whatsapp?: boolean
      telegram?: boolean
      in_app?: boolean
    } = {}

    const textContent =
      customMessage ||
      `Dear ${recipientName}, notification regarding ${eventType.replace(/_/g, ' ')} (${variables.order_number || variables.invoice_number || ''}).`

    // 1. Email Dispatch
    if (channels.includes('email') && recipientEmail) {
      results.email = await EmailGatewayService.sendEmail({
        tenantId: companyId,
        eventType,
        recipient: recipientEmail,
        variables: {
          ...variables,
          customer_name: recipientName,
        },
      })
    }

    // 2. SMS Dispatch
    if (channels.includes('sms') && recipientPhone) {
      const smsRes = await GatewayService.sendTestMessage({
        category: 'sms',
        recipient: recipientPhone,
        recipientName,
        message: textContent,
      })
      results.sms = smsRes.success
    }

    // 3. WhatsApp Dispatch
    if (channels.includes('whatsapp') && recipientPhone) {
      const waRes = await GatewayService.sendTestMessage({
        category: 'whatsapp',
        recipient: recipientPhone,
        recipientName,
        message: textContent,
      })
      results.whatsapp = waRes.success
    }

    // 4. Telegram Dispatch
    if (channels.includes('telegram') && telegramChatId) {
      const tgRes = await GatewayService.sendTestMessage({
        category: 'telegram',
        recipient: telegramChatId,
        recipientName,
        message: textContent,
      })
      results.telegram = tgRes.success
    }

    // 5. In-App Notification
    if (channels.includes('in_app')) {
      await this.createInAppNotification(companyId, {
        type: eventType.includes('order')
          ? 'new_order'
          : eventType.includes('payment')
          ? 'payment_received'
          : 'artwork_approved',
        title: `Workflow Alert: ${eventType.replace(/_/g, ' ').toUpperCase()}`,
        message: `Notification for ${recipientName} regarding ${eventType}`,
        action_url: actionUrl,
        is_read: false,
      })
      results.in_app = true
    }

    return results
  }
}
