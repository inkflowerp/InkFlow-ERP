import { PaymentProvider, PaymentInitiateParams, PaymentInitiateResult, PaymentVerifyParams, PaymentVerifyResult } from '../types'

export class NagadPaymentProvider implements PaymentProvider {
  readonly id = 'nagad' as const
  readonly name = 'Nagad'
  readonly nameBn = 'নগদ'
  readonly category = 'mfs' as const
  readonly iconName = 'Smartphone'
  readonly description = 'Instant digital MFS payment via Nagad PGW'
  readonly descriptionBn = 'ডাক বিভাগের ডিজিটাল লেনদেন নগদ-এর মাধ্যমে পরিশোধ'
  readonly badge = 'Low Fee'
  readonly isSandboxSupported = true

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const timestamp = Date.now()
    const transactionId = `NGD-${timestamp.toString().slice(-8)}`
    const gatewayReference = `NG_PAY_${timestamp}`

    return {
      success: true,
      transactionId,
      gatewayReference,
      checkoutUrl: `https://sandbox.nagad.com.bd/checkout?order_id=${transactionId}&amount=${params.amount}`,
      instructions: [
        'Open your Nagad Mobile App or dial *167#',
        'Select Merchant Pay',
        'Enter Merchant Account: 01811-000000',
        `Enter Amount: ৳${params.amount.toLocaleString()}`,
        `Enter Counter No: 1 and Reference: ${params.companyName.replace(/\s+/g, '').slice(0, 8).toUpperCase()}`,
        'Enter your Nagad 4-digit PIN to confirm transaction',
      ],
      accountNumber: '01811-000000 (Merchant)',
    }
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    const isValid = Boolean(params.gatewayReference && params.gatewayReference.trim().length >= 6)

    if (!isValid) {
      return {
        success: false,
        status: 'failed',
        gatewayTransactionId: '',
        paidAmount: 0,
        paidAt: new Date().toISOString(),
        paymentMethod: 'nagad',
        error: 'Invalid Nagad Transaction ID or callback payload.',
      }
    }

    return {
      success: true,
      status: 'paid',
      gatewayTransactionId: params.gatewayReference.toUpperCase(),
      paidAmount: params.amount,
      paidAt: new Date().toISOString(),
      paymentMethod: 'nagad',
    }
  }
}
