// ==============================================================================
// PrintERP SaaS - Telegram Bot API Adapter (Official Bot API)
// Documentation: https://core.telegram.org/bots/api
// ==============================================================================

import type {
  ITelegramProvider,
  TelegramSendMessagePayload,
  TelegramSendDocumentPayload,
  TelegramSendResult,
  TelegramConnectionTestResult,
} from '../types.ts'

export interface TelegramBotConfig {
  botToken: string
  defaultChatId?: string
  parseMode?: 'HTML' | 'MarkdownV2' | 'Markdown'
}

export class TelegramBotAdapter implements ITelegramProvider {
  readonly providerName = 'telegram_bot' as const
  private botToken: string
  private defaultChatId?: string
  private parseMode: 'HTML' | 'MarkdownV2' | 'Markdown'

  constructor(config: TelegramBotConfig) {
    this.botToken = config.botToken || ''
    this.defaultChatId = config.defaultChatId
    this.parseMode = config.parseMode || 'HTML'
  }

  private getBaseUrl(): string {
    return `https://api.telegram.org/bot${this.botToken}`
  }

  async testConnection(): Promise<TelegramConnectionTestResult> {
    const start = Date.now()
    if (!this.botToken) {
      return {
        success: false,
        latency_ms: 0,
        message: 'Telegram Bot Token is required.',
        error: 'Token missing',
      }
    }

    try {
      const url = `${this.getBaseUrl()}/getMe`
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'PrintERP-SaaS/1.0' },
        signal: AbortSignal.timeout(10000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        return {
          success: false,
          latency_ms,
          message: 'Telegram Bot token verification failed.',
          error: json?.description || `HTTP ${res.status}: Unauthorized`,
        }
      }

      const bot = json.result
      return {
        success: true,
        latency_ms,
        botId: bot.id,
        botUsername: bot.username,
        botFirstName: bot.first_name,
        canJoinGroups: bot.can_join_groups,
        canReadMessages: bot.can_read_all_group_messages,
        message: `Telegram Bot "@${bot.username}" (${bot.first_name}) is online and verified.`,
      }
    } catch (err: any) {
      return {
        success: false,
        latency_ms: Date.now() - start,
        message: 'Unable to reach Telegram Bot API servers.',
        error: err?.message || 'Connection error',
      }
    }
  }

  async sendMessage(payload: TelegramSendMessagePayload): Promise<TelegramSendResult> {
    const start = Date.now()
    const targetChat = payload.chatId || this.defaultChatId

    if (!targetChat) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: 'Telegram target chat ID is missing.',
      }
    }

    if (!this.botToken) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: 'Telegram Bot token not configured.',
      }
    }

    try {
      const url = `${this.getBaseUrl()}/sendMessage`
      const body = {
        chat_id: targetChat,
        text: payload.text,
        parse_mode: payload.parseMode || this.parseMode,
        disable_web_page_preview: Boolean(payload.disableWebPagePreview),
        reply_to_message_id: payload.replyToMessageId,
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          latency_ms,
          rawResponse: json,
          error: json?.description || `Telegram API Error (${res.status})`,
        }
      }

      return {
        success: true,
        messageId: json.result?.message_id,
        timestamp: new Date().toISOString(),
        latency_ms,
        rawResponse: json,
      }
    } catch (err: any) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: err?.message || 'Network exception sending Telegram message',
      }
    }
  }

  async sendDocument(payload: TelegramSendDocumentPayload): Promise<TelegramSendResult> {
    const start = Date.now()
    const targetChat = payload.chatId || this.defaultChatId

    if (!targetChat) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        error: 'Chat ID required',
      }
    }

    try {
      const url = `${this.getBaseUrl()}/sendDocument`
      const body = {
        chat_id: targetChat,
        document: payload.documentUrl,
        caption: payload.caption,
        parse_mode: payload.parseMode || this.parseMode,
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          latency_ms,
          rawResponse: json,
          error: json?.description || 'Telegram document dispatch rejected',
        }
      }

      return {
        success: true,
        messageId: json.result?.message_id,
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

  async setWebhook(
    webhookUrl: string,
    secretToken?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const url = `${this.getBaseUrl()}/setWebhook`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secretToken,
          drop_pending_updates: false,
        }),
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.ok) {
        return { success: true, message: json.description || 'Webhook registered with Telegram' }
      }
      return { success: false, message: json?.description || 'Failed to set webhook' }
    } catch (err: any) {
      return { success: false, message: err?.message }
    }
  }
}
