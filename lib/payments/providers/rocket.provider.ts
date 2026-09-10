import { PaymentProvider, PaymentInitiateParams, PaymentInitiateResult, PaymentVerifyParams, PaymentVerifyResult } from '../types'

export class RocketPaymentProvider implements PaymentProvider {
  readonly id = 'rocket' as const
  readonly name = 'DBBL Rocket'
  readonly nameBn = 'রকেট'
  readonly category = 'mfs' as const
  readonly iconName = 'Smartphone'
  readonly description = 'Dutch-Bangla Bank Rocket biller code payment'
  readonly descriptionBn = 'ডাচ-বাংলা ব্যাংক রকেট বিলার কোডের মাধ্যমে পরিশোধ'
  readonly isSandboxSupported = true

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const timestamp = Date.now()
    const transactionId = `RKT-${timestamp.toString().slice(-8)}`
    const billerId = '3492'
    const compCode = params.companyId ? params.companyId.slice(0, 8).toUpperCase() : 'PRINT'

    return {
      success: true,
      transactionId,
      gatewayReference: `DBBL_RKT_${timestamp}`,
      instructions: [
        'Open Rocket App or dial *322#',
        'Select 1 for Payment, then 1 for Bill Pay',
        `Enter PrintERP Biller ID: ${billerId}`,
        `Enter Bill Number / Company Code: ${compCode}`,
        `Enter Amount: ৳${params.amount.toLocaleString()}`,
        'Enter your 4-digit Rocket PIN to confirm',
      ],
      accountNumber: `Biller ID: ${billerId} (PrintERP SaaS)`,
    }
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    const ref = params.gatewayReference?.trim() || ''
    const isValid = Boolean(ref.length >= 6)

    if (!isValid) {
      return {
        success: false,
        status: 'failed',
        gatewayTransactionId: '',
        paidAmount: 0,
        paidAt: new Date().toISOString(),
        paymentMethod: 'rocket',
        error: 'Invalid Rocket Txn ID.',
      }
    }

    return {
      success: true,
      status: 'paid',
      gatewayTransactionId: ref.toUpperCase(),
      paidAmount: params.amount ?? 0,
      paidAt: new Date().toISOString(),
      paymentMethod: 'rocket',
    }
  }
}
