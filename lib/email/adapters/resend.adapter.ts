// ==============================================================================
// PrintERP SaaS - Resend Provider Adapter (REST API)
// Integrates with Resend Cloud Delivery API.
// ==============================================================================

import type {
  IEmailProvider,
  OutgoingEmailPayload,
  ProviderSendResult,
  ProviderConnectionResult,
  DecryptedGatewayConfig,
} from '../types.ts'

export class ResendProviderAdapter implements IEmailProvider {
  readonly providerName = 'resend' as const
  private config: DecryptedGatewayConfig
  private apiKey: string

  constructor(config: DecryptedGatewayConfig) {
    this.config = config
    this.apiKey =
      config.decrypted_secret ||
      config.extra_settings?.api_key ||
      process.env.RESEND_API_KEY ||
      ''
  }

  async sendEmail(payload: OutgoingEmailPayload): Promise<ProviderSendResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: 'resend',
        timestamp: new Date().toISOString(),
        error: 'Resend API Key is missing or invalid',
      }
    }

    try {
      const fromAddress =
        typeof payload.from === 'string'
          ? payload.from
          : payload.from.name
          ? `${payload.from.name} <${payload.from.address}>`
          : payload.from.address

      const body: Record<string, any> = {
        from: fromAddress,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }

      if (payload.replyTo || this.config.reply_to_email) {
        body.reply_to = payload.replyTo || this.config.reply_to_email
      }
      if (payload.cc) {
        body.cc = Array.isArray(payload.cc) ? payload.cc : [payload.cc]
      }
      if (payload.bcc) {
        body.bcc = Array.isArray(payload.bcc) ? payload.bcc : [payload.bcc]
      }
      if (payload.attachments && payload.attachments.length > 0) {
        body.attachments = payload.attachments.map((att) => ({
          filename: att.filename,
          content: typeof att.content === 'string' ? att.content : undefined,
          path: att.path,
        }))
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          provider: 'resend',
          timestamp: new Date().toISOString(),
          error: data.message || `Resend API error (${response.status})`,
          rawResponse: data,
        }
      }

      return {
        success: true,
        messageId: data.id || `resend-${Date.now()}`,
        provider: 'resend',
        timestamp: new Date().toISOString(),
        rawResponse: data,
      }
    } catch (error: any) {
      console.error('[ResendAdapter] Send error:', error)
      return {
        success: false,
        provider: 'resend',
        timestamp: new Date().toISOString(),
        error: error?.message || 'Network error connecting to Resend API',
      }
    }
  }

  async verifyConnection(): Promise<ProviderConnectionResult> {
    const startTime = Date.now()
    if (!this.apiKey) {
      return {
        success: false,
        provider: 'resend',
        latencyMs: 0,
        message: 'Resend API Key is empty',
        error: 'Missing API Key',
      }
    }

    try {
      const response = await fetch('https://api.resend.com/api-keys', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      const latencyMs = Date.now() - startTime

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          provider: 'resend',
          latencyMs,
          message: errorData.message || `Resend authentication failed (${response.status})`,
          error: errorData.message || 'Authentication error',
        }
      }

      return {
        success: true,
        provider: 'resend',
        latencyMs,
        message: `Resend API key verified successfully (${latencyMs}ms)`,
      }
    } catch (error: any) {
      const latencyMs = Date.now() - startTime
      return {
        success: false,
        provider: 'resend',
        latencyMs,
        message: error?.message || 'Failed to reach Resend API endpoint',
        error: error?.message,
      }
    }
  }
}
