import { PaymentProvider, PaymentInitiateParams, PaymentInitiateResult, PaymentVerifyParams, PaymentVerifyResult } from '../types'

export class SSLCommerzPaymentProvider implements PaymentProvider {
  readonly id = 'sslcommerz' as const
  readonly name = 'SSLCommerz'
  readonly nameBn = 'এসএসএল কমার্জ'
  readonly category = 'gateway' as const
  readonly iconName = 'CreditCard'
  readonly description = 'Cards (Visa/Mastercard/Amex), Internet Banking & All MFS'
  readonly descriptionBn = 'ভিসা, মাস্টারকার্ড, ইন্টারনেট ব্যাংকিং ও সকল এমএফএস গেটওয়ে'
  readonly badge = 'Cards & Banks'
  readonly isSandboxSupported = true

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const timestamp = Date.now()
    const transactionId = `SSLC-${timestamp.toString().slice(-8)}`
    const sessionKey = `SSLC_SESSION_${timestamp}`

    return {
      success: true,
      transactionId,
      gatewayReference: sessionKey,
      checkoutUrl: `https://sandbox.sslcommerz.com/gwprocess/v4/simulator?session=${sessionKey}&amount=${params.amount}`,
      instructions: [
        'You will be redirected to the secure SSLCommerz payment gateway',
        'Choose your preferred payment instrument: Debit/Credit Card, MFS, or Net Banking',
        'Follow bank 2FA OTP prompt to complete payment',
        'Your subscription will automatically activate upon successful callback',
      ],
      accountNumber: 'Online Payment Gateway Session',
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
        paymentMethod: 'sslcommerz',
        error: 'Invalid SSLCommerz validation session or transaction ID.',
      }
    }

    return {
      success: true,
      status: 'paid',
      gatewayTransactionId: `VAL_${params.gatewayReference.toUpperCase()}`,
      paidAmount: params.amount,
      paidAt: new Date().toISOString(),
      paymentMethod: 'sslcommerz',
    }
  }
}
