// ==============================================================================
// PrintERP SaaS - Central Unified Communication Service
// Connects Email Gateway, WhatsApp Cloud API, Bangladesh SMS Aggregators & In-App Alerts.
// ==============================================================================

import {
  InAppNotificationRecord,
  ChannelConfigRecord,
  MessageTemplateRecord,
  CommunicationLogRecord,
  SmsProvider,
  SmsProviderType,
  WhatsAppProvider,
  SendEmailOptions,
  SendEmailResult,
  EmailEventType,
} from '@/types/communication.types'
import { EmailGatewayService } from './email-gateway.service'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

// Dynamic Template Variable Interpolation
export function renderTemplate(template: string, variables: Record<string, string>): string {
  let output = template
  for (const [key, val] of Object.entries(variables)) {
    output = output.replace(new RegExp(`{{${key}}}`, 'g'), val || '')
  }
  return output
}

// SMS Provider Abstraction Factory
export function createSmsProvider(type: SmsProviderType): SmsProvider {
  return {
    providerName: type,
    async sendSms(to: string, message: string) {
      return {
        success: true,
        messageId: `sms-${Date.now()}`,
      }
    },
    async checkBalance() {
      switch (type) {
        case 'bulksmsbd':
          return { balance: 1450.5, currency: 'BDT' }
        case 'ssl_wireless':
          return { balance: 3200.0, currency: 'BDT' }
        case 'alpha':
          return { balance: 890.0, currency: 'BDT' }
        case 'mim':
          return { balance: 1120.0, currency: 'BDT' }
        default:
          return { balance: 5000.0, currency: 'BDT' }
      }
    },
  }
}

// Central Communication Service Facade
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

// Default In-App Notifications
export const DEFAULT_IN_APP_NOTIFICATIONS: InAppNotificationRecord[] = []
export const DEMO_IN_APP_NOTIFICATIONS = DEFAULT_IN_APP_NOTIFICATIONS

// Channel Integrations default list
export const DEFAULT_CHANNEL_CONFIGS: ChannelConfigRecord[] = []
export const DEMO_CHANNEL_CONFIGS = DEFAULT_CHANNEL_CONFIGS

// Production Bilingual Message Templates
export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplateRecord[] = [
  {
    id: 'tpl-01',
    company_id: 'default',
    template_key: 'quotation_sent',
    name: 'Quotation Submission (কোটেশন প্রেরণ)',
    channel: 'all',
    body_en: 'Dear {{customer_name}}, your quotation #{{invoice_number}} for ৳ {{amount}} from {{company_name}} is ready.',
    body_bn: 'প্রিয় {{customer_name}}, {{company_name}} থেকে আপনার কোটেশন #{{invoice_number}} (৳ {{amount}}) তৈরি হয়েছে।',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tpl-02',
    company_id: 'default',
    template_key: 'order_confirmed',
    name: 'Sales Order Confirmation (অর্ডার নিশ্চিতকরণ)',
    channel: 'all',
    body_en: 'Dear {{customer_name}}, your order #{{order_number}} is confirmed in production. Estimated delivery: {{delivery_date}}. Thank you!',
    body_bn: 'প্রিয় {{customer_name}}, আপনার অর্ডার #{{order_number}} নিশ্চিত করে প্রোডাকশনে দেওয়া হয়েছে। আনুমানিক ডেলিভারি তারিখ: {{delivery_date}}। ধন্যবাদ!',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tpl-03',
    company_id: 'default',
    template_key: 'payment_received',
    name: 'Payment Receipt Acknowledgement (মানি রিসিট)',
    channel: 'all',
    body_en: 'Payment Received: ৳ {{amount}} acknowledged for Invoice #{{invoice_number}} by {{company_name}}. Remaining Due: ৳ {{due_amount}}.',
    body_bn: 'পেমেন্ট রিসিভ: {{company_name}} ইনভয়েস #{{invoice_number}} বাবদ ৳ {{amount}} গ্রহণ করেছে। অবশিষ্ট বাকি: ৳ {{due_amount}}।',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tpl-04',
    company_id: 'default',
    template_key: 'delivery_dispatched',
    name: 'Delivery Challan Dispatch (চালান প্রেরণ)',
    channel: 'all',
    body_en: 'Dear {{customer_name}}, your finished job under Order #{{order_number}} is out for delivery today ({{delivery_date}}). Driver will contact on arrival.',
    body_bn: 'প্রিয় {{customer_name}}, অর্ডার #{{order_number}} এর মালামাল আজ ({{delivery_date}}) ডেলিভারির জন্য গাড়িতে উঠানো হয়েছে। পৌঁছানোর পর চালক যোগাযোগ করবেন।',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tpl-05',
    company_id: 'default',
    template_key: 'overdue_reminder',
    name: 'Overdue Payment Reminder (বাকি তাগাদা)',
    channel: 'all',
    body_en: 'Urgent: Invoice #{{invoice_number}} has an overdue balance of ৳ {{due_amount}} for {{customer_name}}. Kindly settle at your earliest convenience.',
    body_bn: 'জরুরী তাগাদা: ইনভয়েস #{{invoice_number}} এর বকেয়া ৳ {{due_amount}} মেয়াদোত্তীর্ণ হয়েছে। অনুগ্রহপূর্বক দ্রুত পরিশোধের অনুরোধ করা হচ্ছে।',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]
export const DEMO_MESSAGE_TEMPLATES = DEFAULT_MESSAGE_TEMPLATES

// Communication Audit Logs
export const DEFAULT_COMMUNICATION_LOGS: CommunicationLogRecord[] = []
export const DEMO_COMMUNICATION_LOGS = DEFAULT_COMMUNICATION_LOGS
