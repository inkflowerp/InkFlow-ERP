// ==============================================================================
// PrintERP SaaS - UddoktaPay Automated Payment Gateway Adapter
// Documentation: https://uddoktapay.com/docs/v2
// ==============================================================================

import type {
  PaymentProvider,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentVerifyParams,
  PaymentVerifyResult,
  PaymentConnectionTestResult,
} from '../types.ts'

export interface UddoktaPayConfig {
  apiKey: string
  baseUrl?: string
}

export class UddoktaPayPaymentAdapter implements PaymentProvider {
  readonly id = 'uddoktapay' as any
  readonly name = 'UddoktaPay Automated Gateway'
  readonly nameBn = 'উদ্যোক্তাপেমেন্ট গেটওয়ে'
  readonly category = 'gateway' as const
  readonly iconName = 'Zap'
  readonly description = 'Instant automated bKash, Nagad, Rocket, Upay, & cards checkout.'
  readonly descriptionBn = 'বিকাশ, নগদ, রকেট এবং কার্ডের মাধ্যমে ইনস্ট্যান্ট অটোমেটেড পেমেন্ট।'
  readonly badge = 'Automated MFS'
  readonly isSandboxSupported = true

  private apiKey: string
  private baseUrl: string

  constructor(config: UddoktaPayConfig) {
    this.apiKey = config.apiKey || ''
    this.baseUrl = (config.baseUrl || 'https://sandbox.uddoktapay.com').replace(/\/$/, '')
  }

  async testConnection(): Promise<PaymentConnectionTestResult> {
    const start = Date.now()
    if (!this.apiKey) {
      return {
        success: false,
        provider: 'uddoktapay' as any,
        latency_ms: 0,
        environment: this.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
        message: 'UddoktaPay API Key is missing.',
        error: 'API Key required',
      }
    }

    try {
      // Test verify API endpoint with ping invoice
      const res = await fetch(`${this.baseUrl}/api/verify-payment`, {
        method: 'POST',
        headers: {
          'RT-UDDOKTAPAY-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'PrintERP-SaaS/1.0',
        },
        body: JSON.stringify({ invoice_id: `PING_${Date.now()}` }),
        signal: AbortSignal.timeout(10000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      // If API key is invalid, UddoktaPay returns 401 Unauthorized or { status: false, message: 'Invalid API Key' }
      if (res.status === 401 || (json && json.message?.toLowerCase().includes('api key'))) {
        return {
          success: false,
          provider: 'uddoktapay' as any,
          latency_ms,
          environment: this.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
          message: 'UddoktaPay API Key authorization failed.',
          error: json?.message || 'Invalid API Key',
        }
      }

      return {
        success: true,
        provider: 'uddoktapay' as any,
        latency_ms,
        environment: this.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
        message: `UddoktaPay Gateway connected and authorized (${this.baseUrl.includes('sandbox') ? 'Sandbox' : 'Live'}).`,
        details: {
          endpoint: this.baseUrl,
        },
      }
    } catch (err: any) {
      return {
        success: false,
        provider: 'uddoktapay' as any,
        latency_ms: Date.now() - start,
        environment: this.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
        message: 'Unable to reach UddoktaPay API servers.',
        error: err?.message || 'Connection error',
      }
    }
  }

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const trxId = `UDK-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    if (!this.apiKey) {
      return {
        success: false,
        transactionId: trxId,
        error: 'UddoktaPay API key is not configured.',
      }
    }

    try {
      const payload = {
        full_name: params.customerName || 'PrintERP Customer',
        email: params.customerEmail || 'billing@printerp.com',
        amount: params.amount.toFixed(2),
        metadata: {
          transaction_id: trxId,
          company_id: params.companyId,
          plan: params.planName,
        },
        redirect_url: params.redirectUrl || 'https://printerp.com/platform/billing',
        cancel_url: params.cancelUrl || 'https://printerp.com/platform/billing',
        webhook_url: params.callbackUrl || 'https://printerp.com/api/webhooks/uddoktapay',
      }

      const res = await fetch(`${this.baseUrl}/api/checkout-v2`, {
        method: 'POST',
        headers: {
          'RT-UDDOKTAPAY-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.status || !json?.payment_url) {
        return {
          success: false,
          transactionId: trxId,
          error: json?.message || 'UddoktaPay payment initialization failed.',
          rawResponse: json,
        }
      }

      return {
        success: true,
        transactionId: trxId,
        gatewayReference: json.invoice_id,
        checkoutUrl: json.payment_url,
        rawResponse: json,
      }
    } catch (err: any) {
      return {
        success: false,
        transactionId: trxId,
        error: err?.message || 'Network error initiating UddoktaPay checkout',
      }
    }
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    const invoiceId = params.gatewayReference || params.paymentId

    if (!invoiceId) {
      return {
        success: false,
        status: 'failed',
        gatewayTransactionId: '',
        paidAmount: 0,
        paidAt: new Date().toISOString(),
        paymentMethod: 'uddoktapay' as any,
        error: 'Invoice ID required for UddoktaPay verification.',
      }
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/verify-payment`, {
        method: 'POST',
        headers: {
          'RT-UDDOKTAPAY-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoice_id: invoiceId }),
        signal: AbortSignal.timeout(15000),
      })

      const json = await res.json().catch(() => null)
      const isPaid = json?.status === 'COMPLETED' || json?.status === 'PAID' || json?.status === true

      if (!isPaid) {
        return {
          success: false,
          status: 'failed',
          gatewayTransactionId: '',
          paidAmount: 0,
          paidAt: new Date().toISOString(),
          paymentMethod: 'uddoktapay' as any,
          rawResponse: json,
          error: json?.message || `Payment status: ${json?.status || 'PENDING'}`,
        }
      }

      return {
        success: true,
        status: 'paid',
        gatewayTransactionId: json.transaction_id || json.trx_id || invoiceId,
        paidAmount: parseFloat(json.amount || String(params.amount || 0)),
        currency: 'BDT',
        paidAt: json.completed_at || new Date().toISOString(),
        paymentMethod: 'uddoktapay' as any,
        rawResponse: json,
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'failed',
        gatewayTransactionId: '',
        paidAmount: 0,
        paidAt: new Date().toISOString(),
        paymentMethod: 'uddoktapay' as any,
        error: err?.message || 'Server exception verifying UddoktaPay payment',
      }
    }
  }
}
