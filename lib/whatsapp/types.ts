// ==============================================================================
// PrintERP SaaS - WhatsApp Provider Types & Interface
// ==============================================================================

import type { WhatsAppProviderType } from '../../types/gateway.types.ts'

export interface WhatsAppSendTextPayload {
  to: string // BD or intl mobile number
  text: string
  previewUrl?: boolean
}

export interface WhatsAppSendTemplatePayload {
  to: string
  templateName: string
  languageCode?: string // e.g. 'en_US', 'bn_BD'
  components?: any[]
}

export interface WhatsAppSendDocumentPayload {
  to: string
  documentUrl: string
  filename: string
  caption?: string
}

export interface WhatsAppSendResult {
  success: boolean
  messageId?: string
  timestamp: string
  latency_ms: number
  rawResponse?: any
  error?: string
}

export interface WhatsAppConnectionTestResult {
  success: boolean
  latency_ms: number
  phoneNumberId?: string
  displayPhoneNumber?: string
  verifiedName?: string
  qualityRating?: string
  codeVerificationStatus?: string
  message: string
  error?: string
}

export interface IWhatsAppProvider {
  readonly providerName: WhatsAppProviderType
  testConnection(): Promise<WhatsAppConnectionTestResult>
  sendTextMessage(payload: WhatsAppSendTextPayload): Promise<WhatsAppSendResult>
  sendTemplateMessage(payload: WhatsAppSendTemplatePayload): Promise<WhatsAppSendResult>
  sendDocumentMessage(payload: WhatsAppSendDocumentPayload): Promise<WhatsAppSendResult>
}
