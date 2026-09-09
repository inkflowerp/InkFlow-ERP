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
  smtp_host?: string | null
  smtp_port?: number | null
  smtp_username?: string | null
  decrypted_secret?: string | null
  encryption_type?: EmailEncryptionType | null
  sender_name: string
  sender_email: string
  reply_to_email?: string | null
  extra_settings?: {
    aws_region?: string
    ses_config_set?: string
    api_key?: string
    [key: string]: any
  }
}

export interface IEmailProvider {
  readonly providerName: EmailProviderType
  sendEmail(payload: OutgoingEmailPayload): Promise<ProviderSendResult>
  verifyConnection(): Promise<ProviderConnectionResult>
}
