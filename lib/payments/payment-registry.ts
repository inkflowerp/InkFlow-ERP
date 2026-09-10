// ==============================================================================
// PrintERP SaaS - Payment Registry Hub
// Dispatches payments to real adapters (bKash, SSLCommerz, Nagad, UddoktaPay, Stripe, Bank Wire)
// ==============================================================================

import { PaymentGatewayType } from '@/types/subscription.types'
import {
  PaymentProvider,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentVerifyParams,
  PaymentVerifyResult,
} from './types'
import { BkashPaymentAdapter } from './adapters/bkash.adapter'
import { SslCommerzPaymentAdapter } from './adapters/sslcommerz.adapter'
import { NagadPaymentAdapter } from './adapters/nagad.adapter'
import { UddoktaPayPaymentAdapter } from './adapters/uddoktapay.adapter'
import { StripePaymentAdapter } from './adapters/stripe.adapter'
import { BankWirePaymentProvider } from './providers/bank-wire.provider'
import { createAdminClient } from '@/lib/supabase/admin'

class PaymentRegistry {
  private providers: Map<string, PaymentProvider> = new Map()

  constructor() {
    this.register(
      new BkashPaymentAdapter({
        appKey: process.env.BKASH_APP_KEY || '',
        appSecret: process.env.BKASH_APP_SECRET || '',
        username: process.env.BKASH_USERNAME || '',
        password: process.env.BKASH_PASSWORD || '',
        isSandbox: process.env.NODE_ENV !== 'production',
      })
    )
    this.register(
      new SslCommerzPaymentAdapter({
        storeId: process.env.SSLCOMMERZ_STORE_ID || '',
        storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || '',
        isSandbox: process.env.NODE_ENV !== 'production',
      })
    )
    this.register(
      new NagadPaymentAdapter({
        merchantId: process.env.NAGAD_MERCHANT_ID || '',
        merchantPrivateKey: process.env.NAGAD_MERCHANT_PRIVATE_KEY || '',
        nagadPublicKey: process.env.NAGAD_PUBLIC_KEY || '',
        isSandbox: process.env.NODE_ENV !== 'production',
      })
    )
    this.register(
      new UddoktaPayPaymentAdapter({
        apiKey: process.env.UDDOKTAPAY_API_KEY || '',
      })
    )
    this.register(
      new StripePaymentAdapter({
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      })
    )
    this.register(new BankWirePaymentProvider())
  }

  register(provider: PaymentProvider): void {
    this.providers.set(provider.id, provider)
  }

  getProvider(id: PaymentGatewayType | string): PaymentProvider {
    const provider = this.providers.get(id)
    if (!provider) {
      return this.providers.get('bkash') || new BankWirePaymentProvider()
    }
    return provider
  }

  getAllProviders(): PaymentProvider[] {
    return Array.from(this.providers.values())
  }

  async initiatePayment(
    gatewayId: PaymentGatewayType | string,
    params: PaymentInitiateParams
  ): Promise<PaymentInitiateResult> {
    const provider = this.getProvider(gatewayId)
    const result = await provider.initiatePayment(params)

    // Log transaction to gateway_transactions table
    if (result.success) {
      try {
        const admin = createAdminClient()
        await (admin as any).from('gateway_transactions').insert({
          tenant_id: params.companyId || null,
          provider: gatewayId,
          subscription_id: params.subscriptionId || null,
          invoice_id: params.invoiceId || null,
          amount: params.amount,
          currency: params.currency || 'BDT',
          internal_trx_id: result.transactionId,
          provider_trx_id: result.gatewayReference || null,
          payment_status: 'initiated',
          payment_url: result.checkoutUrl || null,
          initiated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
      } catch (err) {
        console.warn('[PaymentRegistry] Transaction insert error:', err)
      }
    }

    return result
  }

  async verifyPayment(
    gatewayId: PaymentGatewayType | string,
    params: PaymentVerifyParams
  ): Promise<PaymentVerifyResult> {
    const provider = this.getProvider(gatewayId)
    const result = await provider.verifyPayment(params)

    // Update transaction record
    try {
      const admin = createAdminClient()
      await (admin as any)
        .from('gateway_transactions')
        .update({
          payment_status: result.status,
          provider_trx_id: result.gatewayTransactionId || params.gatewayReference,
          completed_at: result.success ? new Date().toISOString() : null,
          verification_payload: result.rawResponse || null,
          error_message: result.error || null,
          updated_at: new Date().toISOString(),
        })
        .eq('internal_trx_id', params.transactionId)
    } catch (err) {
      console.warn('[PaymentRegistry] Transaction update error:', err)
    }

    return result
  }
}

export const paymentRegistry = new PaymentRegistry()
