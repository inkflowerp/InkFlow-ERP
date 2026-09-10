// ==============================================================================
// PrintERP SaaS - bKash Tokenized Checkout Payment Gateway Adapter
// Official Documentation: https://developer.bKash.com
// API Version: v1.2.0-beta Tokenized Checkout
// ==============================================================================

import type {
  PaymentProvider,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentVerifyParams,
  PaymentVerifyResult,
  PaymentConnectionTestResult,
} from '../types.ts'

export interface BkashConfig {
  appKey: string
  appSecret: string
  username: string
  password: string
  isSandbox?: boolean
  baseUrl?: string
}

export class BkashPaymentAdapter implements PaymentProvider {
  readonly id = 'bkash' as const
  readonly name = 'bKash Merchant Payment Gateway'
  readonly nameBn = 'বিকাশ পেমেন্ট গেটওয়ে'
  readonly category = 'mfs' as const
  readonly iconName = 'Smartphone'
  readonly description = 'Tokenized Checkout for instant mobile wallet payments in Bangladesh.'
  readonly descriptionBn = 'বিকাশ টোকেনাইজড অনলাইন চেকআউটের মাধ্যমে দ্রুত বিল ও ইনভয়েস পরিশোধ।'
  readonly badge = 'Most Popular'
  readonly isSandboxSupported = true

  private appKey: string
  private appSecret: string
  private username: string
  private password: string
  private isSandbox: boolean
  private baseUrl: string

  constructor(config: BkashConfig) {
    this.appKey = config.appKey || ''
    this.appSecret = config.appSecret || ''
    this.username = config.username || ''
    this.password = config.password || ''
    this.isSandbox = config.isSandbox !== false // defaults to sandbox unless explicitly false
    this.baseUrl =
      config.baseUrl ||
      (this.isSandbox
        ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
        : 'https://tokenized.pay.bka.sh/v1.2.0-beta')
  }

  /**
   * Generates a temporary bKash IdToken for authenticated API operations
   */
  private async grantToken(): Promise<{ token: string; expiresIn: number }> {
    if (!this.appKey || !this.appSecret || !this.username || !this.password) {
      throw new Error('bKash credentials missing (AppKey, AppSecret, Username, Password required).')
    }

    const res = await fetch(`${this.baseUrl}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        username: this.username,
        password: this.password,
      },
      body: JSON.stringify({
        app_key: this.appKey,
        app_secret: this.appSecret,
      }),
      signal: AbortSignal.timeout(12000),
    })

    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.id_token || json?.statusCode !== '0000') {
      const errMsg = json?.statusMessage || json?.message || `HTTP ${res.status}: bKash token authorization failed`
      throw new Error(errMsg)
    }

    return {
      token: json.id_token,
      expiresIn: json.expires_in || 3600,
    }
  }

  async testConnection(): Promise<PaymentConnectionTestResult> {
    const start = Date.now()
    if (!this.appKey || !this.appSecret || !this.username || !this.password) {
      return {
        success: false,
        provider: this.id,
        latency_ms: 0,
        environment: this.isSandbox ? 'sandbox' : 'live',
        message: 'bKash credentials incomplete (App Key, App Secret, Username, Password required).',
        error: 'Missing required credentials',
      }
    }

    try {
      const { token } = await this.grantToken()
      const latency_ms = Date.now() - start

      return {
        success: true,
        provider: this.id,
        latency_ms,
        environment: this.isSandbox ? 'sandbox' : 'live',
        merchantId: this.username,
        message: `bKash Tokenized Checkout connected. Authenticated as "${this.username}" (${this.isSandbox ? 'Sandbox Mode' : 'Live Production'}).`,
        details: {
          endpoint: this.baseUrl,
          tokenLength: token.length,
          environment: this.isSandbox ? 'SANDBOX' : 'LIVE',
        },
      }
    } catch (err: any) {
      return {
        success: false,
        provider: this.id,
        latency_ms: Date.now() - start,
        environment: this.isSandbox ? 'sandbox' : 'live',
        message: 'bKash API handshake rejected credentials.',
        error: err?.message || 'Authentication error',
      }
    }
  }

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const trxId = `BKH-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    try {
      const { token } = await this.grantToken()
      const callbackURL =
        params.callbackUrl || `${params.redirectUrl || 'https://printerp.com/api/webhooks/bkash'}?trx=${trxId}`

      const payload = {
        mode: '0011',
        payerReference: params.customerPhone || '01700000000',
        callbackURL,
        amount: params.amount.toFixed(2),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: trxId,
      }

      const res = await fetch(`${this.baseUrl}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: token,
          'X-APP-Key': this.appKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.bkashURL || json?.statusCode !== '0000') {
        return {
          success: false,
          transactionId: trxId,
          error: json?.statusMessage || json?.message || 'bKash payment initiation rejected.',
          rawResponse: json,
        }
      }

      return {
        success: true,
        transactionId: trxId,
        gatewayReference: json.paymentID,
        checkoutUrl: json.bkashURL,
        accountNumber: `${this.username} (Merchant)`,
        rawResponse: json,
      }
    } catch (err: any) {
      return {
        success: false,
        transactionId: trxId,
        error: err?.message || 'Failed to initiate bKash checkout session',
      }
    }
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    const paymentID = params.gatewayReference || params.paymentId

    if (!paymentID) {
      return {
        success: false,
        status: 'failed',
        gatewayTransactionId: '',
        paidAmount: 0,
        paidAt: new Date().toISOString(),
        paymentMethod: this.id,
        error: 'bKash payment ID missing for verification.',
      }
    }

    try {
      const { token } = await this.grantToken()

      // Execute Payment
      const res = await fetch(`${this.baseUrl}/tokenized/checkout/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: token,
          'X-APP-Key': this.appKey,
        },
        body: JSON.stringify({ paymentID }),
        signal: AbortSignal.timeout(15000),
      })

      const json = await res.json().catch(() => null)

      // Check if already executed and status is Completed, or if statusCode is 0000
      const isSuccess =
        json?.statusCode === '0000' ||
        (json?.transactionStatus === 'Completed' && json?.trxID)

      if (!isSuccess) {
        // Query status fallback in case payment was already executed
        const queryRes = await fetch(`${this.baseUrl}/tokenized/checkout/payment/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
            'X-APP-Key': this.appKey,
          },
          body: JSON.stringify({ paymentID }),
          signal: AbortSignal.timeout(10000),
        })
        const queryJson = await queryRes.json().catch(() => null)

        if (queryJson?.transactionStatus === 'Completed' && queryJson?.trxID) {
          return {
            success: true,
            status: 'paid',
            gatewayTransactionId: queryJson.trxID,
            paidAmount: parseFloat(queryJson.amount || String(params.amount || 0)),
            currency: queryJson.currency || 'BDT',
            paidAt: queryJson.completedTime || new Date().toISOString(),
            paymentMethod: this.id,
            rawResponse: queryJson,
          }
        }

        return {
          success: false,
          status: 'failed',
          gatewayTransactionId: '',
          paidAmount: 0,
          paidAt: new Date().toISOString(),
          paymentMethod: this.id,
          rawResponse: json,
          error: json?.statusMessage || 'bKash verification failed.',
        }
      }

      return {
        success: true,
        status: 'paid',
        gatewayTransactionId: json.trxID,
        paidAmount: parseFloat(json.amount || String(params.amount || 0)),
        currency: json.currency || 'BDT',
        paidAt: json.paymentExecuteTime || new Date().toISOString(),
        paymentMethod: this.id,
        rawResponse: json,
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'failed',
        gatewayTransactionId: '',
        paidAmount: 0,
        paidAt: new Date().toISOString(),
        paymentMethod: this.id,
        error: err?.message || 'Server error verifying bKash payment',
      }
    }
  }

  async refundPayment(
    transactionId: string,
    amount: number,
    reason: string = 'Requested by administrator'
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const { token } = await this.grantToken()
      const res = await fetch(`${this.baseUrl}/tokenized/checkout/payment/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'X-APP-Key': this.appKey,
        },
        body: JSON.stringify({
          paymentID: transactionId,
          amount: amount.toFixed(2),
          trxID: transactionId,
          sku: 'PrintERP-Refund',
          reason,
        }),
      })

      const json = await res.json().catch(() => null)
      if (json?.statusCode === '0000') {
        return { success: true, refundId: json.refundTrxID }
      }
      return { success: false, error: json?.statusMessage || 'bKash refund rejected' }
    } catch (err: any) {
      return { success: false, error: err?.message }
    }
  }
}
