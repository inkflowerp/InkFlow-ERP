// ==============================================================================
// PrintERP SaaS - Greenweb SMS Gateway Adapter (Bangladesh Carrier Routing)
// Official API Endpoint: https://api.greenweb.com.bd/api.php
// ==============================================================================

import type {
  ISmsProvider,
  OutgoingSmsPayload,
  SmsProviderSendResult,
  SmsConnectionTestResult,
  SmsProviderBalanceResult,
} from '../types.ts'
import { normalizeBdPhoneNumber } from '../../gateway/phone-utils.ts'

export interface GreenwebConfig {
  token: string
  senderId?: string
  baseUrl?: string
}

export class GreenwebSmsAdapter implements ISmsProvider {
  readonly providerName = 'greenweb' as const
  private token: string
  private senderId?: string
  private baseUrl: string

  constructor(config: GreenwebConfig) {
    this.token = config.token || ''
    this.senderId = config.senderId
    this.baseUrl = config.baseUrl || 'https://api.greenweb.com.bd/api.php'
  }

  async testConnection(): Promise<SmsConnectionTestResult> {
    const start = Date.now()
    if (!this.token) {
      return {
        success: false,
        provider: this.providerName,
        latency_ms: 0,
        message: 'Greenweb API Token is missing.',
        error: 'Authentication credentials not provided.',
      }
    }

    try {
      // Query balance as live handshake check
      const balanceUrl = `https://api.greenweb.com.bd/gapi.php?token=${encodeURIComponent(this.token)}&balance`
      const res = await fetch(balanceUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'PrintERP-SaaS/1.0' },
        signal: AbortSignal.timeout(10000),
      })

      const latency_ms = Date.now() - start
      const text = (await res.text()).trim()

      if (!res.ok || text.includes('INVALID_TOKEN') || text.includes('Access Denied')) {
        return {
          success: false,
          provider: this.providerName,
          latency_ms,
          message: 'Greenweb authentication failed. Invalid API token.',
          error: text || `HTTP ${res.status}`,
        }
      }

      // Balance parsing
      const balanceNum = parseFloat(text.replace(/[^0-9.]/g, ''))
      return {
        success: true,
        provider: this.providerName,
        latency_ms,
        balance: isNaN(balanceNum) ? undefined : balanceNum,
        currency: 'BDT',
        message: 'Greenweb SMS Gateway connected and authorized.',
        details: {
          rawBalanceResponse: text,
          senderId: this.senderId || 'Non-masking (Standard)',
        },
      }
    } catch (err: any) {
      return {
        success: false,
        provider: this.providerName,
        latency_ms: Date.now() - start,
        message: 'Failed to reach Greenweb SMS Gateway servers.',
        error: err?.message || 'Network timeout',
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
        error: phoneErr || 'Invalid Bangladeshi recipient number',
      }
    }

    if (!this.token) {
      return {
        success: false,
        provider: this.providerName,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: 'Greenweb API token is not configured.',
      }
    }

    try {
      const params = new URLSearchParams()
      params.append('token', this.token)
      params.append('to', formatted)
      params.append('message', payload.message)
      if (payload.senderId || this.senderId) {
        params.append('senderid', (payload.senderId || this.senderId)!)
      }

      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: AbortSignal.timeout(15000),
      })

      const latency_ms = Date.now() - start
      const responseText = await res.text()

      // Greenweb responses: "Ok: SMS Sent Successfully..." or "Error: ..."
      const isSuccess =
        res.ok &&
        (responseText.toLowerCase().includes('ok') ||
          responseText.toLowerCase().includes('success') ||
          responseText.toLowerCase().includes('sent')) &&
        !responseText.toLowerCase().includes('error') &&
        !responseText.toLowerCase().includes('invalid')

      if (!isSuccess) {
        return {
          success: false,
          provider: this.providerName,
          timestamp: new Date().toISOString(),
          latency_ms,
          rawResponse: responseText,
          error: `Greenweb delivery rejected: ${responseText}`,
        }
      }

      // Extract message ID or transaction reference if provided
      const matchId = responseText.match(/ID[:\s]+([A-Za-z0-9_\-]+)/i)
      const messageId = matchId ? matchId[1] : `GW-${Date.now()}`

      return {
        success: true,
        messageId,
        provider: this.providerName,
        timestamp: new Date().toISOString(),
        latency_ms,
        rawResponse: responseText,
      }
    } catch (err: any) {
      return {
        success: false,
        provider: this.providerName,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: err?.message || 'Network exception during SMS transmission',
      }
    }
  }

  async getBalance(): Promise<SmsProviderBalanceResult> {
    try {
      const balanceUrl = `https://api.greenweb.com.bd/gapi.php?token=${encodeURIComponent(this.token)}&balance`
      const res = await fetch(balanceUrl, { signal: AbortSignal.timeout(8000) })
      const text = (await res.text()).trim()
      const balanceNum = parseFloat(text.replace(/[^0-9.]/g, ''))
      return {
        success: !isNaN(balanceNum),
        balance: isNaN(balanceNum) ? 0 : balanceNum,
        currency: 'BDT',
        rawResponse: text,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to fetch Greenweb balance',
      }
    }
  }
}
