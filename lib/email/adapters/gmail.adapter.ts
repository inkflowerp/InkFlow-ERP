// ==============================================================================
// PrintERP SaaS - Enterprise Gmail API Adapter (Google OAuth 2.0)
// Uses Google's Gmail REST API v1 (`users/me/messages/send`) with MIME RFC 2822 formatting
// and automatic OAuth access token refresh with single-retry capability.
// ==============================================================================

import type {
  IEmailProvider,
  OutgoingEmailPayload,
  ProviderSendResult,
  ProviderConnectionResult,
  DecryptedGatewayConfig,
  EmailAttachment,
} from '../types.ts'
import { refreshGoogleAccessToken } from '../oauth/google-oauth.ts'
import { isTestEnvironment } from '../../security/runtime-env.ts'

export class GmailProviderAdapter implements IEmailProvider {
  readonly providerName = 'gmail' as const
  private config: DecryptedGatewayConfig
  private accessToken: string
  private refreshToken?: string
  private tokenExpiresAt?: number

  constructor(config: DecryptedGatewayConfig) {
    this.config = config
    this.accessToken = ''
    this.extractTokens()
  }

  /**
   * Extracts access token, refresh token, and expiry timestamp from decrypted configuration
   */
  private extractTokens(): void {
    if (this.config.decrypted_secret) {
      try {
        const parsed = JSON.parse(this.config.decrypted_secret)
        if (typeof parsed === 'object' && parsed !== null) {
          this.accessToken = parsed.access_token || ''
          this.refreshToken = parsed.refresh_token || this.config.extra_settings?.refresh_token
        } else {
          this.accessToken = this.config.decrypted_secret
        }
      } catch {
        this.accessToken = this.config.decrypted_secret
      }
    }

    if (!this.accessToken && this.config.extra_settings?.access_token) {
      this.accessToken = this.config.extra_settings.access_token
    }
    if (!this.refreshToken && this.config.extra_settings?.refresh_token) {
      this.refreshToken = this.config.extra_settings.refresh_token
    }

    if (this.config.token_expires_at) {
      this.tokenExpiresAt = new Date(this.config.token_expires_at).getTime()
    }
  }

  /**
   * Checks whether the current access token is expired or close to expiry (within 60s)
   */
  private isTokenExpired(): boolean {
    if (!this.accessToken) return true
    if (!this.tokenExpiresAt) return false
    return Date.now() >= this.tokenExpiresAt - 60000 // Expired or expiring within 60s
  }

  /**
   * Ensures a fresh access token is available, refreshing via Google OAuth2 if necessary
   */
  private async ensureValidAccessToken(): Promise<string> {
    if (!this.isTokenExpired() && this.accessToken) {
      return this.accessToken
    }

    if (!this.refreshToken) {
      if (this.accessToken) return this.accessToken
      throw new Error('Gmail authorization required: No refresh token available. Please reconnect Gmail.')
    }

    try {
      const refreshed = await refreshGoogleAccessToken(this.refreshToken)
      this.accessToken = refreshed.access_token
      this.tokenExpiresAt = new Date(refreshed.expires_at).getTime()

      if (this.config.onTokenRefreshed) {
        await this.config.onTokenRefreshed({
          access_token: refreshed.access_token,
          expires_at: refreshed.expires_at,
          refresh_token: this.refreshToken,
        })
      }

      return this.accessToken
    } catch (err: any) {
      console.error('[GmailAdapter] Token refresh failed:', err)
      throw new Error(`Gmail authentication expired: ${err?.message || 'Token refresh failed'}. Please reconnect.`)
    }
  }

  /**
   * Builds an RFC 2822 compliant MIME message and encodes it to Base64URL
   */
  private createMimeMessage(payload: OutgoingEmailPayload): string {
    const boundary = `====_PrintERP_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_====`
    const altBoundary = `====_Alt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_====`

    const fromAddress =
      typeof payload.from === 'string'
        ? payload.from
        : payload.from.name
        ? `"${payload.from.name.replace(/"/g, '')}" <${payload.from.address}>`
        : payload.from.address

    const toAddresses = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to
    const ccAddresses = payload.cc ? (Array.isArray(payload.cc) ? payload.cc.join(', ') : payload.cc) : undefined
    const bccAddresses = payload.bcc ? (Array.isArray(payload.bcc) ? payload.bcc.join(', ') : payload.bcc) : undefined
    const replyTo = payload.replyTo || this.config.reply_to_email || undefined

    const headers: string[] = [
      `From: ${fromAddress}`,
      `To: ${toAddresses}`,
      `Subject: =?UTF-8?B?${Buffer.from(payload.subject, 'utf8').toString('base64')}?=`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${Date.now()}.${Math.random().toString(36).substring(2, 8)}@printerp.com>`,
      'MIME-Version: 1.0',
    ]

    if (ccAddresses) headers.push(`Cc: ${ccAddresses}`)
    if (bccAddresses) headers.push(`Bcc: ${bccAddresses}`)
    if (replyTo) headers.push(`Reply-To: ${replyTo}`)

    if (payload.headers) {
      for (const [key, value] of Object.entries(payload.headers)) {
        // Prevent header injection
        const cleanKey = key.replace(/[\r\n]/g, '')
        const cleanVal = String(value).replace(/[\r\n]/g, '')
        headers.push(`${cleanKey}: ${cleanVal}`)
      }
    }

    const hasAttachments = payload.attachments && payload.attachments.length > 0

    let messageBody = ''

    if (hasAttachments) {
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
      messageBody += `${headers.join('\r\n')}\r\n\r\n`

      // Multipart/alternative part for Plain Text + HTML
      messageBody += `--${boundary}\r\n`
      messageBody += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`

      // Plain Text
      if (payload.text) {
        messageBody += `--${altBoundary}\r\n`
        messageBody += 'Content-Type: text/plain; charset="UTF-8"\r\n'
        messageBody += 'Content-Transfer-Encoding: base64\r\n\r\n'
        messageBody += `${Buffer.from(payload.text, 'utf8').toString('base64')}\r\n\r\n`
      }

      // HTML
      messageBody += `--${altBoundary}\r\n`
      messageBody += 'Content-Type: text/html; charset="UTF-8"\r\n'
      messageBody += 'Content-Transfer-Encoding: base64\r\n\r\n'
      messageBody += `${Buffer.from(payload.html, 'utf8').toString('base64')}\r\n\r\n`
      messageBody += `--${altBoundary}--\r\n\r\n`

      // Attachments
      for (const att of payload.attachments!) {
        const contentType = att.contentType || 'application/octet-stream'
        let contentBuffer: Buffer

        if (Buffer.isBuffer(att.content)) {
          contentBuffer = att.content
        } else if (typeof att.content === 'string') {
          contentBuffer = Buffer.from(att.content, 'utf8')
        } else {
          contentBuffer = Buffer.from('')
        }

        messageBody += `--${boundary}\r\n`
        messageBody += `Content-Type: ${contentType}; name="${att.filename.replace(/"/g, '')}"\r\n`
        messageBody += 'Content-Transfer-Encoding: base64\r\n'
        messageBody += `Content-Disposition: attachment; filename="${att.filename.replace(/"/g, '')}"\r\n\r\n`
        messageBody += `${contentBuffer.toString('base64')}\r\n\r\n`
      }

      messageBody += `--${boundary}--`
    } else {
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
      messageBody += `${headers.join('\r\n')}\r\n\r\n`

      if (payload.text) {
        messageBody += `--${boundary}\r\n`
        messageBody += 'Content-Type: text/plain; charset="UTF-8"\r\n'
        messageBody += 'Content-Transfer-Encoding: base64\r\n\r\n'
        messageBody += `${Buffer.from(payload.text, 'utf8').toString('base64')}\r\n\r\n`
      }

      messageBody += `--${boundary}\r\n`
      messageBody += 'Content-Type: text/html; charset="UTF-8"\r\n'
      messageBody += 'Content-Transfer-Encoding: base64\r\n\r\n'
      messageBody += `${Buffer.from(payload.html, 'utf8').toString('base64')}\r\n\r\n`
      messageBody += `--${boundary}--`
    }

    // Convert to URL-Safe Base64 (base64url)
    return Buffer.from(messageBody, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  /**
   * Dispatches email via Gmail API `users/me/messages/send`
   */
  async sendEmail(payload: OutgoingEmailPayload): Promise<ProviderSendResult> {
    const rawMessage = this.createMimeMessage(payload)

    // Test environment simulation
    if (process.env.NODE_ENV === 'test' || this.accessToken.startsWith('mock-')) {
      return {
        success: true,
        messageId: `gmail-msg-${Date.now()}`,
        provider: 'gmail',
        timestamp: new Date().toISOString(),
        rawResponse: { id: `gmail-mock-${Date.now()}`, threadId: `thread-mock-${Date.now()}` },
      }
    }

    let token = await this.ensureValidAccessToken()

    const executeSend = async (authToken: string) => {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: rawMessage }),
      })
      return response
    }

    try {
      let response = await executeSend(token)

      // Handle 401 Unauthorized by attempting a token refresh and a single retry
      if (response.status === 401 && this.refreshToken) {
        console.warn('[GmailAdapter] 401 received from Gmail API, refreshing token and retrying...')
        const refreshed = await refreshGoogleAccessToken(this.refreshToken)
        this.accessToken = refreshed.access_token
        this.tokenExpiresAt = new Date(refreshed.expires_at).getTime()

        if (this.config.onTokenRefreshed) {
          await this.config.onTokenRefreshed({
            access_token: refreshed.access_token,
            expires_at: refreshed.expires_at,
            refresh_token: this.refreshToken,
          })
        }

        response = await executeSend(this.accessToken)
      }

      const data = await response.json()

      if (!response.ok) {
        let errorMsg = data.error?.message || `Gmail API error (${response.status})`

        if (response.status === 403) {
          if (errorMsg.includes('has not been used') || errorMsg.includes('disabled')) {
            errorMsg = 'Gmail API is disabled in your Google Cloud Project. Please enable the Gmail API in Google Cloud Console (APIs & Services -> Enable APIs -> Gmail API).'
          } else if (errorMsg.includes('Insufficient Permission') || errorMsg.includes('insufficient')) {
            errorMsg = 'Gmail authorization error: The required scope (https://www.googleapis.com/auth/gmail.send) was not granted. Please reconnect Gmail.'
          }
        } else if (response.status === 400 && errorMsg.includes('Invalid to header')) {
          errorMsg = `Invalid recipient email address: ${payload.to}`
        }

        return {
          success: false,
          provider: 'gmail',
          timestamp: new Date().toISOString(),
          error: errorMsg,
          rawResponse: data,
        }
      }

      return {
        success: true,
        messageId: data.id || `gmail-${Date.now()}`,
        provider: 'gmail',
        timestamp: new Date().toISOString(),
        rawResponse: data,
      }
    } catch (err: any) {
      console.error('[GmailAdapter] Send failed:', err)
      return {
        success: false,
        provider: 'gmail',
        timestamp: new Date().toISOString(),
        error: err?.message || 'Gmail transmission failed',
        rawResponse: err,
      }
    }
  }

  /**
   * Verifies live connection to Gmail API via `users/me/profile`
   */
  async verifyConnection(): Promise<ProviderConnectionResult> {
    const startTime = Date.now()

    if (isTestEnvironment() || this.accessToken.startsWith('mock-')) {
      return {
        success: true,
        provider: 'gmail',
        latencyMs: 12,
        message: `Gmail connection verified for ${this.config.gmail_account_email || this.config.sender_email} (12ms)`,
        details: { emailAddress: this.config.gmail_account_email || this.config.sender_email },
      }
    }

    try {
      let token = await this.ensureValidAccessToken()

      let response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.status === 401 && this.refreshToken) {
        const refreshed = await refreshGoogleAccessToken(this.refreshToken)
        this.accessToken = refreshed.access_token
        this.tokenExpiresAt = new Date(refreshed.expires_at).getTime()
        response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        })
      }

      const latencyMs = Date.now() - startTime
      const data = await response.json()

      if (!response.ok) {
        let errorMsg = data.error?.message || 'Failed to authenticate with Gmail API'
        if (response.status === 403 && (errorMsg.includes('has not been used') || errorMsg.includes('disabled'))) {
          errorMsg = 'Gmail API is disabled in your Google Cloud Project. Please enable the Gmail API in Google Cloud Console.'
        }

        return {
          success: false,
          provider: 'gmail',
          latencyMs,
          message: errorMsg,
          error: errorMsg,
        }
      }

      return {
        success: true,
        provider: 'gmail',
        latencyMs,
        message: `Gmail API connection verified for ${data.emailAddress} (${latencyMs}ms)`,
        details: data,
      }
    } catch (err: any) {
      const latencyMs = Date.now() - startTime
      console.error('[GmailAdapter] Verify error:', err)
      return {
        success: false,
        provider: 'gmail',
        latencyMs,
        message: err?.message || 'Gmail connection verification failed',
        error: err?.message,
      }
    }
  }
}
