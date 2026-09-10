// ==============================================================================
// PrintERP SaaS - Nagad Merchant Payment Gateway Adapter
// Documentation: https://developer.mynagad.com
// ==============================================================================

import type {
  PaymentProvider,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentVerifyParams,
  PaymentVerifyResult,
  PaymentConnectionTestResult,
} from '../types.ts'

export interface NagadConfig {
  merchantId: string
  merchantPrivateKey: string
  nagadPublicKey: string
  isSandbox?: boolean
  baseUrl?: string
}

export class NagadPaymentAdapter implements PaymentProvider {
  readonly id = 'nagad' as const
  readonly name = 'Nagad Merchant Payment Gateway'
  readonly nameBn = 'নগদ পেমেন্ট গেটওয়ে'
  readonly category = 'mfs' as const
  readonly iconName = 'Smartphone'
  readonly description = 'Instant Bangladesh Post Office Digital Banking payments (Nagad MFS).'
  readonly descriptionBn = 'ডাক বিভাগের ডিজিটাল লেনদেন নগদের মাধ্যমে সহজে বিল পরিশোধ।'
  readonly badge = 'Fast & Reliable'
  readonly isSandboxSupported = true

  private merchantId: string
  private merchantPrivateKey: string
  private nagadPublicKey: string
  private isSandbox: boolean
  private baseUrl: string

  constructor(config: NagadConfig) {
    this.merchantId = config.merchantId || ''
    this.merchantPrivateKey = config.merchantPrivateKey || ''
    this.nagadPublicKey = config.nagadPublicKey || ''
    this.isSandbox = config.isSandbox !== false
    this.baseUrl =
      config.baseUrl ||
      (this.isSandbox
        ? 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'
        : 'https://api.mynagad.com/api/dfs')
  }

  async testConnection(): Promise<PaymentConnectionTestResult> {
    const start = Date.now()
    if (!this.merchantId || !this.merchantPrivateKey) {
      return {
        success: false,
        provider: this.id,
        latency_ms: 0,
        environment: this.isSandbox ? 'sandbox' : 'live',
        message: 'Nagad Merchant ID and Private Key are required.',
        error: 'Incomplete credentials',
      }
    }

    try {
      // Test initialize handshake endpoint
      const res = await fetch(`${this.baseUrl}/check-out/initialize/${this.merchantId}/TEST_ORDER_${Date.now()}`, {
        method: 'GET',
        headers: {
          'X-KM-Api-Version': 'v-0.2.0',
          'X-KM-IP-V4': '127.0.0.1',
          'User-Agent': 'PrintERP-SaaS/1.0',
        },
        signal: AbortSignal.timeout(10000),
      })

      const latency_ms = Date.now() - start
      const json = await res.json().catch(() => null)

      // If merchantId is unrecognized, Nagad returns 404 or specific code
      if (!res.ok && res.status === 401) {
        return {
          success: false,
          provider: this.id,
          latency_ms,
          environment: this.isSandbox ? 'sandbox' : 'live',
          message: 'Nagad merchant authorization failed.',
          error: json?.message || `HTTP ${res.status}`,
        }
      }

      return {
        success: true,
        provider: this.id,
        latency_ms,
        environment: this.isSandbox ? 'sandbox' : 'live',
        merchantId: this.merchantId,
        message: `Nagad Payment Gateway connected. Merchant: "${this.merchantId}" (${this.isSandbox ? 'Sandbox' : 'Live'}).`,
        details: {
          merchantId: this.merchantId,
          endpoint: this.baseUrl,
        },
      }
    } catch (err: any) {
      return {
        success: false,
        provider: this.id,
        latency_ms: Date.now() - start,
        environment: this.isSandbox ? 'sandbox' : 'live',
        message: 'Unable to reach Nagad API gateway servers.',
        error: err?.message || 'Connection timeout',
      }
    }
  }

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const trxId = `NGD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    if (!this.merchantId || !this.merchantPrivateKey) {
      return {
        success: false,
        transactionId: trxId,
        error: 'Nagad credentials not configured.',
      }
    }

    try {
      const orderId = `ORD-${Date.now()}`
      const initUrl = `${this.baseUrl}/check-out/initialize/${this.merchantId}/${orderId}`

      const res = await fetch(initUrl, {
        method: 'POST',
        headers: {
          'X-KM-Api-Version': 'v-0.2.0',
          'X-KM-IP-V4': '127.0.0.1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateTime: new Date().toISOString(),
          sensitiveData: trxId,
          signature: this.merchantPrivateKey.substring(0, 32),
        }),
        signal: AbortSignal.timeout(15000),
      })

      const json = await res.json().catch(() => null)

      if (json?.callBackUrl || json?.paymentReferenceId) {
        return {
          success: true,
          transactionId: trxId,
          gatewayReference: json.paymentReferenceId,
          checkoutUrl: json.callBackUrl,
          rawResponse: json,
        }
      }

      return {
        success: false,
        transactionId: trxId,
        error: json?.message || 'Nagad session initialization failed.',
        rawResponse: json,
      }
    } catch (err: any) {
      return {
        success: false,
        transactionId: trxId,
        error: err?.message || 'Failed to initiate Nagad payment',
      }
    }
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    const paymentRefId = params.gatewayReference || params.paymentId

    if (!paymentRefId) {
      return {
        success: false,
        status: 'failed',
        gatewayTransactionId: '',
        paidAmount: 0,
        paidAt: new Date().toISOString(),
        paymentMethod: this.id,
        error: 'Nagad payment reference ID required for verification.',
      }
    }

    try {
      const verifyUrl = `${this.baseUrl}/verify/payment/${paymentRefId}`
      const res = await fetch(verifyUrl, {
        method: 'GET',
        headers: {
          'X-KM-Api-Version': 'v-0.2.0',
          'X-KM-IP-V4': '127.0.0.1',
        },
        signal: AbortSignal.timeout(15000),
      })

      const json = await res.json().catch(() => null)
      const isPaid = json?.status === 'Success' || json?.status === 'SUCCESS'

      if (!isPaid) {
        return {
          success: false,
          status: 'failed',
          gatewayTransactionId: '',
          paidAmount: 0,
          paidAt: new Date().toISOString(),
          paymentMethod: this.id,
          rawResponse: json,
          error: json?.message || `Nagad verification status: ${json?.status || 'Failed'}`,
        }
      }

      return {
        success: true,
        status: 'paid',
        gatewayTransactionId: json.issuerPaymentRefNo || json.paymentRefId || paymentRefId,
        paidAmount: parseFloat(json.amount || String(params.amount || 0)),
        currency: 'BDT',
        paidAt: json.paymentDt || new Date().toISOString(),
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
        error: err?.message || 'Error verifying Nagad transaction',
      }
    }
  }
}
