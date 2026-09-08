import { PaymentGatewayType, PlanCode, BillingInterval } from '@/types/subscription.types'

export type PaymentCategory = 'mfs' | 'gateway' | 'bank' | 'offline'

export interface PaymentInitiateParams {
  subscriptionId: string
  companyId: string
  companyName: string
  planCode: PlanCode
  planName: string
  billingInterval: BillingInterval
  amount: number
  currency: 'BDT'
  customerName: string
  customerPhone: string
  customerEmail?: string
  redirectUrl?: string
  cancelUrl?: string
}

export interface PaymentInitiateResult {
  success: boolean
  transactionId: string
  gatewayReference?: string
  checkoutUrl?: string
  instructions?: string[]
  requiresManualVerification?: boolean
  accountNumber?: string
  error?: string
}

export interface PaymentVerifyParams {
  transactionId: string
  gatewayReference: string
  amount: number
  paymentDetails?: Record<string, unknown>
}

export interface PaymentVerifyResult {
  success: boolean
  status: 'paid' | 'failed' | 'pending'
  gatewayTransactionId: string
  paidAmount: number
  paidAt: string
  paymentMethod: PaymentGatewayType
  error?: string
}

export interface PaymentProvider {
  readonly id: PaymentGatewayType
  readonly name: string
  readonly nameBn: string
  readonly category: PaymentCategory
  readonly iconName: string
  readonly description: string
  readonly descriptionBn: string
  readonly badge?: string
  readonly isSandboxSupported: boolean

  initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult>
  verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult>
}
