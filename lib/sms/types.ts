// ==============================================================================
// PrintERP SaaS - SMS Provider Types & Interface
// ==============================================================================

import type { SmsProviderType, GatewayEnvironment } from '../../types/gateway.types.ts'

export interface OutgoingSmsPayload {
  to: string // recipient mobile number
  message: string // text / unicode content
  senderId?: string // masking / approved sender ID
  metadata?: Record<string, any>
}

export interface SmsProviderSendResult {
  success: boolean
  messageId?: string
  provider: SmsProviderType
  timestamp: string
  latency_ms: number
  rawResponse?: any
  error?: string
}

export interface SmsProviderBalanceResult {
  success: boolean
  balance?: number
  currency?: string
  expiryDate?: string
  rawResponse?: any
  error?: string
}

export interface SmsConnectionTestResult {
  success: boolean
  provider: SmsProviderType
  latency_ms: number
  balance?: number
  currency?: string
  message: string
  details?: Record<string, any>
  error?: string
}

export interface ISmsProvider {
  readonly providerName: SmsProviderType
  testConnection(): Promise<SmsConnectionTestResult>
  sendSms(payload: OutgoingSmsPayload): Promise<SmsProviderSendResult>
  getBalance?(): Promise<SmsProviderBalanceResult>
}
