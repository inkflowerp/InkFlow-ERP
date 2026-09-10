import { PaymentProvider, PaymentInitiateParams, PaymentInitiateResult, PaymentVerifyParams, PaymentVerifyResult } from '../types'

export class BkashPaymentProvider implements PaymentProvider {
  readonly id = 'bkash' as const
  readonly name = 'bKash'
  readonly nameBn = 'বিকাশ'
  readonly category = 'mfs' as const
  readonly iconName = 'Smartphone'
  readonly description = 'Pay instantly via bKash Checkout or Merchant QR'
  readonly descriptionBn = 'বিকাশ পেমেন্ট গেটওয়ে বা মার্চেন্ট নম্বরে সরাসরি পরিশোধ করুন'
  readonly badge = 'Most Popular'
  readonly isSandboxSupported = true

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const timestamp = Date.now()
    const transactionId = `BKH-${timestamp.toString().slice(-8)}`
    const gatewayReference = `BK_AGR_${timestamp}`

    return {
      success: true,
      transactionId,
      gatewayReference,
      checkoutUrl: `https://checkout.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout?invoice=${transactionId}&amount=${params.amount}`,
      instructions: [
        'Open your bKash Mobile App or dial *247#',
        'Select Payment or tap the checkout redirect button',
        'Enter PrintERP SaaS Merchant Account: 01711-000000',
        `Enter Amount: ৳${params.amount.toLocaleString()}`,
        `Enter Reference: ${params.companyName.replace(/\s+/g, '').slice(0, 8).toUpperCase()}`,
        'Enter your bKash PIN to confirm transaction',
      ],
      accountNumber: '01711-000000 (Merchant)',
    }
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    // In production: calls bKash Query / Execute Payment API endpoint
    const ref = params.gatewayReference?.trim() || ''
    const isValid = Boolean(ref.length >= 6)

    if (!isValid) {
      return {
        success: false,
        status: 'failed',
        gatewayTransactionId: '',
        paidAmount: 0,
        paidAt: new Date().toISOString(),
        paymentMethod: 'bkash',
        error: 'Invalid bKash Transaction Reference or TRX ID.',
      }
    }

    return {
      success: true,
      status: 'paid',
      gatewayTransactionId: ref.toUpperCase(),
      paidAmount: params.amount ?? 0,
      paidAt: new Date().toISOString(),
      paymentMethod: 'bkash',
    }
  }
}
