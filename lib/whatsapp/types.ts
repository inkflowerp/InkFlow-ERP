// ==============================================================================
// PrintERP SaaS - WhatsApp Provider Types & Interface
// Multi-Tenant Abstraction for OpenWA Gateway & Meta Cloud API
// ==============================================================================

import type { WhatsAppProviderType } from '../../types/gateway.types.ts'

export type WhatsAppSessionStatus =
  | 'created'
  | 'initializing'
  | 'qr_ready'
  | 'authenticating'
  | 'ready'
  | 'disconnected'
  | 'action_required'
  | 'failed'

export type TenantWhatsAppConnectionStatus =
  | 'pending'
  | 'qr_ready'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'logged_out'
  | 'error'
  | 'disabled'

export interface WhatsAppSendTextPayload {
  to: string // BD or international mobile number
  text: string
  previewUrl?: boolean
  quotedMessageId?: string
}

export interface WhatsAppSendTemplatePayload {
  to: string
  templateName: string
  languageCode?: string // e.g. 'en_US', 'bn_BD'
  components?: any[]
  variables?: Record<string, string | number>
}

export interface WhatsAppSendDocumentPayload {
  to: string
  documentUrl?: string
  base64?: string
  filename: string
  mimetype?: string
  caption?: string
  quotedMessageId?: string
}

export interface WhatsAppSendMediaPayload {
  to: string
  mediaUrl?: string
  base64?: string
  mimetype: string
  filename?: string
  caption?: string
  quotedMessageId?: string
}

export interface WhatsAppSendBulkItem {
  chatId: string
  text: string
}

export interface WhatsAppSendBulkPayload {
  messages: WhatsAppSendBulkItem[]
  delayBetweenMessagesMs?: number
}

export interface WhatsAppSendResult {
  success: boolean
  messageId?: string
  timestamp: string
  latency_ms: number
  rawResponse?: any
  error?: string
  errorCode?: string
}

export interface WhatsAppConnectionTestResult {
  success: boolean
  latency_ms: number
  sessionId?: string
  status?: string
  phone?: string | null
  pushName?: string | null
  phoneNumberId?: string
  displayPhoneNumber?: string
  verifiedName?: string
  qualityRating?: string
  codeVerificationStatus?: string
  message: string
  error?: string
}

export interface WhatsAppSessionDetails {
  id: string
  name: string
  status: WhatsAppSessionStatus
  phone?: string | null
  pushName?: string | null
  connectedAt?: string | null
  lastActive?: string | null
  lastError?: string | null
  engineLoaded?: boolean
}

export interface IWhatsAppProvider {
  readonly providerName: WhatsAppProviderType

  // Connection & Diagnostics
  testConnection(sessionId?: string): Promise<WhatsAppConnectionTestResult>

  // Session Lifecycle (OpenWA / multi-session gateways)
  createSession?(name: string, config?: Record<string, any>): Promise<{ sessionId: string; status: string; id?: string }>
  startSession?(sessionId: string): Promise<{ success: boolean; message: string }>
  stopSession?(sessionId: string): Promise<{ success: boolean; message: string }>
  logoutSession?(sessionId: string): Promise<{ success: boolean; message: string }>
  deleteSession?(sessionId: string): Promise<{ success: boolean; message: string }>
  getQrCode?(sessionId: string): Promise<{ qrCode: string; status: string }>
  getSessionStatus?(sessionId: string): Promise<WhatsAppSessionDetails>
  checkNumberExists?(sessionId: string, phone: string): Promise<{ exists: boolean; jid?: string }>

  // Webhooks
  registerWebhook?(
    sessionId: string,
    webhookUrl: string,
    secret: string,
    events?: string[]
  ): Promise<{ webhookId: string }>

  // Message Dispatch
  sendTextMessage(payload: WhatsAppSendTextPayload, sessionId?: string): Promise<WhatsAppSendResult>
  sendDocumentMessage(payload: WhatsAppSendDocumentPayload, sessionId?: string): Promise<WhatsAppSendResult>
  sendMediaMessage?(payload: WhatsAppSendMediaPayload, sessionId?: string): Promise<WhatsAppSendResult>
  sendTemplateMessage?(payload: WhatsAppSendTemplatePayload, sessionId?: string): Promise<WhatsAppSendResult>
  sendBulk?(sessionId: string, payload: WhatsAppSendBulkPayload): Promise<{ success: boolean; batchId?: string; count?: number; error?: string }>
}
