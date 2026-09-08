import { PaymentProvider, PaymentInitiateParams, PaymentInitiateResult, PaymentVerifyParams, PaymentVerifyResult } from '../types'

export class BankWirePaymentProvider implements PaymentProvider {
  readonly id = 'bank_wire' as const
  readonly name = 'Corporate Bank Wire'
  readonly nameBn = 'ব্যাংক একাউন্ট ট্রান্সফার'
  readonly category = 'bank' as const
  readonly iconName = 'Landmark'
  readonly description = 'Direct corporate BFTN, NPSB, or RTGS bank transfer'
  readonly descriptionBn = 'সরাসরি ব্যাংক ডিপোজিট, বিএফটিএন বা এনপিএসবি ট্রান্সফার'
  readonly badge = 'Corporate / Yearly'
  readonly isSandboxSupported = true

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const timestamp = Date.now()
    const transactionId = `BNK-${timestamp.toString().slice(-8)}`

    return {
      success: true,
      transactionId,
      gatewayReference: `INVOICE_${params.subscriptionId.slice(0, 8)}`,
      requiresManualVerification: true,
      instructions: [
        'Transfer subscription fee to PrintERP Corporate Account:',
        'Bank: City Bank PLC | Branch: Principal Branch, Motijheel, Dhaka',
        'Account Name: PrintERP Technologies Bangladesh Ltd.',
        'Account Number: 1102948192001',
        'Routing Number: 225272635',
        `Reference: ${params.companyName.slice(0, 10).toUpperCase()}-${params.planCode.toUpperCase()}`,
        'Save deposit slip or BFTN transaction reference to verify below.',
      ],
      accountNumber: '1102948192001 (City Bank PLC)',
    }
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    const isValid = Boolean(params.gatewayReference && params.gatewayReference.trim().length >= 4)

    if (!isValid) {
      return {
        success: false,
        status: 'failed',
        gatewayTransactionId: '',
        paidAmount: 0,
        paidAt: new Date().toISOString(),
        paymentMethod: 'bank_wire',
        error: 'Please provide a valid bank deposit slip number or transaction reference.',
      }
    }

    return {
      success: true,
      status: 'paid',
      gatewayTransactionId: `BNK-REF-${params.gatewayReference.toUpperCase()}`,
      paidAmount: params.amount,
      paidAt: new Date().toISOString(),
      paymentMethod: 'bank_wire',
    }
  }
}
