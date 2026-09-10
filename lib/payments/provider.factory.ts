// ==============================================================================
// PrintERP SaaS - Payment Provider Factory
// Instantiates real payment gateway adapters dynamically
// ==============================================================================

import type { PaymentProvider } from './types.ts'
import { BkashPaymentAdapter } from './adapters/bkash.adapter.ts'
import { SslCommerzPaymentAdapter } from './adapters/sslcommerz.adapter.ts'
import { NagadPaymentAdapter } from './adapters/nagad.adapter.ts'
import { UddoktaPayPaymentAdapter } from './adapters/uddoktapay.adapter.ts'
import { StripePaymentAdapter } from './adapters/stripe.adapter.ts'
import { BankWirePaymentProvider } from './providers/bank-wire.provider.ts'

export interface CreatePaymentProviderOptions {
  provider: string
  credentials: Record<string, string>
  publicConfig?: Record<string, any>
  environment?: 'sandbox' | 'live'
}

export function createPaymentProvider(options: CreatePaymentProviderOptions): PaymentProvider {
  const { provider, credentials, publicConfig = {}, environment = 'sandbox' } = options
  const isSandbox = environment === 'sandbox'

  switch (provider) {
    case 'bkash':
      return new BkashPaymentAdapter({
        appKey: credentials.app_key || credentials.api_key || '',
        appSecret: credentials.app_secret || credentials.secret_key || '',
        username: credentials.username || publicConfig.username || '',
        password: credentials.password || '',
        isSandbox,
        baseUrl: publicConfig.base_url,
      })

    case 'sslcommerz':
      return new SslCommerzPaymentAdapter({
        storeId: credentials.store_id || credentials.username || publicConfig.store_id || '',
        storePassword: credentials.store_password || credentials.password || credentials.api_key || '',
        isSandbox,
        baseUrl: publicConfig.base_url,
      })

    case 'nagad':
      return new NagadPaymentAdapter({
        merchantId: credentials.merchant_id || publicConfig.merchant_id || '',
        merchantPrivateKey: credentials.merchant_private_key || credentials.password || '',
        nagadPublicKey: credentials.nagad_public_key || '',
        isSandbox,
        baseUrl: publicConfig.base_url,
      })

    case 'uddoktapay':
      return new UddoktaPayPaymentAdapter({
        apiKey: credentials.api_key || credentials.token || credentials.password || '',
        baseUrl: publicConfig.base_url || (isSandbox ? 'https://sandbox.uddoktapay.com' : 'https://pay.uddoktapay.com'),
      })

    case 'stripe':
      return new StripePaymentAdapter({
        secretKey: credentials.secret_key || credentials.api_key || credentials.password || '',
        publishableKey: publicConfig.publishable_key || credentials.publishable_key,
        webhookSecret: credentials.webhook_secret,
      })

    case 'bank_transfer':
    case 'manual':
      return new BankWirePaymentProvider()

    default:
      throw new Error(`Unsupported payment gateway provider: ${provider}`)
  }
}
