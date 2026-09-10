// ==============================================================================
// PrintERP SaaS - Telegram Provider Types & Interface
// ==============================================================================

import type { TelegramProviderType } from '../../types/gateway.types.ts'

export interface TelegramSendMessagePayload {
  chatId: string | number // Chat ID, Group ID, or Channel username (@channel)
  text: string
  parseMode?: 'HTML' | 'MarkdownV2' | 'Markdown'
  disableWebPagePreview?: boolean
  replyToMessageId?: number
}

export interface TelegramSendDocumentPayload {
  chatId: string | number
  documentUrl: string
  caption?: string
  parseMode?: 'HTML' | 'MarkdownV2'
}

export interface TelegramSendResult {
  success: boolean
  messageId?: string | number
  timestamp: string
  latency_ms: number
  rawResponse?: any
  error?: string
}

export interface TelegramConnectionTestResult {
  success: boolean
  latency_ms: number
  botId?: number
  botUsername?: string
  botFirstName?: string
  canJoinGroups?: boolean
  canReadMessages?: boolean
  message: string
  error?: string
}

export interface ITelegramProvider {
  readonly providerName: TelegramProviderType
  testConnection(): Promise<TelegramConnectionTestResult>
  sendMessage(payload: TelegramSendMessagePayload): Promise<TelegramSendResult>
  sendDocument(payload: TelegramSendDocumentPayload): Promise<TelegramSendResult>
  setWebhook?(webhookUrl: string, secretToken?: string): Promise<{ success: boolean; message: string }>
}
