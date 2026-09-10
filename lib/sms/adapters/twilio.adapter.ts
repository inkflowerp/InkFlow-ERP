// ==============================================================================
// PrintERP SaaS - Twilio SMS Gateway Adapter
// Official API Endpoint: https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
// ==============================================================================

import type {
  ISmsProvider,
  OutgoingSmsPayload,
  SmsProviderSendResult,
  SmsConnectionTestResult,
  SmsProviderBalanceResult,
} from '../types.ts'
import { normalizeBdPhoneNumber } from '../../gateway/phone-utils.ts'

export interface TwilioConfig {
  accountSid: string
  authToken: string
  fromNumber?: string // Twilio Phone Number or Alphanumeric Sender ID
}

export class TwilioSmsAdapter implements ISmsProvider {
  readonly providerName = 'twilio' as const
  private accountSid: string
  private authToken: string
  private fromNumber?: string

  constructor(config: TwilioConfig) {
    this.accountSid = config.accountSid || ''
    this.authToken = config.authToken || ''
    this.fromNumber = config.fromNumber
  }

  private getAuthHeader(): string {
    const creds = `${this.accountSid}:${this.authToken}`
    return `Basic ${Buffer.from(creds).toString('base64')}`
  }

  async testConnection(): Promise<SmsConnectionTestResult> {
    const start = Date.now()
    if (!this.accountSid || !this.authToken) {
      return {
        success: false,
        provider: this.providerName,
        latency_ms: 0,
        message: 'Twilio Account SID and Auth Token are required.',
        error: 'Credentials missing',
      }
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}.json`
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
          'User-Agent': 'PrintERP-SaaS/1.0',
        },
        signal: AbortSignal.timeout(10000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!res.ok || json?.status === 401 || json?.code) {
        return {
          success: false,
          provider: this.providerName,
          latency_ms,
          message: 'Twilio authentication failed.',
          error: json?.message || `HTTP ${res.status}`,
        }
      }

      return {
        success: true,
        provider: this.providerName,
        latency_ms,
        message: `Twilio account "${json?.friendly_name || this.accountSid}" connected. Status: ${json?.status || 'active'}.`,
        details: {
          accountSid: this.accountSid,
          accountStatus: json?.status,
          fromNumber: this.fromNumber || 'Not specified',
        },
      }
    } catch (err: any) {
      return {
        success: false,
        provider: this.providerName,
        latency_ms: Date.now() - start,
        message: 'Unable to reach Twilio API server.',
        error: err?.message || 'Connection error',
      }
    }
  }

  async sendSms(payload: OutgoingSmsPayload): Promise<SmsProviderSendResult> {
    const start = Date.now()
    const { isValid, formatted, error: phoneErr } = normalizeBdPhoneNumber(payload.to, true)

    if (!isValid) {
      return {
        success: false,
        provider: this.providerName,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: phoneErr || 'Invalid destination phone number for Twilio.',
      }
    }

    if (!this.accountSid || !this.authToken) {
      return {
        success: false,
        provider: this.providerName,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: 'Twilio credentials not configured.',
      }
    }

    const from = payload.senderId || this.fromNumber
    if (!from) {
      return {
        success: false,
        provider: this.providerName,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: 'Twilio sender number (From) is required.',
      }
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`
      const params = new URLSearchParams()
      params.append('To', formatted)
      params.append('From', from)
      params.append('Body', payload.message)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: AbortSignal.timeout(15000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!res.ok || json?.error_code || json?.error_message) {
        return {
          success: false,
          provider: this.providerName,
          timestamp: new Date().toISOString(),
          latency_ms,
          rawResponse: json,
          error: json?.message || json?.error_message || `Twilio error code ${json?.code}`,
        }
      }

      return {
        success: true,
        messageId: json.sid,
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
        error: err?.message || 'Twilio transmission failed',
      }
    }
  }

  async getBalance(): Promise<SmsProviderBalanceResult> {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Balance.json`
      const res = await fetch(url, {
        headers: { Authorization: this.getAuthHeader() },
        signal: AbortSignal.timeout(8000),
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.balance) {
        return {
          success: true,
          balance: parseFloat(json.balance),
          currency: json.currency || 'USD',
          rawResponse: json,
        }
      }
      return { success: false, error: json?.message || 'Failed to fetch Twilio balance' }
    } catch (err: any) {
      return { success: false, error: err?.message }
    }
  }
}
