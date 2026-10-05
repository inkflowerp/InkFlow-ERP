// ==============================================================================
// PrintFlow SaaS - OpenWA WhatsApp Provider Adapter
// Implements IWhatsAppProvider for OpenWA Multi-Tenant API Gateway
// ==============================================================================

import type {
  IWhatsAppProvider,
  WhatsAppSendTextPayload,
  WhatsAppSendTemplatePayload,
  WhatsAppSendDocumentPayload,
  WhatsAppSendMediaPayload,
  WhatsAppSendBulkPayload,
  WhatsAppSendResult,
  WhatsAppConnectionTestResult,
  WhatsAppSessionDetails,
} from '../types.ts'
import { OpenWAClient, OpenWAError, openWAClient } from '../../integrations/openwa/client.ts'
import { normalizeBdPhoneNumber } from '../../gateway/phone-utils.ts'

export interface OpenWAAdapterConfig {
  baseUrl?: string
  apiKey?: string
  webhookSecret?: string
  defaultSessionId?: string
}

export class OpenWAAdapter implements IWhatsAppProvider {
  readonly providerName = 'openwa' as const
  private client: OpenWAClient
  private defaultSessionId?: string

  constructor(config?: OpenWAAdapterConfig) {
    if (
      config &&
      (config.baseUrl !== undefined ||
        config.apiKey !== undefined ||
        config.webhookSecret !== undefined)
    ) {
      this.client = new OpenWAClient({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        webhookSecret: config.webhookSecret,
      })
    } else {
      this.client = openWAClient
    }
    this.defaultSessionId = config?.defaultSessionId
  }

  /**
   * Helper: Resolves and formats a destination into a valid WhatsApp JID (phone@c.us)
   */
  private formatJid(phone: string): { jid: string; cleanDigits: string; isValid: boolean; error?: string } {
    if (!phone) {
      return { jid: '', cleanDigits: '', isValid: false, error: 'Recipient phone number is required.' }
    }

    // If already in JID format
    if (phone.includes('@c.us') || phone.includes('@g.us')) {
      const cleanDigits = phone.split('@')[0]
      return { jid: phone, cleanDigits, isValid: true }
    }

    const { isValid, formatted, error } = normalizeBdPhoneNumber(phone, false)
    if (!isValid) {
      return { jid: '', cleanDigits: phone, isValid: false, error: error || 'Invalid mobile phone number format.' }
    }

    return {
      jid: `${formatted}@c.us`,
      cleanDigits: formatted,
      isValid: true,
    }
  }

  async testConnection(sessionId?: string): Promise<WhatsAppConnectionTestResult> {
    const start = Date.now()
    const targetSession = sessionId || this.defaultSessionId

    if (!this.client.configured) {
      return {
        success: false,
        latency_ms: 0,
        message: 'OpenWA Gateway is not configured. Missing OPENWA_BASE_URL.',
        error: 'Missing base URL',
      }
    }

    try {
      if (targetSession) {
        try {
          const session = await this.client.getSession(targetSession)
          const latency_ms = Date.now() - start
          const isReady = session.status === 'ready'

          return {
            success: isReady,
            latency_ms,
            sessionId: session.id,
            status: session.status,
            phone: session.phone,
            pushName: session.pushName,
            displayPhoneNumber: session.phone || undefined,
            verifiedName: session.pushName || undefined,
            message: isReady
              ? `WhatsApp connected: ${session.phone || targetSession} (${session.pushName || 'Active Session'})`
              : `WhatsApp session '${targetSession}' is currently in '${session.status}' state.`,
            error: session.lastError || (isReady ? undefined : `Status: ${session.status}`),
          }
        } catch {
          // If the specific session doesn't exist yet, verify if the OpenWA server is reachable
          const overview = await this.client.getStatsOverview()
          const latency_ms = Date.now() - start
          return {
            success: true,
            latency_ms,
            sessionId: targetSession,
            status: 'uninitialized',
            message: `OpenWA server is online and verified (${latency_ms} ms). Session '${targetSession}' is not yet initialized or logged in.`,
          }
        }
      }

      // If no specific session provided, check overall gateway health
      const overview = await this.client.getStatsOverview()
      const latency_ms = Date.now() - start
      return {
        success: true,
        latency_ms,
        message: `OpenWA Gateway is online. Active sessions: ${overview.activeSessions ?? overview.totalSessions ?? 'OK'}.`,
      }
    } catch (err: any) {
      return {
        success: false,
        latency_ms: Date.now() - start,
        message: 'Failed to reach OpenWA gateway server.',
        error: err?.message || 'Connection error',
      }
    }
  }

  async createSession(
    name: string,
    config?: Record<string, any>
  ): Promise<{ sessionId: string; status: string; id?: string }> {
    const res = await this.client.createSession(name, config)
    return {
      sessionId: res.name || res.id,
      id: res.id,
      status: res.status,
    }
  }

  async startSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await this.client.startSession(sessionId)
      return { success: true, message: res.message || 'Session started' }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to start session' }
    }
  }

  async stopSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await this.client.stopSession(sessionId)
      return { success: true, message: res.message || 'Session stopped' }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to stop session' }
    }
  }

  async logoutSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await this.client.logoutSession(sessionId)
      return { success: true, message: res.message || 'Session logged out' }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to logout session' }
    }
  }

  async deleteSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await this.client.deleteSession(sessionId)
      return { success: true, message: res.message || 'Session deleted' }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to delete session' }
    }
  }

  async getQrCode(sessionId: string): Promise<{ qrCode: string; status: string }> {
    const res = await this.client.getQRCode(sessionId)
    return {
      qrCode: res.qrCode,
      status: res.status,
    }
  }

  async getSessionStatus(sessionId: string): Promise<WhatsAppSessionDetails> {
    const res = await this.client.getSession(sessionId)
    return {
      id: res.id,
      name: res.name,
      status: res.status,
      phone: res.phone,
      pushName: res.pushName,
      connectedAt: res.connectedAt,
      lastActive: res.lastActive,
      lastError: res.lastError,
      engineLoaded: res.engineLoaded,
    }
  }

  validateCredentials(): { valid: boolean; error?: string } {
    return this.client.validateCredentials()
  }

  async checkNumberExists(sessionId: string, phone: string): Promise<{ exists: boolean; jid?: string }> {
    const { cleanDigits, isValid } = this.formatJid(phone)
    if (!isValid || !cleanDigits) {
      return { exists: false, jid: undefined }
    }
    try {
      const res = await this.client.checkNumber(sessionId, cleanDigits)
      return {
        exists: Boolean(res.exists),
        jid: res.jid,
      }
    } catch {
      return {
        exists: false,
        jid: undefined,
      }
    }
  }

  async registerWebhook(
    sessionId: string,
    webhookUrl: string,
    secret: string,
    events?: string[]
  ): Promise<{ webhookId: string }> {
    const res = await this.client.registerWebhook(sessionId, webhookUrl, secret, events)
    return {
      webhookId: res.id,
    }
  }

  async sendTextMessage(
    payload: WhatsAppSendTextPayload,
    sessionId?: string
  ): Promise<WhatsAppSendResult> {
    const start = Date.now()
    const targetSession = sessionId || this.defaultSessionId

    if (!targetSession) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: 'No target WhatsApp session provided.',
        errorCode: 'SESSION_REQUIRED',
      }
    }

    const { jid, isValid, error: phoneErr } = this.formatJid(payload.to)
    if (!isValid) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: phoneErr || 'Invalid destination phone number for WhatsApp.',
        errorCode: 'INVALID_RECIPIENT',
      }
    }

    try {
      const res = await this.client.sendText(targetSession, {
        chatId: jid,
        text: payload.text,
        quotedMessageId: payload.quotedMessageId,
        linkPreview: payload.previewUrl,
      })

      return {
        success: true,
        messageId: res.messageId,
        timestamp: new Date(res.timestamp * 1000).toISOString(),
        latency_ms: Date.now() - start,
        rawResponse: res,
      }
    } catch (err: any) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: err?.message || 'Failed to dispatch WhatsApp text message.',
        errorCode: err?.code || (err instanceof OpenWAError ? `HTTP_${err.statusCode}` : 'SEND_ERROR'),
        rawResponse: err?.rawResponse,
      }
    }
  }

  async sendDocumentMessage(
    payload: WhatsAppSendDocumentPayload,
    sessionId?: string
  ): Promise<WhatsAppSendResult> {
    const start = Date.now()
    const targetSession = sessionId || this.defaultSessionId

    if (!targetSession) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: 'No target WhatsApp session provided.',
        errorCode: 'SESSION_REQUIRED',
      }
    }

    const { jid, isValid, error: phoneErr } = this.formatJid(payload.to)
    if (!isValid) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: phoneErr || 'Invalid destination phone number for WhatsApp.',
        errorCode: 'INVALID_RECIPIENT',
      }
    }

    try {
      const res = await this.client.sendDocument(targetSession, {
        chatId: jid,
        url: payload.documentUrl,
        base64: payload.base64,
        filename: payload.filename || 'document.pdf',
        mimetype: payload.mimetype || 'application/pdf',
        caption: payload.caption,
        quotedMessageId: payload.quotedMessageId,
      })

      return {
        success: true,
        messageId: res.messageId,
        timestamp: new Date(res.timestamp * 1000).toISOString(),
        latency_ms: Date.now() - start,
        rawResponse: res,
      }
    } catch (err: any) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: err?.message || 'Failed to dispatch WhatsApp document message.',
        errorCode: err?.code || (err instanceof OpenWAError ? `HTTP_${err.statusCode}` : 'DOCUMENT_SEND_ERROR'),
        rawResponse: err?.rawResponse,
      }
    }
  }

  async sendMediaMessage(
    payload: WhatsAppSendMediaPayload,
    sessionId?: string
  ): Promise<WhatsAppSendResult> {
    const start = Date.now()
    const targetSession = sessionId || this.defaultSessionId

    if (!targetSession) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: 'No target WhatsApp session provided.',
        errorCode: 'SESSION_REQUIRED',
      }
    }

    const { jid, isValid, error: phoneErr } = this.formatJid(payload.to)
    if (!isValid) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: phoneErr || 'Invalid destination phone number for WhatsApp.',
        errorCode: 'INVALID_RECIPIENT',
      }
    }

    try {
      const res = await this.client.sendImage(targetSession, {
        chatId: jid,
        url: payload.mediaUrl,
        base64: payload.base64,
        mimetype: payload.mimetype,
        caption: payload.caption,
        quotedMessageId: payload.quotedMessageId,
      })

      return {
        success: true,
        messageId: res.messageId,
        timestamp: new Date(res.timestamp * 1000).toISOString(),
        latency_ms: Date.now() - start,
        rawResponse: res,
      }
    } catch (err: any) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: err?.message || 'Failed to dispatch WhatsApp media message.',
        errorCode: err?.code || (err instanceof OpenWAError ? `HTTP_${err.statusCode}` : 'MEDIA_SEND_ERROR'),
        rawResponse: err?.rawResponse,
      }
    }
  }

  async sendTemplateMessage(
    payload: WhatsAppSendTemplatePayload,
    sessionId?: string
  ): Promise<WhatsAppSendResult> {
    // OpenWA sends rendered template text directly via sendTextMessage
    let text = payload.templateName
    if (payload.variables) {
      for (const [k, v] of Object.entries(payload.variables)) {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
      }
    }
    return this.sendTextMessage(
      {
        to: payload.to,
        text,
      },
      sessionId
    )
  }

  async sendBulk(
    sessionId: string,
    payload: WhatsAppSendBulkPayload
  ): Promise<{ success: boolean; batchId?: string; count?: number; error?: string }> {
    try {
      const messages = payload.messages.map((m) => {
        const { jid } = this.formatJid(m.chatId)
        return {
          chatId: jid,
          text: m.text,
        }
      })

      const res = await this.client.sendBulk(sessionId, messages)
      return {
        success: true,
        batchId: res.batchId,
        count: res.totalMessages,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to dispatch bulk messages',
      }
    }
  }
}
