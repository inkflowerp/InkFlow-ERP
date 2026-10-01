export type SmsProviderType = 'bulksmsbd' | 'ssl_wireless' | 'alpha' | 'mim' | 'mock'

export type WhatsAppProviderType = 'openwa' | 'meta_cloud_api' | 'twilio_whatsapp' | 'mock'

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
  | 'invoice_request'
  | 'design_ready'
  | 'customer_approval_needed'
  | 'production_gate_cleared'
  | 'production_ready'


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

export type WhatsAppConnectionStatus =
  | 'pending'
  | 'qr_ready'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'logged_out'
  | 'error'
  | 'disabled'

export interface TenantWhatsAppConnectionRecord {
  id: string
  tenant_id: string
  provider: 'openwa' | string
  openwa_session_id: string
  openwa_session_uuid?: string | null
  phone_number?: string | null
  phone_country_code?: string | null
  display_name?: string | null
  status: WhatsAppConnectionStatus
  engine: string
  connected_at?: string | null
  disconnected_at?: string | null
  last_seen_at?: string | null
  last_error?: string | null
  webhook_status?: string | null
  webhook_secret?: string | null
  daily_send_limit: number
  send_delay_seconds: number
  qr_code_raw?: string | null
  qr_code_updated_at?: string | null
  created_at: string
  updated_at: string
}

export interface WhatsAppContactRecord {
  id: string
  tenant_id: string
  phone_number: string
  display_name: string
  customer_id?: string | null
  employee_id?: string | null
  contact_type: 'customer' | 'employee' | 'other' | 'unknown'
  avatar_url?: string | null
  is_opted_in: boolean
  last_message_at?: string | null
  created_at: string
  updated_at: string
}

export interface WhatsAppChatRecord {
  id: string
  tenant_id: string
  contact_id: string
  chat_jid: string
  unread_count: number
  last_message_preview?: string | null
  last_message_timestamp?: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type WhatsAppMessageDirection = 'inbound' | 'outbound'
export type WhatsAppMessageStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface WhatsAppMessageRecord {
  id: string
  tenant_id: string
  chat_id?: string | null
  contact_id?: string | null
  direction: WhatsAppMessageDirection
  openwa_message_id?: string | null
  sender_phone?: string | null
  recipient_phone: string
  message_type: 'text' | 'image' | 'document' | 'template' | 'location'
  body?: string | null
  media_url?: string | null
  media_mime_type?: string | null
  media_filename?: string | null
  status: WhatsAppMessageStatus
  sent_by_user_id?: string | null
  error_message?: string | null
  sent_at?: string | null
  delivered_at?: string | null
  read_at?: string | null
  created_at: string
}

export interface CommunicationJobRecord {
  id: string
  tenant_id: string
  event_type: string
  channel: 'whatsapp' | 'sms' | 'email' | 'in_app'
  recipient_phone?: string | null
  recipient_email?: string | null
  recipient_user_id?: string | null
  recipient_customer_id?: string | null
  template_key?: string | null
  payload: Record<string, any>
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  attempts: number
  max_attempts: number
  next_retry_at?: string | null
  last_error?: string | null
  idempotency_key?: string | null
  created_at: string
  updated_at: string
}

export interface OtpRequestRecord {
  id: string
  tenant_id: string
  phone_number: string
  purpose: 'login' | 'verify_phone' | 'password_reset' | 'transaction_approval'
  otp_code: string
  primary_channel: 'whatsapp' | 'sms'
  channel_used: 'whatsapp' | 'sms'
  is_verified: boolean
  verified_at?: string | null
  expires_at: string
  attempts: number
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
}

export interface NotificationPreferenceRecord {
  id: string
  tenant_id: string
  event_type: string
  whatsapp_enabled: boolean
  sms_enabled: boolean
  email_enabled: boolean
  in_app_enabled: boolean
  whatsapp_template?: string | null
  sms_template?: string | null
  email_template?: string | null
  recipient_roles: string[]
  created_at: string
  updated_at: string
}
