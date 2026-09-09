// ==============================================================================
// PrintERP SaaS - Amazon SES Provider Adapter
// High-throughput delivery via Amazon Simple Email Service (SES) with region config.
// ==============================================================================

import nodemailer, { type Transporter } from 'nodemailer'
import type {
  IEmailProvider,
  OutgoingEmailPayload,
  ProviderSendResult,
  ProviderConnectionResult,
  DecryptedGatewayConfig,
} from '../types.ts'

export class SesProviderAdapter implements IEmailProvider {
  readonly providerName = 'ses' as const
  private config: DecryptedGatewayConfig
  private transporter: Transporter | null = null

  constructor(config: DecryptedGatewayConfig) {
    this.config = config
    this.initializeTransporter()
  }

  private initializeTransporter(): void {
    const region = this.config.extra_settings?.aws_region || 'ap-south-1'
    const host = this.config.smtp_host || `email-smtp.${region}.amazonaws.com`
    const port = Number(this.config.smtp_port) || 587

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth:
        this.config.smtp_username && this.config.decrypted_secret
          ? {
              user: this.config.smtp_username,
              pass: this.config.decrypted_secret,
            }
          : undefined,
      connectionTimeout: 15000,
      socketTimeout: 20000,
    })
  }

  async sendEmail(payload: OutgoingEmailPayload): Promise<ProviderSendResult> {
    if (!this.transporter) {
      this.initializeTransporter()
    }

    try {
      const fromAddress =
        typeof payload.from === 'string'
          ? payload.from
          : payload.from.name
          ? `"${payload.from.name}" <${payload.from.address}>`
          : payload.from.address

      const headers: Record<string, string> = { ...payload.headers }
      if (this.config.extra_settings?.ses_config_set) {
        headers['X-SES-CONFIGURATION-SET'] = this.config.extra_settings.ses_config_set
      }

      const info = await this.transporter!.sendMail({
        from: fromAddress,
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        replyTo: payload.replyTo || this.config.reply_to_email || undefined,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        headers,
        attachments: payload.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          contentType: att.contentType,
        })),
      })

      return {
        success: true,
        messageId: info.messageId || `ses-${Date.now()}`,
        provider: 'ses',
        timestamp: new Date().toISOString(),
        rawResponse: info,
      }
    } catch (error: any) {
      console.error('[SesAdapter] Send error:', error)
      return {
        success: false,
        provider: 'ses',
        timestamp: new Date().toISOString(),
        error: error?.message || 'Amazon SES delivery failure',
        rawResponse: error,
      }
    }
  }

  async verifyConnection(): Promise<ProviderConnectionResult> {
    const startTime = Date.now()
    if (!this.transporter) {
      this.initializeTransporter()
    }

    try {
      await this.transporter!.verify()
      const latencyMs = Date.now() - startTime
      const region = this.config.extra_settings?.aws_region || 'ap-south-1'

      return {
        success: true,
        provider: 'ses',
        latencyMs,
        message: `Amazon SES connection verified in region ${region} (${latencyMs}ms)`,
      }
    } catch (error: any) {
      const latencyMs = Date.now() - startTime
      return {
        success: false,
        provider: 'ses',
        latencyMs,
        message: error?.message || 'Amazon SES authentication failed',
        error: error?.message,
      }
    }
  }
}
