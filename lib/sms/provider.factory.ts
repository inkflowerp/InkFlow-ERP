// ==============================================================================
// PrintERP SaaS - SMS Provider Factory
// Instantiates production SMS adapters dynamically
// ==============================================================================

import type { SmsProviderType } from '../../types/gateway.types.ts'
import type { ISmsProvider } from './types.ts'
import { GreenwebSmsAdapter } from './adapters/greenweb.adapter.ts'
import { BulkSmsBdAdapter } from './adapters/bulksmsbd.adapter.ts'
import { SslWirelessSmsAdapter } from './adapters/ssl-wireless.adapter.ts'
import { TwilioSmsAdapter } from './adapters/twilio.adapter.ts'

export interface CreateSmsProviderOptions {
  provider: SmsProviderType
  credentials: Record<string, string>
  publicConfig?: Record<string, any>
}

export function createSmsProvider(options: CreateSmsProviderOptions): ISmsProvider {
  const { provider, credentials, publicConfig = {} } = options

  switch (provider) {
    case 'greenweb':
      return new GreenwebSmsAdapter({
        token: credentials.token || credentials.api_key || credentials.password || '',
        senderId: publicConfig.sender_id || credentials.sender_id,
        baseUrl: publicConfig.base_url,
      })

    case 'bulksmsbd':
      return new BulkSmsBdAdapter({
        apiKey: credentials.api_key || credentials.token || credentials.password || '',
        senderId: publicConfig.sender_id || credentials.sender_id,
        baseUrl: publicConfig.base_url,
      })

    case 'ssl_wireless':
      return new SslWirelessSmsAdapter({
        apiToken: credentials.api_token || credentials.token || credentials.api_key || '',
        sid: credentials.sid || publicConfig.sid || publicConfig.sender_id || '',
        baseUrl: publicConfig.base_url,
      })

    case 'twilio':
      return new TwilioSmsAdapter({
        accountSid: credentials.account_sid || credentials.username || '',
        authToken: credentials.auth_token || credentials.password || '',
        fromNumber: publicConfig.from_number || publicConfig.sender_id || credentials.from_number,
      })

    default:
      throw new Error(`Unsupported SMS provider: ${provider}`)
  }
}
