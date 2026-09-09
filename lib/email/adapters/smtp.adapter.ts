// ==============================================================================
// PrintERP SaaS - Enterprise SMTP Adapter (Nodemailer)
// Supports SSL, TLS, and STARTTLS with connection verification.
// ==============================================================================

import nodemailer, { type Transporter, type SendMailOptions } from 'nodemailer'
import type {
  IEmailProvider,
  OutgoingEmailPayload,
  ProviderSendResult,
  ProviderConnectionResult,
  DecryptedGatewayConfig,
} from '../types.ts'

export class SmtpProviderAdapter implements IEmailProvider {
  readonly providerName = 'smtp' as const
  private config: DecryptedGatewayConfig
  private transporter: Transporter | null = null

  constructor(config: DecryptedGatewayConfig) {
    this.config = config
    this.initializeTransporter()
  }

  private initializeTransporter(): void {
    const host = this.config.smtp_host || 'localhost'
    const port = Number(this.config.smtp_port) || 587
    const encryption = this.config.encryption_type || 'tls'
    const isSsl = encryption === 'ssl' || port === 465

    const transportOptions: any = {
      host,
      port,
      secure: isSsl, // true for 465, false for other ports
      requireTLS: encryption === 'starttls',
      auth:
        this.config.smtp_username && this.config.decrypted_secret
          ? {
              user: this.config.smtp_username,
              pass: this.config.decrypted_secret,
            }
          : undefined,
      connectionTimeout: 15000, // 15s timeout
      greetingTimeout: 10000,
      socketTimeout: 20000,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    } as any

    this.transporter = nodemailer.createTransport(transportOptions)
  }

  async sendEmail(payload: OutgoingEmailPayload): Promise<ProviderSendResult> {
    const startTime = Date.now()
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

      const mailOptions: SendMailOptions = {
        from: fromAddress,
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        replyTo: payload.replyTo || this.config.reply_to_email || undefined,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        headers: payload.headers,
        attachments: payload.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          contentType: att.contentType,
          cid: att.cid,
        })),
      }

      const info = await this.transporter!.sendMail(mailOptions)

      return {
        success: true,
        messageId: info.messageId || `smtp-${Date.now()}`,
        provider: 'smtp',
        timestamp: new Date().toISOString(),
        rawResponse: {
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
        },
      }
    } catch (error: any) {
      console.error('[SmtpAdapter] Send error:', error)
      return {
        success: false,
        provider: 'smtp',
        timestamp: new Date().toISOString(),
        error: error?.message || 'SMTP transmission failure',
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

      return {
        success: true,
        provider: 'smtp',
        latencyMs,
        message: `SMTP connection established successfully to ${this.config.smtp_host}:${this.config.smtp_port} (${latencyMs}ms)`,
      }
    } catch (error: any) {
      const latencyMs = Date.now() - startTime
      console.error('[SmtpAdapter] Verify error:', error)
      return {
        success: false,
        provider: 'smtp',
        latencyMs,
        message: error?.message || 'Failed to authenticate or connect to SMTP server',
        error: error?.message || 'SMTP connection verification failed',
      }
    }
  }
}
