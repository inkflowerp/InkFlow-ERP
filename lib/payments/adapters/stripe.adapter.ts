// ==============================================================================
// PrintERP SaaS - Stripe International Payment Gateway Adapter
// Documentation: https://stripe.com/docs/api
// ==============================================================================

import type {
  PaymentProvider,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentVerifyParams,
  PaymentVerifyResult,
  PaymentConnectionTestResult,
} from '../types.ts'

export interface StripeConfig {
  secretKey: string
  publishableKey?: string
  webhookSecret?: string
}

export class StripePaymentAdapter implements PaymentProvider {
  readonly id = 'stripe' as any
  readonly name = 'Stripe Global Payment Gateway'
  readonly nameBn = 'স্ট্রাইপ ইন্টারন্যাশনাল গেটওয়ে'
  readonly category = 'gateway' as const
  readonly iconName = 'CreditCard'
  readonly description = 'Accept international credit & debit cards in USD, EUR, GBP, and 135+ currencies.'
  readonly descriptionBn = 'আন্তর্জাতিক কার্ড ও কারেন্সিতে পেমেন্ট গ্রহণের গ্লোবাল গেটওয়ে।'
  readonly badge = 'International Cards'
  readonly isSandboxSupported = true

  private secretKey: string
  private publishableKey?: string
  private webhookSecret?: string

  constructor(config: StripeConfig) {
    this.secretKey = config.secretKey || ''
    this.publishableKey = config.publishableKey
    this.webhookSecret = config.webhookSecret
  }

  async testConnection(): Promise<PaymentConnectionTestResult> {
    const start = Date.now()
    if (!this.secretKey) {
      return {
        success: false,
        provider: 'stripe' as any,
        latency_ms: 0,
        environment: this.secretKey.startsWith('sk_test_') ? 'sandbox' : 'live',
        message: 'Stripe Secret Key is required.',
        error: 'Key missing',
      }
    }

    try {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'User-Agent': 'PrintERP-SaaS/1.0',
        },
        signal: AbortSignal.timeout(10000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      if (!res.ok || json?.error) {
        return {
          success: false,
          provider: 'stripe' as any,
          latency_ms,
          environment: this.secretKey.startsWith('sk_test_') ? 'sandbox' : 'live',
          message: 'Stripe secret key authentication failed.',
          error: json?.error?.message || `HTTP ${res.status}`,
        }
      }

      const isLive = !this.secretKey.startsWith('sk_test_')
      return {
        success: true,
        provider: 'stripe' as any,
        latency_ms,
        environment: isLive ? 'live' : 'sandbox',
        message: `Stripe Global Gateway connected (${isLive ? 'Live Production Mode' : 'Test Sandbox Mode'}).`,
        details: {
          livemode: json.livemode,
          currency: json.available?.[0]?.currency?.toUpperCase() || 'USD',
        },
      }
    } catch (err: any) {
      return {
        success: false,
        provider: 'stripe' as any,
        latency_ms: Date.now() - start,
        environment: this.secretKey.startsWith('sk_test_') ? 'sandbox' : 'live',
        message: 'Unable to reach Stripe API servers.',
        error: err?.message || 'Connection error',
      }
    }
  }

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const trxId = `STP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    if (!this.secretKey) {
      return {
        success: false,
        transactionId: trxId,
        error: 'Stripe secret key not configured.',
      }
    }

    try {
      const currency = (params.currency || 'USD').toLowerCase()
      // Stripe expects smallest currency unit (e.g., cents for USD, integer for BDT if supported)
      const unitAmount = Math.round(params.amount * 100)

      const body = new URLSearchParams()
      body.append('payment_method_types[0]', 'card')
      body.append('mode', 'payment')
      body.append('success_url', params.redirectUrl || 'https://printerp.com/platform/billing?session_id={CHECKOUT_SESSION_ID}')
      body.append('cancel_url', params.cancelUrl || 'https://printerp.com/platform/billing')
      body.append('client_reference_id', trxId)
      body.append('customer_email', params.customerEmail || 'billing@printerp.com')
      body.append('line_items[0][price_data][currency]', currency)
      body.append('line_items[0][price_data][unit_amount]', String(unitAmount))
      body.append('line_items[0][price_data][product_data][name]', params.planName || 'PrintERP Subscription')
      body.append('line_items[0][quantity]', '1')

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(15000),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.url) {
        return {
          success: false,
          transactionId: trxId,
          error: json?.error?.message || 'Stripe Checkout Session initialization failed.',
          rawResponse: json,
        }
      }

      return {
        success: true,
        transactionId: trxId,
        gatewayReference: json.id,
        checkoutUrl: json.url,
        rawResponse: json,
      }
    } catch (err: any) {
      return {
        success: false,
        transactionId: trxId,
        error: err?.message || 'Failed to initialize Stripe payment session',
      }
    }
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    const sessionId = params.gatewayReference || params.paymentId

    if (!sessionId) {
      return {
        success: false,
        status: 'failed',
        gatewayTransactionId: '',
        paidAmount: 0,
        paidAt: new Date().toISOString(),
        paymentMethod: 'stripe' as any,
        error: 'Stripe Session ID required for verification.',
      }
    }

    try {
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.secretKey}` },
        signal: AbortSignal.timeout(15000),
      })

      const json = await res.json().catch(() => null)
      const isPaid = json?.payment_status === 'paid'

      if (!isPaid) {
        return {
          success: false,
          status: 'failed',
          gatewayTransactionId: '',
          paidAmount: 0,
          paidAt: new Date().toISOString(),
          paymentMethod: 'stripe' as any,
          rawResponse: json,
          error: json?.error?.message || `Payment status: ${json?.payment_status || 'unpaid'}`,
        }
      }

      return {
        success: true,
        status: 'paid',
        gatewayTransactionId: json.payment_intent || sessionId,
        paidAmount: (json.amount_total || 0) / 100,
        currency: (json.currency || 'USD').toUpperCase(),
        paidAt: new Date().toISOString(),
        paymentMethod: 'stripe' as any,
        rawResponse: json,
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'failed',
        gatewayTransactionId: '',
        paidAmount: 0,
        paidAt: new Date().toISOString(),
        paymentMethod: 'stripe' as any,
        error: err?.message || 'Error verifying Stripe checkout session',
      }
    }
  }
}
