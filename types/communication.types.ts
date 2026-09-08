export type SmsProviderType = 'bulksmsbd' | 'ssl_wireless' | 'alpha' | 'mim' | 'mock'

export type WhatsAppProviderType = 'meta_cloud_api' | 'twilio_whatsapp' | 'mock'

export type CommunicationChannel = 'in_app' | 'whatsapp' | 'sms' | 'email'

export type CommunicationStatus = 'sent' | 'delivered' | 'failed' | 'queued'

export type InAppNotificationType =
  | 'new_order'
  | 'payment_received'
  | 'design_revision'
  | 'artwork_approved'
  | 'production_completed'
  | 'delivery_scheduled'
  | 'overdue_invoice'
  | 'low_stock'
  | 'leave_approval'

export interface InAppNotificationRecord {
  id: string
  company_id: string
  user_id?: string | null
  type: InAppNotificationType
  title: string
  title_bn?: string | null
  message: string
  message_bn?: string | null
  action_url?: string | null
  is_read: boolean
  created_at: string
}

export interface ChannelConfigRecord {
  id: string
  company_id: string
  channel_type: 'whatsapp' | 'sms' | 'email'
  provider_name: string
  is_enabled: boolean
  api_key_or_password?: string | null
  sender_id_or_phone?: string | null
  account_or_user_id?: string | null
  extra_settings?: Record<string, any>
  updated_at: string
}

export interface MessageTemplateRecord {
  id: string
  company_id: string
  template_key: string
  name: string
  channel: 'all' | 'whatsapp' | 'sms' | 'email'
  body_en: string
  body_bn: string
  created_at: string
  updated_at: string
}

export interface CommunicationLogRecord {
  id: string
  company_id: string
  channel: CommunicationChannel
  recipient_name: string
  recipient_destination: string
  provider_used: string
  message_content: string
  status: CommunicationStatus
  error_message?: string | null
  created_at: string
}

export interface SmsProvider {
  providerName: SmsProviderType
  sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>
  checkBalance(): Promise<{ balance: number; currency: string }>
}

export interface WhatsAppProvider {
  providerName: WhatsAppProviderType
  sendMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>
  sendDocument(to: string, docUrl: string, caption: string): Promise<{ success: boolean; messageId?: string; error?: string }>
}
