// ==============================================================================
// PrintERP SaaS - BulkSMSBD Gateway Adapter (Bangladeshi SMS Service)
// Official API Endpoint: http://bulksmsbd.net/api/smsapi
// ==============================================================================

import type {
  ISmsProvider,
  OutgoingSmsPayload,
  SmsProviderSendResult,
  SmsConnectionTestResult,
  SmsProviderBalanceResult,
} from '../types.ts'
import { normalizeBdPhoneNumber } from '../../gateway/phone-utils.ts'

export interface BulkSmsBdConfig {
  apiKey: string
  senderId?: string
  baseUrl?: string
}

export class BulkSmsBdAdapter implements ISmsProvider {
  readonly providerName = 'bulksmsbd' as const
  private apiKey: string
  private senderId?: string
  private baseUrl: string

  constructor(config: BulkSmsBdConfig) {
    this.apiKey = config.apiKey || ''
    this.senderId = config.senderId
    this.baseUrl = config.baseUrl || 'http://bulksmsbd.net/api/smsapi'
  }

  async testConnection(): Promise<SmsConnectionTestResult> {
    const start = Date.now()
    if (!this.apiKey) {
      return {
        success: false,
        provider: this.providerName,
        latency_ms: 0,
        message: 'BulkSMSBD API Key is missing.',
        error: 'API Key is required.',
      }
    }

    try {
      const balanceUrl = `http://bulksmsbd.net/api/getBalanceApi?api_key=${encodeURIComponent(this.apiKey)}`
      const res = await fetch(balanceUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'PrintERP-SaaS/1.0' },
        signal: AbortSignal.timeout(10000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!json || json.response_code !== 202) {
        return {
          success: false,
          provider: this.providerName,
          latency_ms,
          message: 'BulkSMSBD authentication failed.',
          error: json?.error_message || json?.status || `HTTP ${res.status}`,
        }
      }

      const balance = parseFloat(json.balance || '0')
      return {
        success: true,
        provider: this.providerName,
        latency_ms,
        balance: isNaN(balance) ? undefined : balance,
        currency: 'BDT',
        message: 'BulkSMSBD gateway authorized and ready.',
        details: {
          balance: json.balance,
          senderId: this.senderId || 'Configured Mask',
        },
      }
    } catch (err: any) {
      return {
        success: false,
        provider: this.providerName,
        latency_ms: Date.now() - start,
        message: 'Unable to reach BulkSMSBD server.',
        error: err?.message || 'Connection error',
      }
    }
  }

  async sendSms(payload: OutgoingSmsPayload): Promise<SmsProviderSendResult> {
    const start = Date.now()
    const { isValid, formatted, error: phoneErr } = normalizeBdPhoneNumber(payload.to)

    if (!isValid) {
      return {
        success: false,
        provider: this.providerName,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: phoneErr || 'Invalid Bangladeshi mobile number format.',
      }
    }

    if (!this.apiKey) {
      return {
        success: false,
        provider: this.providerName,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: 'BulkSMSBD API key is not configured.',
      }
    }

    try {
      const params = new URLSearchParams()
      params.append('api_key', this.apiKey)
      params.append('type', 'text')
      params.append('number', formatted)
      params.append('senderid', payload.senderId || this.senderId || '8809612000000')
      params.append('message', payload.message)

      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: AbortSignal.timeout(15000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!json || json.response_code !== 202) {
        return {
          success: false,
          provider: this.providerName,
          timestamp: new Date().toISOString(),
          latency_ms,
          rawResponse: json,
          error: json?.error_message || json?.status || 'BulkSMSBD rejected SMS delivery request.',
        }
      }

      return {
        success: true,
        messageId: String(json.message_id || `BSMS-${Date.now()}`),
        provider: this.providerName,
        timestamp: new Date().toISOString(),
        latency_ms,
        rawResponse: json,
      }
    } catch (err: any) {
      return {
        success: false,
        provider: this.providerName,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: err?.message || 'Network error communicating with BulkSMSBD API',
      }
    }
  }

  async getBalance(): Promise<SmsProviderBalanceResult> {
    try {
      const balanceUrl = `http://bulksmsbd.net/api/getBalanceApi?api_key=${encodeURIComponent(this.apiKey)}`
      const res = await fetch(balanceUrl, { signal: AbortSignal.timeout(8000) })
      const json = await res.json().catch(() => null)
      if (json && json.response_code === 202) {
        const balance = parseFloat(json.balance || '0')
        return {
          success: true,
          balance: isNaN(balance) ? 0 : balance,
          currency: 'BDT',
          rawResponse: json,
        }
      }
      return { success: false, error: json?.error_message || 'Failed to fetch balance' }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' }
    }
  }
}
