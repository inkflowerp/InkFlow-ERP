// ==============================================================================
// PrintERP SaaS - Meta WhatsApp Cloud API Adapter (Official Meta Graph API)
// Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
// ==============================================================================

import type {
  IWhatsAppProvider,
  WhatsAppSendTextPayload,
  WhatsAppSendTemplatePayload,
  WhatsAppSendDocumentPayload,
  WhatsAppSendResult,
  WhatsAppConnectionTestResult,
} from '../types.ts'
import { normalizeBdPhoneNumber } from '../../gateway/phone-utils.ts'

export interface MetaWhatsAppConfig {
  accessToken: string // Permanent System User Token
  phoneNumberId: string // Registered Meta Business Phone Number ID
  businessAccountId?: string // WABA ID
  apiVersion?: string // Default: 'v20.0'
}

export class MetaWhatsAppAdapter implements IWhatsAppProvider {
  readonly providerName = 'meta_whatsapp' as const
  private accessToken: string
  private phoneNumberId: string
  private businessAccountId?: string
  private apiVersion: string

  constructor(config: MetaWhatsAppConfig) {
    this.accessToken = config.accessToken || ''
    this.phoneNumberId = config.phoneNumberId || ''
    this.businessAccountId = config.businessAccountId
    this.apiVersion = config.apiVersion || 'v20.0'
  }

  private getBaseUrl(): string {
    return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`
  }

  async testConnection(): Promise<WhatsAppConnectionTestResult> {
    const start = Date.now()
    if (!this.accessToken || !this.phoneNumberId) {
      return {
        success: false,
        latency_ms: 0,
        message: 'Meta WhatsApp Permanent Access Token and Phone Number ID are required.',
        error: 'Incomplete credentials',
      }
    }

    try {
      const url = `${this.getBaseUrl()}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'PrintERP-SaaS/1.0',
        },
        signal: AbortSignal.timeout(10000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!res.ok || json?.error) {
        return {
          success: false,
          latency_ms,
          message: 'Meta WhatsApp Graph API authorization failed.',
          error: json?.error?.message || `HTTP ${res.status}: ${res.statusText}`,
        }
      }

      return {
        success: true,
        latency_ms,
        phoneNumberId: this.phoneNumberId,
        displayPhoneNumber: json.display_phone_number,
        verifiedName: json.verified_name,
        qualityRating: json.quality_rating,
        codeVerificationStatus: json.code_verification_status,
        message: `WhatsApp Business connected. Number: ${json.display_phone_number || this.phoneNumberId} (${json.verified_name || 'Verified Business'})`,
      }
    } catch (err: any) {
      return {
        success: false,
        latency_ms: Date.now() - start,
        message: 'Unable to reach Meta Graph API servers.',
        error: err?.message || 'Connection timeout',
      }
    }
  }

  async sendTextMessage(payload: WhatsAppSendTextPayload): Promise<WhatsAppSendResult> {
    const start = Date.now()
    const { isValid, formatted, error: phoneErr } = normalizeBdPhoneNumber(payload.to)

    if (!isValid) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: phoneErr || 'Invalid destination phone number for WhatsApp.',
      }
    }

    if (!this.accessToken || !this.phoneNumberId) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: 'Meta WhatsApp credentials missing.',
      }
    }

    try {
      const url = `${this.getBaseUrl()}/messages`
      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatted,
        type: 'text',
        text: {
          preview_url: Boolean(payload.previewUrl),
          body: payload.text,
        },
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!res.ok || json?.error) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          latency_ms,
          rawResponse: json,
          error: json?.error?.message || `Meta API Error (${res.status})`,
        }
      }

      const messageId = json.messages?.[0]?.id || `WA-${Date.now()}`
      return {
        success: true,
        messageId,
        timestamp: new Date().toISOString(),
        latency_ms,
        rawResponse: json,
      }
    } catch (err: any) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: err?.message || 'Network error during WhatsApp message dispatch',
      }
    }
  }

  async sendTemplateMessage(payload: WhatsAppSendTemplatePayload): Promise<WhatsAppSendResult> {
    const start = Date.now()
    const { isValid, formatted, error: phoneErr } = normalizeBdPhoneNumber(payload.to)

    if (!isValid) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: phoneErr,
      }
    }

    try {
      const url = `${this.getBaseUrl()}/messages`
      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatted,
        type: 'template',
        template: {
          name: payload.templateName,
          language: {
            code: payload.languageCode || 'en_US',
          },
          components: payload.components || [],
        },
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!res.ok || json?.error) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          latency_ms,
          rawResponse: json,
          error: json?.error?.message || 'WhatsApp template message rejected',
        }
      }

      return {
        success: true,
        messageId: json.messages?.[0]?.id,
        timestamp: new Date().toISOString(),
        latency_ms,
        rawResponse: json,
      }
    } catch (err: any) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: err?.message,
      }
    }
  }

  async sendDocumentMessage(payload: WhatsAppSendDocumentPayload): Promise<WhatsAppSendResult> {
    const start = Date.now()
    const { isValid, formatted, error: phoneErr } = normalizeBdPhoneNumber(payload.to)

    if (!isValid) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: phoneErr,
      }
    }

    try {
      const url = `${this.getBaseUrl()}/messages`
      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatted,
        type: 'document',
        document: {
          link: payload.documentUrl,
          filename: payload.filename,
          caption: payload.caption,
        },
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!res.ok || json?.error) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          latency_ms,
          rawResponse: json,
          error: json?.error?.message || 'Failed to dispatch WhatsApp PDF document',
        }
      }

      return {
        success: true,
        messageId: json.messages?.[0]?.id,
        timestamp: new Date().toISOString(),
        latency_ms,
        rawResponse: json,
      }
    } catch (err: any) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: err?.message,
      }
    }
  }
}
