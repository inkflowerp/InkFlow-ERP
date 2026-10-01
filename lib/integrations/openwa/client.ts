// ==============================================================================
// PrintERP SaaS - OpenWA Server-Side API Client
// Authoritative API integration with rmyndharis/OpenWA WhatsApp Gateway
// OpenAPI 3.0 specification compliant (OpenWA 0.24.0+)
// ==============================================================================
import crypto from 'node:crypto'

export interface OpenWAClientConfig {
  baseUrl?: string
  apiKey?: string
  webhookSecret?: string
  timeoutMs?: number
}

export interface OpenWASessionDto {
  id: string
  name: string
  status:
    | 'created'
    | 'initializing'
    | 'qr_ready'
    | 'authenticating'
    | 'ready'
    | 'disconnected'
    | 'action_required'
    | 'failed'
  phone?: string | null
  pushName?: string | null
  connectedAt?: string | null
  lastActive?: string | null
  createdAt?: string
  updatedAt?: string
  lastError?: string | null
  engineLoaded?: boolean
}

export interface OpenWAQRCodeDto {
  qrCode: string // Data URL: data:image/png;base64,...
  status: string
}

export interface OpenWAMessageResponseDto {
  messageId: string
  timestamp: number // Unix seconds
}

export interface OpenWAWebhookDto {
  id: string
  sessionId: string
  url: string
  events: string[]
  active: boolean
  retryCount: number
  createdAt: string
  updatedAt: string
}

export interface OpenWASendTextOptions {
  chatId: string // e.g. 88017XXXXXXXX@c.us or groupId@g.us
  text: string
  quotedMessageId?: string
  linkPreview?: boolean
}

export interface OpenWASendDocumentOptions {
  chatId: string
  url?: string
  base64?: string
  filename?: string
  mimetype?: string
  caption?: string
  quotedMessageId?: string
}

export interface OpenWASendMediaOptions {
  chatId: string
  url?: string
  base64?: string
  mimetype: string
  caption?: string
  quotedMessageId?: string
}

export class OpenWAError extends Error {
  readonly statusCode: number
  readonly code?: string
  readonly rawResponse?: any

  constructor(message: string, statusCode: number, code?: string, rawResponse?: any) {
    super(message)
    this.name = 'OpenWAError'
    this.statusCode = statusCode
    this.code = code
    this.rawResponse = rawResponse
  }
}

export class OpenWAClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly webhookSecret: string
  private readonly defaultTimeoutMs: number

  constructor(config?: OpenWAClientConfig) {
    const rawBaseUrl =
      config?.baseUrl !== undefined ? config.baseUrl : (process.env.OPENWA_BASE_URL || '')

    if (!rawBaseUrl || !rawBaseUrl.trim()) {
      this.baseUrl = ''
    } else {
      let trimmed = rawBaseUrl.trim()
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        trimmed = trimmed.includes('localhost') || trimmed.startsWith('127.0.0.1')
          ? `http://${trimmed}`
          : `https://${trimmed}`
      }
      // Normalize: strip trailing slash and ensure /api path
      let normalized = trimmed.replace(/\/+$/, '')
      if (!normalized.endsWith('/api') && !normalized.includes('/api/')) {
        normalized = `${normalized}/api`
      }
      this.baseUrl = normalized
    }

    this.apiKey = config?.apiKey !== undefined ? config.apiKey : (process.env.OPENWA_API_KEY || '')
    this.webhookSecret =
      config?.webhookSecret !== undefined ? config.webhookSecret : (process.env.OPENWA_WEBHOOK_SECRET || '')
    this.defaultTimeoutMs = config?.timeoutMs || 25000
  }

  get configured(): boolean {
    return Boolean(this.baseUrl)
  }

  validateCredentials(): { valid: boolean; error?: string } {
    if (!this.baseUrl) {
      return { valid: false, error: 'OpenWA Base URL is required.' }
    }
    return { valid: true }
  }


  getWebhookSecret(): string {
    return this.webhookSecret
  }

  /**
   * Core HTTP request handler with authentication, timeout, and error parsing
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
      body?: any
      timeoutMs?: number
      headers?: Record<string, string>
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, timeoutMs = this.defaultTimeoutMs, headers = {} } = options

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${this.baseUrl}${cleanEndpoint}`

    const requestHeaders: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'PrintERP-SaaS/1.0',
      ...headers,
    }

    if (this.apiKey) {
      requestHeaders['X-API-Key'] = this.apiKey
      requestHeaders['api-key'] = this.apiKey
      requestHeaders['Authorization'] = this.apiKey.startsWith('Bearer ')
        ? this.apiKey
        : `Bearer ${this.apiKey}`
    }

    if (body && typeof body === 'object') {
      requestHeaders['Content-Type'] = 'application/json'
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        cache: 'no-store',
      })

      clearTimeout(timer)

      // Handle 204 No Content
      if (res.status === 204) {
        return ({} as unknown) as T
      }

      const text = await res.text()
      let json: any = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        json = { rawText: text }
      }

      if (!res.ok) {
        const errorMsg =
          json?.message ||
          json?.error ||
          (Array.isArray(json?.message) ? json.message.join(', ') : null) ||
          `OpenWA HTTP ${res.status}: ${res.statusText}`
        const errorCode = json?.code

        throw new OpenWAError(errorMsg, res.status, errorCode, json)
      }

      return json as T
    } catch (err: any) {
      clearTimeout(timer)
      if (err instanceof OpenWAError) {
        throw err
      }
      if (err.name === 'AbortError') {
        throw new OpenWAError(`OpenWA request timeout after ${timeoutMs}ms`, 504, 'TIMEOUT')
      }
      throw new OpenWAError(
        err?.message || 'Failed to connect to OpenWA gateway',
        500,
        'NETWORK_ERROR',
        err
      )
    }
  }

  // ============================================================================
  // SESSION LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Create a new WhatsApp session
   * POST /api/sessions
   */
  async createSession(
    name: string,
    config?: {
      autoRejectCalls?: boolean
      maxReconnectAttempts?: number
      reconnectBaseDelay?: number
      sessionName?: string
    },
    proxyUrl?: string
  ): Promise<OpenWASessionDto> {
    return this.request<OpenWASessionDto>('/sessions', {
      method: 'POST',
      body: {
        name,
        config: config || {
          autoRejectCalls: false,
          maxReconnectAttempts: 10,
          reconnectBaseDelay: 5000,
        },
        proxyUrl,
      },
    })
  }

  /**
   * Start a session engine
   * POST /api/sessions/:sessionId/start
   */
  async startSession(sessionId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/sessions/${encodeURIComponent(sessionId)}/start`, {
      method: 'POST',
      timeoutMs: 40000, // Session startup can take a few seconds
    })
  }

  /**
   * Stop a session engine
   * POST /api/sessions/:sessionId/stop
   */
  async stopSession(sessionId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/sessions/${encodeURIComponent(sessionId)}/stop`, {
      method: 'POST',
    })
  }

  /**
   * Log out of WhatsApp (unlinks companion device)
   * POST /api/sessions/:sessionId/logout
   */
  async logoutSession(sessionId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/sessions/${encodeURIComponent(sessionId)}/logout`, {
      method: 'POST',
    })
  }

  /**
   * Force kill a wedged engine process
   * POST /api/sessions/:sessionId/force-kill
   */
  async forceKillSession(sessionId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/sessions/${encodeURIComponent(sessionId)}/force-kill`,
      {
        method: 'POST',
      }
    )
  }

  /**
   * Delete a session record
   * DELETE /api/sessions/:sessionId
   */
  async deleteSession(sessionId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    })
  }

  /**
   * Retrieve QR Code for session authentication
   * GET /api/sessions/:sessionId/qr
   */
  async getQRCode(sessionId: string): Promise<OpenWAQRCodeDto> {
    return this.request<OpenWAQRCodeDto>(`/sessions/${encodeURIComponent(sessionId)}/qr`, {
      method: 'GET',
    })
  }

  async getQrCode(sessionId: string): Promise<OpenWAQRCodeDto> {
    return this.getQRCode(sessionId)
  }

  async restartSession(sessionId: string): Promise<{ message: string }> {
    try {
      await this.stopSession(sessionId)
    } catch {}
    return this.startSession(sessionId)
  }

  /**
   * Get session status by ID
   * GET /api/sessions/:sessionId
   */
  async getSession(sessionId: string): Promise<OpenWASessionDto> {
    return this.request<OpenWASessionDto>(`/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
    })
  }

  /**
   * List all sessions on the gateway
   * GET /api/sessions
   */
  async listSessions(): Promise<OpenWASessionDto[]> {
    return this.request<OpenWASessionDto[]>('/sessions', {
      method: 'GET',
    })
  }

  /**
   * Verify if a phone number is registered on WhatsApp
   * GET /api/sessions/:sessionId/contacts/check/:number
   */
  async checkNumber(
    sessionId: string,
    phoneNumber: string
  ): Promise<{ number: string; exists: boolean; jid?: string }> {
    const clean = phoneNumber.replace(/[^0-9]/g, '')
    return this.request<{ number: string; exists: boolean; jid?: string }>(
      `/sessions/${encodeURIComponent(sessionId)}/contacts/check/${clean}`,
      {
        method: 'GET',
      }
    )
  }

  // ============================================================================
  // WEBHOOK SUBSCRIPTIONS
  // ============================================================================

  /**
   * Register a webhook for a session
   * POST /api/sessions/:sessionId/webhooks
   */
  async registerWebhook(
    sessionId: string,
    url: string,
    secret: string,
    events: string[] = [
      'message.received',
      'message.sent',
      'message.ack',
      'message.failed',
      'session.status',
      'session.disconnected',
      'session.qr',
      'session.authenticated',
    ],
    retryCount: number = 3
  ): Promise<OpenWAWebhookDto> {
    return this.request<OpenWAWebhookDto>(
      `/sessions/${encodeURIComponent(sessionId)}/webhooks`,
      {
        method: 'POST',
        body: {
          url,
          events,
          secret,
          retryCount,
        },
      }
    )
  }

  /**
   * List registered webhooks for a session
   * GET /api/sessions/:sessionId/webhooks
   */
  async listWebhooks(sessionId: string): Promise<OpenWAWebhookDto[]> {
    return this.request<OpenWAWebhookDto[]>(
      `/sessions/${encodeURIComponent(sessionId)}/webhooks`,
      {
        method: 'GET',
      }
    )
  }

  /**
   * Delete a webhook
   * DELETE /api/sessions/:sessionId/webhooks/:id
   */
  async deleteWebhook(sessionId: string, webhookId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/sessions/${encodeURIComponent(sessionId)}/webhooks/${encodeURIComponent(webhookId)}`,
      {
        method: 'DELETE',
      }
    )
  }

  // ============================================================================
  // MESSAGE DISPATCH
  // ============================================================================

  /**
   * Send a text message
   * POST /api/sessions/:sessionId/messages/send-text
   */
  async sendText(
    sessionId: string,
    options: OpenWASendTextOptions
  ): Promise<OpenWAMessageResponseDto> {
    return this.request<OpenWAMessageResponseDto>(
      `/sessions/${encodeURIComponent(sessionId)}/messages/send-text`,
      {
        method: 'POST',
        body: {
          chatId: options.chatId,
          text: options.text,
          quotedMessageId: options.quotedMessageId,
          linkPreview: options.linkPreview,
        },
      }
    )
  }

  /**
   * Send a document/file attachment
   * POST /api/sessions/:sessionId/messages/send-document
   */
  async sendDocument(
    sessionId: string,
    options: OpenWASendDocumentOptions
  ): Promise<OpenWAMessageResponseDto> {
    return this.request<OpenWAMessageResponseDto>(
      `/sessions/${encodeURIComponent(sessionId)}/messages/send-document`,
      {
        method: 'POST',
        body: {
          chatId: options.chatId,
          url: options.url,
          base64: options.base64,
          filename: options.filename || 'document.pdf',
          mimetype: options.mimetype || 'application/pdf',
          caption: options.caption,
          quotedMessageId: options.quotedMessageId,
        },
      }
    )
  }

  /**
   * Send an image
   * POST /api/sessions/:sessionId/messages/send-image
   */
  async sendImage(
    sessionId: string,
    options: OpenWASendMediaOptions
  ): Promise<OpenWAMessageResponseDto> {
    return this.request<OpenWAMessageResponseDto>(
      `/sessions/${encodeURIComponent(sessionId)}/messages/send-image`,
      {
        method: 'POST',
        body: {
          chatId: options.chatId,
          url: options.url,
          base64: options.base64,
          mimetype: options.mimetype,
          caption: options.caption,
          quotedMessageId: options.quotedMessageId,
        },
      }
    )
  }

  /**
   * Send batch / bulk messages
   * POST /api/sessions/:sessionId/messages/send-bulk
   */
  async sendBulk(
    sessionId: string,
    messages: Array<{ chatId: string; text: string }>
  ): Promise<{ batchId: string; totalMessages: number }> {
    return this.request<{ batchId: string; totalMessages: number }>(
      `/sessions/${encodeURIComponent(sessionId)}/messages/send-bulk`,
      {
        method: 'POST',
        body: {
          messages,
        },
      }
    )
  }

  /**
   * Retrieve active chats
   * GET /api/sessions/:sessionId/chats
   */
  async getChats(sessionId: string): Promise<any[]> {
    return this.request<any[]>(`/sessions/${encodeURIComponent(sessionId)}/chats`, {
      method: 'GET',
    })
  }

  /**
   * Mark a chat as read
   * POST /api/sessions/:sessionId/chats/read
   */
  async markChatRead(sessionId: string, chatId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/sessions/${encodeURIComponent(sessionId)}/chats/read`,
      {
        method: 'POST',
        body: { chatId },
      }
    )
  }

  // ============================================================================
  // GATEWAY MONITORING & TELEMETRY
  // ============================================================================

  /**
   * Get overall gateway statistics
   * GET /api/stats/overview with fallback to session list
   */
  async getStatsOverview(): Promise<{ activeSessions: number; totalSessions: number; version?: string; [key: string]: any }> {
    try {
      const res = await this.request<any>('/stats/overview', {
        method: 'GET',
      })
      if (res && typeof res === 'object') {
        const active =
          res.activeSessions ??
          (Array.isArray(res.sessions) ? res.sessions.filter((s: any) => s.status === 'ready').length : 0)
        const total =
          res.totalSessions ??
          (Array.isArray(res.sessions) ? res.sessions.length : 0)

        return {
          activeSessions: active,
          totalSessions: total,
          version: res.version,
          ...res,
        }
      }
    } catch {
      // Fallback: reachability via listSessions()
      try {
        const sessions = await this.listSessions()
        const total = Array.isArray(sessions) ? sessions.length : 0
        const active = Array.isArray(sessions)
          ? sessions.filter((s) => s.status === 'ready').length
          : 0
        return { activeSessions: active, totalSessions: total }
      } catch (listErr) {
        throw listErr
      }
    }
    return { activeSessions: 0, totalSessions: 0 }
  }

  /**
   * Get statistics for a specific session
   * GET /api/stats/sessions/:sessionId
   */
  async getSessionStats(sessionId: string): Promise<any> {
    return this.request<any>(`/stats/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
    })
  }

  /**
   * Verifies an incoming webhook request signature using the client's configured secret
   */
  verifyWebhookSignature(rawBody: string, signatureHeader?: string | null): boolean {
    return verifyOpenWAWebhookSignature(rawBody, signatureHeader, this.webhookSecret)
  }
}

/**
 * Validates OpenWA webhook HMAC-SHA256 signature with constant-time equality check
 */
export function verifyOpenWAWebhookSignature(
  rawBody: string,
  signatureHeader?: string | null,
  secret?: string
): boolean {
  if (!signatureHeader || !secret) {
    return false
  }

  try {
    const expectedPrefix = 'sha256='
    const providedHash = signatureHeader.startsWith(expectedPrefix)
      ? signatureHeader.slice(expectedPrefix.length)
      : signatureHeader

    const calculatedHash = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex')

    if (providedHash.length !== calculatedHash.length) {
      return false
    }

    return crypto.timingSafeEqual(
      Buffer.from(providedHash, 'hex'),
      Buffer.from(calculatedHash, 'hex')
    )
  } catch {
    return false
  }
}

// Default singleton instance using environment variables
export const openWAClient = new OpenWAClient()
