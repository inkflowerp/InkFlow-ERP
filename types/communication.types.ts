export type SmsProviderType = 'bulksmsbd' | 'ssl_wireless' | 'alpha' | 'mim' | 'mock'

export type WhatsAppProviderType = 'meta_cloud_api' | 'twilio_whatsapp' | 'mock'

export type EmailProviderType = 'gmail' | 'smtp' | 'resend' | 'sendgrid' | 'ses' | 'custom' | 'mock'

export type EmailScopeType = 'PLATFORM' | 'TENANT'

export type EmailGatewayType = 'transactional' | 'marketing' | 'system'

export type EmailGatewayStatus = 'active' | 'inactive' | 'unverified' | 'error'

export type EmailEncryptionType = 'ssl' | 'tls' | 'starttls' | 'none'

export type EmailLogStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'retrying'

export type EmailQueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

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

export type EmailEventType =
  | 'invoice_created'
  | 'quotation_sent'
  | 'payment_received'
  | 'due_reminder'
  | 'design_approval_request'
  | 'revision_notification'
  | 'approval_confirmation'
  | 'job_started'
  | 'job_completed'
  | 'delivery_scheduled'
  | 'delivery_completed'
  | 'user_invitation'
  | 'password_reset'
  | 'security_alert'
  | 'test_email'
  | string

export interface EmailGatewayRecord {
  id: string
  tenant_id: string | null // null for PLATFORM scope
  scope_type?: EmailScopeType
  provider: EmailProviderType
  type: EmailGatewayType
  smtp_host?: string | null
  smtp_port?: number | null
  smtp_username?: string | null
  encrypted_credentials?: string | null
  encryption_type?: EmailEncryptionType | null
  gmail_account_email?: string | null
  gmail_display_name?: string | null
  token_expires_at?: string | null
  sender_name: string
  sender_email: string
  reply_to_email?: string | null
  status: EmailGatewayStatus
  is_default: boolean
  extra_settings?: {
    aws_region?: string
    ses_config_set?: string
    api_key?: string
    custom_headers?: Record<string, string>
    rate_limit_per_second?: number
    oauth_scope?: string
    refresh_token?: string
    access_token?: string
    [key: string]: any
  }
  last_tested_at?: string | null
  last_test_status?: string | null
  last_test_error?: string | null
  last_checked_at?: string | null
  last_sent_at?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface EmailGatewayFormData {
  id?: string
  tenant_id?: string | null
  scope_type?: EmailScopeType
  provider: EmailProviderType
  type?: EmailGatewayType
  smtp_host?: string
  smtp_port?: number
  smtp_username?: string
  password?: string
  api_key?: string
  encryption_type?: EmailEncryptionType
  gmail_account_email?: string
  gmail_display_name?: string
  sender_name: string
  sender_email: string
  reply_to_email?: string
  status?: EmailGatewayStatus
  is_default?: boolean
  aws_region?: string
  ses_config_set?: string
}

export interface EmailTemplateRecord {
  id: string
  tenant_id: string | null
  event_type: EmailEventType
  name: string
  name_bn?: string | null
  subject_template: string
  subject_template_bn?: string | null
  body_template: string
  body_template_bn?: string | null
  variables: string[]
  status: 'active' | 'inactive' | 'draft'
  created_at: string
  updated_at: string
}

export interface EmailLogRecord {
  id: string
  tenant_id: string | null
  scope_type?: EmailScopeType
  gateway_id?: string | null
  event_type: EmailEventType
  recipient: string
  subject: string
  status: EmailLogStatus
  provider_message_id?: string | null
  error_message?: string | null
  retry_count: number
  max_retries: number
  idempotency_key?: string | null
  metadata?: Record<string, any>
  sent_by?: string | null
  sent_at?: string | null
  created_at: string
}

export interface EmailQueueJob {
  id: string
  tenant_id: string | null
  scope_type?: EmailScopeType
  event_type: EmailEventType
  recipient: string
  subject: string
  html_body: string
  text_body?: string | null
  variables?: Record<string, any>
  attachments?: EmailAttachment[]
  idempotency_key?: string | null
  metadata?: Record<string, any>
  status: EmailQueueStatus
  attempts: number
  max_attempts: number
  next_run_at: string
  last_error?: string | null
  locked_at?: string | null
  locked_by?: string | null
  created_at: string
  updated_at: string
}

export interface SendEmailOptions {
  scopeType?: EmailScopeType
  tenantId?: string | null
  eventType: EmailEventType
  recipient: string
  variables?: Record<string, any>
  customSubject?: string
  customHtmlBody?: string
  customTextBody?: string
  replyTo?: string
  attachments?: EmailAttachment[]
  idempotencyKey?: string
  metadata?: Record<string, any>
  sentBy?: string | null
  queueNow?: boolean
  language?: 'en' | 'bn'
}

export interface EmailAttachment {
  filename: string
  content?: string | Buffer
  path?: string
  contentType?: string
  cid?: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  status: 'sent' | 'queued' | 'failed'
  providerUsed?: string
  gatewayId?: string
  error?: string
}

export interface ConnectionTestResult {
  success: boolean
  provider: string
  latencyMs?: number
  message: string
  details?: any
}

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
