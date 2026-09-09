// ==============================================================================
// PrintERP SaaS - Communication Server Service (Server Only)
// Handles transactional email sending, notifications dispatching, and gateway interfacing.
// ==============================================================================

import {
  InAppNotificationRecord,
  SendEmailOptions,
  SendEmailResult,
  EmailEventType,
} from '@/types/communication.types'
import { EmailGatewayService } from './email-gateway.service'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

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
   * Unified notification dispatcher across channels
   */
  static async dispatchWorkflowNotification(params: {
    companyId: string
    eventType: EmailEventType
    recipientName: string
    recipientEmail?: string
    recipientPhone?: string
    variables: Record<string, any>
    channels?: Array<'email' | 'sms' | 'whatsapp' | 'in_app'>
    actionUrl?: string
  }): Promise<{ email?: SendEmailResult; sms?: boolean; in_app?: boolean }> {
    const {
      companyId,
      eventType,
      recipientName,
      recipientEmail,
      recipientPhone,
      variables,
      channels = ['email', 'in_app'],
      actionUrl,
    } = params

    const results: { email?: SendEmailResult; sms?: boolean; in_app?: boolean } = {}

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

    // 2. In-App Notification
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
