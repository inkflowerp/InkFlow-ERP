// ==============================================================================
// PrintERP SaaS - SSL Wireless (SSL SMS v3) Gateway Adapter
// Official API Endpoint: https://smsplus.sslwireless.com/api/v3/send-sms
// ==============================================================================

import type {
  ISmsProvider,
  OutgoingSmsPayload,
  SmsProviderSendResult,
  SmsConnectionTestResult,
  SmsProviderBalanceResult,
} from '../types.ts'
import { normalizeBdPhoneNumber } from '../../gateway/phone-utils.ts'

export interface SslWirelessConfig {
  apiToken: string
  sid: string // Stakeholder ID / Approved Masking Name
  baseUrl?: string
}

export class SslWirelessSmsAdapter implements ISmsProvider {
  readonly providerName = 'ssl_wireless' as const
  private apiToken: string
  private sid: string
  private baseUrl: string

  constructor(config: SslWirelessConfig) {
    this.apiToken = config.apiToken || ''
    this.sid = config.sid || ''
    this.baseUrl = config.baseUrl || 'https://smsplus.sslwireless.com/api/v3/send-sms'
  }

  async testConnection(): Promise<SmsConnectionTestResult> {
    const start = Date.now()
    if (!this.apiToken || !this.sid) {
      return {
        success: false,
        provider: this.providerName,
        latency_ms: 0,
        message: 'SSL Wireless API Token and Stakeholder ID (SID) are required.',
        error: 'Credentials incomplete.',
      }
    }

    try {
      const balanceUrl = 'https://smsplus.sslwireless.com/api/v3/balance'
      const res = await fetch(balanceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PrintERP-SaaS/1.0',
        },
        body: JSON.stringify({
          api_token: this.apiToken,
          sid: this.sid,
        }),
        signal: AbortSignal.timeout(10000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!json || json.status_code !== 200 || json.status !== 'SUCCESS') {
        return {
          success: false,
          provider: this.providerName,
          latency_ms,
          message: 'SSL Wireless authentication failed.',
          error: json?.error_message || json?.status || `HTTP ${res.status}`,
        }
      }

      const balance = parseFloat(json.balance || json.amount || '0')
      return {
        success: true,
        provider: this.providerName,
        latency_ms,
        balance: isNaN(balance) ? undefined : balance,
        currency: 'BDT',
        message: 'SSL Wireless SMS Gateway connected and verified.',
        details: {
          sid: this.sid,
          balance: json.balance,
        },
      }
    } catch (err: any) {
      return {
        success: false,
        provider: this.providerName,
        latency_ms: Date.now() - start,
        message: 'SSL Wireless gateway connection failed.',
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

    if (!this.apiToken || !this.sid) {
      return {
        success: false,
        provider: this.providerName,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: 'SSL Wireless API Token or SID is missing.',
      }
    }

    const csmsId = `PRNT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          api_token: this.apiToken,
          sid: payload.senderId || this.sid,
          msisdn: formatted,
          sms: payload.message,
          csms_id: csmsId,
        }),
        signal: AbortSignal.timeout(15000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!json || (json.status_code !== 200 && json.status !== 'SUCCESS')) {
        return {
          success: false,
          provider: this.providerName,
          timestamp: new Date().toISOString(),
          latency_ms,
          rawResponse: json,
          error: json?.error_message || `SSL Wireless delivery rejected (Status: ${json?.status})`,
        }
      }

      return {
        success: true,
        messageId: json.smsinfo?.[0]?.sms_id || csmsId,
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
        error: err?.message || 'Network exception during SSL Wireless dispatch',
      }
    }
  }

  async getBalance(): Promise<SmsProviderBalanceResult> {
    try {
      const res = await fetch('https://smsplus.sslwireless.com/api/v3/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_token: this.apiToken, sid: this.sid }),
        signal: AbortSignal.timeout(8000),
      })
      const json = await res.json().catch(() => null)
      if (json && json.status_code === 200) {
        const balance = parseFloat(json.balance || json.amount || '0')
        return {
          success: true,
          balance: isNaN(balance) ? 0 : balance,
          currency: 'BDT',
          rawResponse: json,
        }
      }
      return { success: false, error: json?.error_message || 'Balance check failed' }
    } catch (err: any) {
      return { success: false, error: err?.message }
    }
  }
}
