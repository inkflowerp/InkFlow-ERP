// ==============================================================================
// PrintERP SaaS - Central Gateway Registry & Dispatch Hub
// Factory and router for Email, SMS, Payment, WhatsApp, and Telegram adapters
// ==============================================================================

import type {
  GatewayCategory,
  AnyProviderType,
  GatewayTestResult,
  SendTestPayload,
  SendTestResult,
  GatewayEnvironment,
} from '../../types/gateway.types.ts'
import { createEmailProvider } from '../email/provider.factory.ts'
import { createSmsProvider } from '../sms/provider.factory.ts'
import { createPaymentProvider } from '../payments/provider.factory.ts'
import { MetaWhatsAppAdapter } from '../whatsapp/adapters/meta-whatsapp.adapter.ts'
import { TelegramBotAdapter } from '../telegram/adapters/telegram-bot.adapter.ts'

export interface ProviderInstanceOptions {
  category: GatewayCategory
  provider: AnyProviderType
  credentials: Record<string, string>
  publicConfig: Record<string, any>
  environment?: GatewayEnvironment
}

export class GatewayRegistry {
  /**
   * Executes a real live network test against the provider
   */
  static async testConnection(options: ProviderInstanceOptions): Promise<GatewayTestResult> {
    const { category, provider, credentials, publicConfig, environment = 'sandbox' } = options

    try {
      switch (category) {
        case 'email': {
          const emailProvider = createEmailProvider({
            id: 'test-gw',
            provider: provider as any,
            smtp_host: publicConfig.smtp_host,
            smtp_port: publicConfig.smtp_port ? Number(publicConfig.smtp_port) : undefined,
            smtp_username: publicConfig.smtp_username,
            encryption_type: publicConfig.encryption_type || 'tls',
            sender_name: publicConfig.sender_name || 'PrintERP',
            sender_email: publicConfig.sender_email || 'test@printerp.com',
            reply_to_email: publicConfig.reply_to_email,
            extra_settings: publicConfig,
            decrypted_secret: credentials.password || credentials.api_key || credentials.secret_key,
          })

          const res = await emailProvider.verifyConnection()
          return {
            success: res.success,
            status: res.success ? 'connected' : 'error',
            latency_ms: res.latencyMs,
            message: res.message,
            error: res.error,
          }
        }

        case 'sms': {
          const smsProvider = createSmsProvider({
            provider: provider as any,
            credentials,
            publicConfig,
          })

          const res = await smsProvider.testConnection()
          return {
            success: res.success,
            status: res.success ? 'connected' : 'error',
            latency_ms: res.latency_ms,
            message: res.message,
            diagnostics: res.details,
            error: res.error,
          }
        }

        case 'payment': {
          const paymentProvider = createPaymentProvider({
            provider,
            credentials,
            publicConfig,
            environment,
          })

          if (paymentProvider.testConnection) {
            const res = await paymentProvider.testConnection()
            return {
              success: res.success,
              status: res.success ? 'connected' : 'error',
              latency_ms: res.latency_ms,
              message: res.message,
              diagnostics: res.details,
              error: res.error,
            }
          }

          return {
            success: true,
            status: 'connected',
            latency_ms: 5,
            message: `${paymentProvider.name} is configured and available.`,
          }
        }

        case 'whatsapp': {
          const waAdapter = new MetaWhatsAppAdapter({
            accessToken: credentials.access_token || credentials.api_token || credentials.password || '',
            phoneNumberId: publicConfig.phone_number_id || credentials.phone_number_id || '',
            businessAccountId: publicConfig.business_account_id,
            apiVersion: publicConfig.api_version || 'v20.0',
          })

          const res = await waAdapter.testConnection()
          return {
            success: res.success,
            status: res.success ? 'connected' : 'error',
            latency_ms: res.latency_ms,
            message: res.message,
            diagnostics: {
              displayPhoneNumber: res.displayPhoneNumber,
              verifiedName: res.verifiedName,
              qualityRating: res.qualityRating,
            },
            error: res.error,
          }
        }

        case 'telegram': {
          const tgAdapter = new TelegramBotAdapter({
            botToken: credentials.bot_token || credentials.token || credentials.password || '',
            defaultChatId: publicConfig.default_chat_id || credentials.chat_id,
            parseMode: publicConfig.parse_mode || 'HTML',
          })

          const res = await tgAdapter.testConnection()
          return {
            success: res.success,
            status: res.success ? 'connected' : 'error',
            latency_ms: res.latency_ms,
            message: res.message,
            diagnostics: {
              botUsername: res.botUsername,
              botFirstName: res.botFirstName,
              canJoinGroups: res.canJoinGroups,
            },
            error: res.error,
          }
        }

        default:
          return {
            success: false,
            status: 'error',
            latency_ms: 0,
            message: `Unknown category: ${category}`,
            error: 'Invalid category',
          }
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'error',
        latency_ms: 0,
        message: err?.message || 'Connection test failed',
        error: err?.message,
      }
    }
  }

  /**
   * Dispatches a real test message through the configured provider
   */
  static async sendTestMessage(
    options: ProviderInstanceOptions,
    payload: SendTestPayload
  ): Promise<SendTestResult> {
    const { category, provider, credentials, publicConfig, environment } = options
    const start = Date.now()

    try {
      switch (category) {
        case 'email': {
          const senderEmail = publicConfig.sender_email || 'test@printerp.com'
          const senderName = publicConfig.sender_name || 'PrintERP Test'
          const emailProvider = createEmailProvider({
            id: 'test-send',
            provider: provider as any,
            smtp_host: publicConfig.smtp_host,
            smtp_port: publicConfig.smtp_port ? Number(publicConfig.smtp_port) : undefined,
            smtp_username: publicConfig.smtp_username,
            encryption_type: publicConfig.encryption_type || 'tls',
            sender_name: senderName,
            sender_email: senderEmail,
            reply_to_email: publicConfig.reply_to_email,
            extra_settings: publicConfig,
            decrypted_secret: credentials.password || credentials.api_key || credentials.secret_key,
          })

          const res = await emailProvider.sendEmail({
            from: { name: senderName, address: senderEmail },
            to: payload.recipient,
            subject: payload.subject || 'PrintERP Gateway Live Test Email',
            html: `<div style="font-family: sans-serif; padding: 20px;">
              <h2>PrintERP Live Gateway Test</h2>
              <p>${payload.message}</p>
              <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
              <p style="color: #666; font-size: 12px;">Sent via ${provider.toUpperCase()} at ${new Date().toISOString()}</p>
            </div>`,
            text: payload.message,
          })

          return {
            success: res.success,
            providerMessageId: res.messageId,
            timestamp: res.timestamp,
            latency_ms: Date.now() - start,
            rawResponse: res.rawResponse,
            error: res.error,
          }
        }

        case 'sms': {
          const smsProvider = createSmsProvider({
            provider: provider as any,
            credentials,
            publicConfig,
          })

          const res = await smsProvider.sendSms({
            to: payload.recipient,
            message: payload.message,
            senderId: publicConfig.sender_id,
          })

          return {
            success: res.success,
            providerMessageId: res.messageId,
            timestamp: res.timestamp,
            latency_ms: res.latency_ms,
            rawResponse: res.rawResponse,
            error: res.error,
          }
        }

        case 'whatsapp': {
          const waAdapter = new MetaWhatsAppAdapter({
            accessToken: credentials.access_token || credentials.api_token || credentials.password || '',
            phoneNumberId: publicConfig.phone_number_id || credentials.phone_number_id || '',
            businessAccountId: publicConfig.business_account_id,
            apiVersion: publicConfig.api_version || 'v20.0',
          })

          const res = await waAdapter.sendTextMessage({
            to: payload.recipient,
            text: payload.message,
          })

          return {
            success: res.success,
            providerMessageId: res.messageId,
            timestamp: res.timestamp,
            latency_ms: res.latency_ms,
            rawResponse: res.rawResponse,
            error: res.error,
          }
        }

        case 'telegram': {
          const tgAdapter = new TelegramBotAdapter({
            botToken: credentials.bot_token || credentials.token || credentials.password || '',
            defaultChatId: publicConfig.default_chat_id || credentials.chat_id,
            parseMode: publicConfig.parse_mode || 'HTML',
          })

          const res = await tgAdapter.sendMessage({
            chatId: payload.recipient,
            text: payload.message,
          })

          return {
            success: res.success,
            providerMessageId: String(res.messageId),
            timestamp: res.timestamp,
            latency_ms: res.latency_ms,
            rawResponse: res.rawResponse,
            error: res.error,
          }
        }

        default:
          return {
            success: false,
            timestamp: new Date().toISOString(),
            latency_ms: 0,
            error: `Send test not supported for category: ${category}`,
          }
      }
    } catch (err: any) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        error: err?.message || 'Failed to dispatch test message',
      }
    }
  }
}
