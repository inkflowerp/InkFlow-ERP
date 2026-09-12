// ==============================================================================
// PrintERP SaaS - Email Provider Abstraction Interfaces
// ==============================================================================

import type { EmailProviderType, EmailEncryptionType } from '../../types/communication.types.ts'

export interface EmailAttachment {
  filename: string
  content?: string | Buffer
  path?: string
  contentType?: string
  cid?: string
}

export interface EmailAddress {
  name?: string
  address: string
}

export interface OutgoingEmailPayload {
  from: EmailAddress | string
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
  headers?: Record<string, string>
  metadata?: Record<string, any>
}

export interface ProviderSendResult {
  success: boolean
  messageId?: string
  provider: EmailProviderType
  timestamp: string
  rawResponse?: any
  error?: string
}

export interface ProviderConnectionResult {
  success: boolean
  provider: EmailProviderType
  latencyMs: number
  message: string
  error?: string
  details?: any
}

export interface DecryptedGatewayConfig {
  id?: string
  provider: EmailProviderType
  scope_type?: 'PLATFORM' | 'TENANT'
  tenant_id?: string | null
  smtp_host?: string | null
  smtp_port?: number | null
  smtp_username?: string | null
  decrypted_secret?: string | null
  encryption_type?: EmailEncryptionType | null
  gmail_account_email?: string | null
  gmail_display_name?: string | null
  token_expires_at?: string | null
  sender_name: string
  sender_email: string
  reply_to_email?: string | null
  extra_settings?: {
    aws_region?: string
    ses_config_set?: string
    api_key?: string
    oauth_scope?: string
    access_token?: string
    refresh_token?: string
    client_id?: string
    client_secret?: string
    [key: string]: any
  }
  onTokenRefreshed?: (newTokens: {
    access_token: string
    expires_at: string
    refresh_token?: string
  }) => Promise<void>
}

export interface IEmailProvider {
  readonly providerName: EmailProviderType
  sendEmail(payload: OutgoingEmailPayload): Promise<ProviderSendResult>
  verifyConnection(): Promise<ProviderConnectionResult>
}
