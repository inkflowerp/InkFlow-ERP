// ==============================================================================
// PrintERP SaaS - Enterprise Gateway & API Integration System Types
// Supports Email, SMS, Payment, WhatsApp, and Telegram providers
// ==============================================================================

export type GatewayCategory = 'email' | 'sms' | 'payment' | 'whatsapp' | 'telegram'

export type GatewayStatus =
  | 'not_configured'
  | 'configured'
  | 'testing'
  | 'connected'
  | 'error'
  | 'disabled'

export type GatewayEnvironment = 'sandbox' | 'live'

export type EmailProviderType = 'smtp' | 'resend' | 'sendgrid' | 'ses'
export type SmsProviderType = 'greenweb' | 'bulksmsbd' | 'ssl_wireless' | 'twilio'
export type PaymentProviderType = 'bkash' | 'sslcommerz' | 'nagad' | 'uddoktapay' | 'stripe'
export type WhatsAppProviderType = 'meta_whatsapp'
export type TelegramProviderType = 'telegram_bot'

export type AnyProviderType =
  | EmailProviderType
  | SmsProviderType
  | PaymentProviderType
  | WhatsAppProviderType
  | TelegramProviderType

export interface GatewayIntegrationRecord {
  id: string
  tenant_id: string | null // null for platform-wide gateway
  category: GatewayCategory
  provider: AnyProviderType
  name: string
  is_enabled: boolean
  is_default: boolean
  environment: GatewayEnvironment
  encrypted_credentials?: string | null
  public_config: Record<string, any>
  status: GatewayStatus
  last_tested_at?: string | null
  last_test_status?: string | null
  last_test_error?: string | null
  last_test_latency_ms?: number
  failure_count: number
  created_by?: string | null
  created_at: string
  updated_at: string
}

/**
 * Sanitized record safe to send to frontend / client UI (secrets stripped or masked)
 */
export interface SanitizedGatewayRecord {
  id: string
  tenant_id: string | null
  category: GatewayCategory
  provider: AnyProviderType
  name: string
  is_enabled: boolean
  is_default: boolean
  environment: GatewayEnvironment
  has_credentials: boolean
  masked_credentials: Record<string, string> // e.g. { api_key: 'sk_live_••••••1234' }
  public_config: Record<string, any>
  status: GatewayStatus
  last_tested_at?: string | null
  last_test_status?: string | null
  last_test_error?: string | null
  last_test_latency_ms?: number
  failure_count: number
  created_at: string
  updated_at: string
}

export interface GatewayFormData {
  id?: string
  tenant_id?: string | null
  category: GatewayCategory
  provider: AnyProviderType
  name: string
  is_enabled?: boolean
  is_default?: boolean
  environment: GatewayEnvironment
  // Raw credentials entered in UI (will be encrypted server-side)
  credentials?: Record<string, string>
  public_config: Record<string, any>
}

export interface GatewayTestResult {
  success: boolean
  status: GatewayStatus
  latency_ms: number
  message: string
  diagnostics?: Record<string, any>
  error?: string
}

export interface SendTestPayload {
  gatewayId?: string
  category: GatewayCategory
  provider?: AnyProviderType
  recipient: string // Email address, BD phone number, or Telegram Chat ID
  recipientName?: string
  subject?: string
  message: string
  templateId?: string
  variables?: Record<string, string>
}

export interface SendTestResult {
  success: boolean
  providerMessageId?: string
  timestamp: string
  latency_ms: number
  rawResponse?: any
  error?: string
}

export interface CommunicationLogRecord {
  id: string
  company_id?: string | null
  gateway_id?: string | null
  channel: 'email' | 'sms' | 'whatsapp' | 'telegram' | 'in_app'
  recipient_name?: string | null
  recipient_destination: string
  provider_used: string
  message_content: string
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'cancelled'
  provider_message_id?: string | null
  error_message?: string | null
  retry_count: number
  metadata?: Record<string, any>
  sent_by?: string | null
  sent_at?: string | null
  delivered_at?: string | null
  failed_at?: string | null
  created_at: string
}

export interface GatewayTransactionRecord {
  id: string
  tenant_id?: string | null
  gateway_id?: string | null
  provider: string
  invoice_id?: string | null
  customer_id?: string | null
  subscription_id?: string | null
  amount: number
  currency: string
  internal_trx_id: string
  provider_trx_id?: string | null
  payment_status: 'initiated' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'expired'
  idempotency_key?: string | null
  payment_url?: string | null
  callback_payload?: any
  webhook_payload?: any
  verification_payload?: any
  error_message?: string | null
  initiated_at: string
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface GatewayWebhookRecord {
  id: string
  gateway_id?: string | null
  provider: string
  event_type: string
  provider_event_id?: string | null
  signature?: string | null
  is_verified: boolean
  payload: any
  status: 'received' | 'processed' | 'ignored' | 'failed'
  error_message?: string | null
  processed_at?: string | null
  created_at: string
}

export interface GatewayAuditRecord {
  id: string
  tenant_id?: string | null
  gateway_id?: string | null
  action: string
  details: Record<string, any>
  ip_address?: string | null
  performed_by?: string | null
  created_at: string
}

export interface GatewayTelemetrySummary {
  totalConfigured: number
  totalConnected: number
  totalErrors: number
  avgLatencyMs: number
  liveCount: number
  sandboxCount: number
  recentLogsCount: number
  recentTransactionsVolume: number
  recentWebhooksCount: number
}
