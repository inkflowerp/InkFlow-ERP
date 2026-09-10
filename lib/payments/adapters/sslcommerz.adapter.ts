// ==============================================================================
// PrintERP SaaS - SSLCOMMERZ Multi-Channel Payment Gateway Adapter
// Documentation: https://developer.sslcommerz.com/doc/v4/
// ==============================================================================

import type {
  PaymentProvider,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentVerifyParams,
  PaymentVerifyResult,
  PaymentConnectionTestResult,
} from '../types.ts'

export interface SslCommerzConfig {
  storeId: string
  storePassword: string
  isSandbox?: boolean
  baseUrl?: string
}

export class SslCommerzPaymentAdapter implements PaymentProvider {
  readonly id = 'sslcommerz' as const
  readonly name = 'SSLCOMMERZ Multi-Channel Gateway'
  readonly nameBn = 'এসএসএল কমার্জ পেমেন্ট গেটওয়ে'
  readonly category = 'gateway' as const
  readonly iconName = 'CreditCard'
  readonly description = 'Accept VISA, MasterCard, Amex, bKash, Nagad, Rocket, & Internet Banking in Bangladesh.'
  readonly descriptionBn = 'ভিসা, মাস্টারকার্ড, এমেক্স, বিকাশ, নগদ, রকেট ও সকল ইন্টারনেট ব্যাংকিং।'
  readonly badge = 'Cards & Banks'
  readonly isSandboxSupported = true

  private storeId: string
  private storePassword: string
  private isSandbox: boolean
  private baseUrl: string

  constructor(config: SslCommerzConfig) {
    this.storeId = config.storeId || ''
    this.storePassword = config.storePassword || ''
    this.isSandbox = config.isSandbox !== false
    this.baseUrl =
      config.baseUrl ||
      (this.isSandbox ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com')
  }

  async testConnection(): Promise<PaymentConnectionTestResult> {
    const start = Date.now()
    if (!this.storeId || !this.storePassword) {
      return {
        success: false,
        provider: this.id,
        latency_ms: 0,
        environment: this.isSandbox ? 'sandbox' : 'live',
        message: 'SSLCommerz Store ID and Store Password are required.',
        error: 'Credentials missing',
      }
    }

    try {
      // Execute a test validation query to verify store credentials
      const testValUrl = `${this.baseUrl}/validator/api/validationserverAPI.php?val_id=TEST_PING_${Date.now()}&store_id=${encodeURIComponent(
        this.storeId
      )}&store_passwd=${encodeURIComponent(this.storePassword)}&v=1&format=json`

      const res = await fetch(testValUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'PrintERP-SaaS/1.0' },
        signal: AbortSignal.timeout(10000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      // SSLCommerz returns status 'INVALID_TRANSACTION' when credentials are valid but val_id was a ping.
      // If store_id / password is bad, it returns 'FAILED' or 'Store Credential Error'.
      const isStoreValid =
        res.ok &&
        json &&
        (json.status === 'INVALID_TRANSACTION' ||
          json.status === 'VALID' ||
          json.status === 'VALIDATED' ||
          !json.status?.toLowerCase().includes('credential'))

      if (!isStoreValid) {
        return {
          success: false,
          provider: this.id,
          latency_ms,
          environment: this.isSandbox ? 'sandbox' : 'live',
          message: 'SSLCommerz authentication failed. Invalid Store ID or Password.',
          error: json?.error || json?.status || `HTTP ${res.status}`,
        }
      }

      return {
        success: true,
        provider: this.id,
        latency_ms,
        environment: this.isSandbox ? 'sandbox' : 'live',
        merchantId: this.storeId,
        message: `SSLCOMMERZ connected. Store ID: "${this.storeId}" (${this.isSandbox ? 'Sandbox Simulator' : 'Live Production Processing'}).`,
        details: {
          storeId: this.storeId,
          gatewayUrl: this.baseUrl,
          environment: this.isSandbox ? 'SANDBOX' : 'LIVE',
        },
      }
    } catch (err: any) {
      return {
        success: false,
        provider: this.id,
        latency_ms: Date.now() - start,
        environment: this.isSandbox ? 'sandbox' : 'live',
        message: 'Unable to connect to SSLCOMMERZ gateway servers.',
        error: err?.message || 'Connection timeout',
      }
    }
  }

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const tranId = `SSLC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    if (!this.storeId || !this.storePassword) {
      return {
        success: false,
        transactionId: tranId,
        error: 'SSLCommerz store credentials not configured.',
      }
    }

    try {
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || 'https://printerp.com'

      const successUrl = params.redirectUrl || `${origin}/api/webhooks/sslcommerz?status=success&tran_id=${tranId}`
      const failUrl = params.cancelUrl || `${origin}/api/webhooks/sslcommerz?status=fail&tran_id=${tranId}`
      const cancelUrl = params.cancelUrl || `${origin}/api/webhooks/sslcommerz?status=cancel&tran_id=${tranId}`
      const ipnUrl = params.callbackUrl || `${origin}/api/webhooks/sslcommerz`

      const bodyParams = new URLSearchParams()
      bodyParams.append('store_id', this.storeId)
      bodyParams.append('store_passwd', this.storePassword)
      bodyParams.append('total_amount', params.amount.toFixed(2))
      bodyParams.append('currency', params.currency || 'BDT')
      bodyParams.append('tran_id', tranId)
      bodyParams.append('success_url', successUrl)
      bodyParams.append('fail_url', failUrl)
      bodyParams.append('cancel_url', cancelUrl)
      bodyParams.append('ipn_url', ipnUrl)
      bodyParams.append('cus_name', params.customerName || 'Valued Customer')
      bodyParams.append('cus_email', params.customerEmail || 'billing@printerp.com')
      bodyParams.append('cus_add1', 'Dhaka, Bangladesh')
      bodyParams.append('cus_city', 'Dhaka')
      bodyParams.append('cus_country', 'Bangladesh')
      bodyParams.append('cus_phone', params.customerPhone || '01700000000')
      bodyParams.append('shipping_method', 'NO')
      bodyParams.append('product_name', params.planName || 'PrintERP SaaS Subscription')
      bodyParams.append('product_category', 'Software SaaS')
      bodyParams.append('product_profile', 'non-physical-goods')

      const res = await fetch(`${this.baseUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(15000),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok || json?.status !== 'SUCCESS' || !json?.GatewayPageURL) {
        return {
          success: false,
          transactionId: tranId,
          error: json?.failedreason || json?.status || 'SSLCommerz payment session creation failed.',
          rawResponse: json,
        }
      }

      return {
        success: true,
        transactionId: tranId,
        gatewayReference: json.sessionkey,
        checkoutUrl: json.GatewayPageURL,
        accountNumber: `Store ID: ${this.storeId}`,
        rawResponse: json,
      }
    } catch (err: any) {
      return {
        success: false,
        transactionId: tranId,
        error: err?.message || 'Failed to initialize SSLCommerz payment session',
      }
    }
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    const valId = params.gatewayReference || params.paymentId

    if (!valId) {
      return {
        success: false,
        status: 'failed',
        gatewayTransactionId: '',
        paidAmount: 0,
        paidAt: new Date().toISOString(),
        paymentMethod: this.id,
        error: 'Validation ID (val_id) is required for SSLCommerz server verification.',
      }
    }

    try {
      const valUrl = `${this.baseUrl}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(
        valId
      )}&store_id=${encodeURIComponent(this.storeId)}&store_passwd=${encodeURIComponent(
        this.storePassword
      )}&v=1&format=json`

      const res = await fetch(valUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'PrintERP-SaaS/1.0' },
        signal: AbortSignal.timeout(15000),
      })

      const json = await res.json().catch(() => null)
      const isValid = json && (json.status === 'VALID' || json.status === 'VALIDATED')

      if (!isValid) {
        return {
          success: false,
          status: 'failed',
          gatewayTransactionId: '',
          paidAmount: 0,
          paidAt: new Date().toISOString(),
          paymentMethod: this.id,
          rawResponse: json,
          error: json?.error || json?.status || 'SSLCommerz validation server rejected transaction.',
        }
      }

      return {
        success: true,
        status: 'paid',
        gatewayTransactionId: json.bank_tran_id || json.tran_id || valId,
        paidAmount: parseFloat(json.amount || String(params.amount || 0)),
        currency: json.currency || 'BDT',
        paidAt: json.tran_date || new Date().toISOString(),
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
        error: err?.message || 'Server error verifying SSLCommerz payment',
      }
    }
  }
}
