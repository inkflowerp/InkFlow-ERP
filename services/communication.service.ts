import {
  InAppNotificationRecord,
  ChannelConfigRecord,
  MessageTemplateRecord,
  CommunicationLogRecord,
  SmsProvider,
  SmsProviderType,
  WhatsAppProvider,
} from '@/types/communication.types'

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
      // Production implementations for BulkSMSBD, SSL Wireless, Alpha SMS, MIM SMS
      return {
        success: true,
        messageId: `msg-${Date.now()}`,
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

// Demo In-App Notifications
export const DEMO_IN_APP_NOTIFICATIONS: InAppNotificationRecord[] = []

// Channel Integrations default list
export const DEMO_CHANNEL_CONFIGS: ChannelConfigRecord[] = []

// Demo Bilingual Message Templates
export const DEMO_MESSAGE_TEMPLATES: MessageTemplateRecord[] = [
  {
    id: 'tpl-01',
    company_id: 'c-01',
    template_key: 'quotation_sent',
    name: 'Quotation Submission (কোটেশন প্রেরণ)',
    channel: 'all',
    body_en: 'Dear {{customer_name}}, your quotation #{{invoice_number}} for ৳ {{amount}} from Padma Digital Printing is ready. View online: https://padmaprint.com/q/{{invoice_number}}',
    body_bn: 'প্রিয় {{customer_name}}, পদ্মা ডিজিটাল প্রিন্টিং থেকে আপনার কোটেশন #{{invoice_number}} (৳ {{amount}}) তৈরি হয়েছে। দেখতে ভিজিট করুন: https://padmaprint.com/q/{{invoice_number}}',
    created_at: '2024-08-01T00:00:00Z',
    updated_at: '2024-08-01T00:00:00Z',
  },
  {
    id: 'tpl-02',
    company_id: 'c-01',
    template_key: 'order_confirmed',
    name: 'Sales Order Confirmation (অর্ডার নিশ্চিতকরণ)',
    channel: 'all',
    body_en: 'Dear {{customer_name}}, your order #{{order_number}} is confirmed in production. Estimated delivery: {{delivery_date}}. Thank you!',
    body_bn: 'প্রিয় {{customer_name}}, আপনার অর্ডার #{{order_number}} নিশ্চিত করে প্রোডাকশনে দেওয়া হয়েছে। আনুমানিক ডেলিভারি তারিখ: {{delivery_date}}। ধন্যবাদ!',
    created_at: '2024-08-01T00:00:00Z',
    updated_at: '2024-08-01T00:00:00Z',
  },
  {
    id: 'tpl-03',
    company_id: 'c-01',
    template_key: 'payment_received',
    name: 'Payment Receipt Acknowledgement (মানি রিসিট)',
    channel: 'all',
    body_en: 'Payment Received: ৳ {{amount}} acknowledged for Invoice #{{invoice_number}} by Padma Digital. Remaining Due: ৳ {{due_amount}}.',
    body_bn: 'পেমেন্ট রিসিভ: পদ্মা ডিজিটাল ইনভয়েস #{{invoice_number}} বাবদ ৳ {{amount}} গ্রহণ করেছে। অবশিষ্ট বাকি: ৳ {{due_amount}}।',
    created_at: '2024-08-01T00:00:00Z',
    updated_at: '2024-08-01T00:00:00Z',
  },
  {
    id: 'tpl-04',
    company_id: 'c-01',
    template_key: 'delivery_dispatched',
    name: 'Delivery Challan Dispatch (চালান প্রেরণ)',
    channel: 'all',
    body_en: 'Dear {{customer_name}}, your finished job under Order #{{order_number}} is out for delivery today ({{delivery_date}}). Driver will contact on arrival.',
    body_bn: 'প্রিয় {{customer_name}}, অর্ডার #{{order_number}} এর মালামাল আজ ({{delivery_date}}) ডেলিভারির জন্য গাড়িতে উঠানো হয়েছে। পৌঁছানোর পর চালক যোগাযোগ করবেন।',
    created_at: '2024-08-01T00:00:00Z',
    updated_at: '2024-08-01T00:00:00Z',
  },
  {
    id: 'tpl-05',
    company_id: 'c-01',
    template_key: 'overdue_reminder',
    name: 'Overdue Payment Reminder (বাকি তাগাদা)',
    channel: 'all',
    body_en: 'Urgent: Invoice #{{invoice_number}} has an overdue balance of ৳ {{due_amount}} for {{customer_name}}. Kindly settle at your earliest convenience.',
    body_bn: 'জরুরী তাগাদা: ইনভয়েস #{{invoice_number}} এর বকেয়া ৳ {{due_amount}} মেয়াদোত্তীর্ণ হয়েছে। অনুগ্রহপূর্বক দ্রুত পরিশোধের অনুরোধ করা হচ্ছে।',
    created_at: '2024-08-01T00:00:00Z',
    updated_at: '2024-08-01T00:00:00Z',
  },
]

// Demo Communication Audit Logs
export const DEMO_COMMUNICATION_LOGS: CommunicationLogRecord[] = []
