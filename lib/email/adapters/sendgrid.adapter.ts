// ==============================================================================
// PrintERP SaaS - SendGrid Provider Adapter (v3 API)
// Integrates with Twilio SendGrid v3 Mail Send API.
// ==============================================================================

import type {
  IEmailProvider,
  OutgoingEmailPayload,
  ProviderSendResult,
  ProviderConnectionResult,
  DecryptedGatewayConfig,
} from '../types.ts'

export class SendGridProviderAdapter implements IEmailProvider {
  readonly providerName = 'sendgrid' as const
  private config: DecryptedGatewayConfig
  private apiKey: string

  constructor(config: DecryptedGatewayConfig) {
    this.config = config
    this.apiKey =
      config.decrypted_secret ||
      config.extra_settings?.api_key ||
      process.env.SENDGRID_API_KEY ||
      ''
  }

  async sendEmail(payload: OutgoingEmailPayload): Promise<ProviderSendResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: 'sendgrid',
        timestamp: new Date().toISOString(),
        error: 'SendGrid API Key is missing or invalid',
      }
    }

    try {
      const fromObj =
        typeof payload.from === 'string'
          ? { email: payload.from }
          : { email: payload.from.address, name: payload.from.name }

      const toList = Array.isArray(payload.to)
        ? payload.to.map((e) => ({ email: e }))
        : [{ email: payload.to }]

      const body: Record<string, any> = {
        personalizations: [
          {
            to: toList,
            subject: payload.subject,
          },
        ],
        from: fromObj,
        content: [
          {
            type: 'text/html',
            value: payload.html,
          },
        ],
      }

      if (payload.text) {
        body.content.unshift({
          type: 'text/plain',
          value: payload.text,
        })
      }

      if (payload.replyTo || this.config.reply_to_email) {
        body.reply_to = { email: payload.replyTo || this.config.reply_to_email }
      }

      if (payload.cc) {
        const ccList = Array.isArray(payload.cc) ? payload.cc : [payload.cc]
        body.personalizations[0].cc = ccList.map((e) => ({ email: e }))
      }

      if (payload.bcc) {
        const bccList = Array.isArray(payload.bcc) ? payload.bcc : [payload.bcc]
        body.personalizations[0].bcc = bccList.map((e) => ({ email: e }))
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.status === 202 || response.status === 200) {
        const messageId = response.headers.get('x-message-id') || `sg-${Date.now()}`
        return {
          success: true,
          messageId,
          provider: 'sendgrid',
          timestamp: new Date().toISOString(),
        }
      }

      const errorText = await response.text()
      return {
        success: false,
        provider: 'sendgrid',
        timestamp: new Date().toISOString(),
        error: `SendGrid error (${response.status}): ${errorText}`,
      }
    } catch (error: any) {
      console.error('[SendGridAdapter] Send error:', error)
      return {
        success: false,
        provider: 'sendgrid',
        timestamp: new Date().toISOString(),
        error: error?.message || 'Network error connecting to SendGrid API',
      }
    }
  }

  async verifyConnection(): Promise<ProviderConnectionResult> {
    const startTime = Date.now()
    if (!this.apiKey) {
      return {
        success: false,
        provider: 'sendgrid',
        latencyMs: 0,
        message: 'SendGrid API Key is empty',
        error: 'Missing API Key',
      }
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      const latencyMs = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          provider: 'sendgrid',
          latencyMs,
          message: `SendGrid authentication failed (${response.status})`,
          error: errorText,
        }
      }

      return {
        success: true,
        provider: 'sendgrid',
        latencyMs,
        message: `SendGrid API credentials authenticated successfully (${latencyMs}ms)`,
      }
    } catch (error: any) {
      const latencyMs = Date.now() - startTime
      return {
        success: false,
        provider: 'sendgrid',
        latencyMs,
        message: error?.message || 'Failed to connect to SendGrid API',
        error: error?.message,
      }
    }
  }
}
