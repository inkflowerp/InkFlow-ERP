// ==============================================================================
// PrintERP SaaS - Unified Payment Gateway Provider Interface & Types
// Supports Bangladesh-first Payment Gateways (bKash, SSLCOMMERZ, Nagad, UddoktaPay, Stripe)
// ==============================================================================

import type { PaymentGatewayType, PlanCode, BillingInterval } from '../../types/subscription.types.ts'

export type PaymentCategory = 'mfs' | 'gateway' | 'bank' | 'offline'

export interface PaymentInitiateParams {
  subscriptionId?: string
  invoiceId?: string
  companyId?: string
  companyName: string
  planCode?: PlanCode | string
  planName?: string
  billingInterval?: BillingInterval
  amount: number
  currency: 'BDT' | 'USD'
  customerName: string
  customerPhone: string
  customerEmail?: string
  redirectUrl?: string
  cancelUrl?: string
  callbackUrl?: string
  metadata?: Record<string, any>
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
  rawResponse?: any
}

export interface PaymentVerifyParams {
  transactionId: string
  gatewayReference?: string
  paymentId?: string
  amount?: number
  currency?: string
  paymentDetails?: Record<string, unknown>
}

export interface PaymentVerifyResult {
  success: boolean
  status: 'paid' | 'failed' | 'pending' | 'cancelled' | 'refunded'
  gatewayTransactionId: string
  paidAmount: number
  currency?: string
  paidAt: string
  paymentMethod: PaymentGatewayType
  rawResponse?: any
  error?: string
}

export interface PaymentConnectionTestResult {
  success: boolean
  provider: PaymentGatewayType
  latency_ms: number
  environment: 'sandbox' | 'live'
  message: string
  merchantId?: string
  details?: Record<string, any>
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

  testConnection?(): Promise<PaymentConnectionTestResult>
  initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult>
  verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult>
  refundPayment?(transactionId: string, amount: number, reason?: string): Promise<{ success: boolean; refundId?: string; error?: string }>
}

export interface PaymentGatewayMeta {
  id: PaymentGatewayType
  name: string
  nameBn: string
  category: PaymentCategory
  iconName: string
  description: string
  descriptionBn: string
  instructions?: string[]
}

export const PAYMENT_GATEWAY_METADATA_LIST: PaymentGatewayMeta[] = [
  {
    id: 'bkash',
    name: 'bKash Checkout',
    nameBn: 'বিকাশ পেমেন্ট',
    category: 'mfs',
    iconName: 'Smartphone',
    description: 'Instant automated payment via bKash payment gateway',
    descriptionBn: 'বিকাশ গেটওয়ের মাধ্যমে তাৎক্ষণিক পেমেন্ট',
    instructions: [
      'Click proceed to open bKash checkout page or sandbox simulator.',
      'Enter your bKash mobile number and verify with OTP.',
      'Enter your PIN to complete the transaction securely.',
    ],
  },
  {
    id: 'sslcommerz',
    name: 'SSLCOMMERZ',
    nameBn: 'এসএসএল কমার্জ',
    category: 'gateway',
    iconName: 'CreditCard',
    description: 'Cards (Visa, Master, Amex), Internet Banking, & all MFS',
    descriptionBn: 'সকল ব্যাংক কার্ড, ইন্টারনেট ব্যাংকিং ও মোবাইল ওয়ালেট',
    instructions: [
      'You will be redirected to the secure SSLCOMMERZ payment gateway.',
      'Choose from Cards, Mobile Banking (bKash/Nagad/Rocket), or Net Banking.',
      'Complete authentication to confirm payment immediately.',
    ],
  },
  {
    id: 'nagad',
    name: 'Nagad Direct',
    nameBn: 'নগদ ডিরেক্ট',
    category: 'mfs',
    iconName: 'Smartphone',
    description: 'Seamless checkout via Nagad direct API',
    descriptionBn: 'নগদ ডিরেক্ট এপিআই এর মাধ্যমে সহজ পেমেন্ট',
    instructions: [
      'Click proceed to open Nagad payment portal.',
      'Enter your Nagad account number and OTP.',
      'Confirm transaction with your secret PIN.',
    ],
  },
  {
    id: 'uddoktapay',
    name: 'UddoktaPay',
    nameBn: 'উদ্যোক্তাপেমেন্ট',
    category: 'gateway',
    iconName: 'Zap',
    description: 'Multi-gateway aggregator for BD merchants',
    descriptionBn: 'বাংলাদেশি মার্চেন্টদের জন্য মাল্টি-গেটওয়ে এগ্রিগেটর',
    instructions: [
      'Redirects to UddoktaPay hosted checkout page.',
      'Select any Bangladesh payment method to pay.',
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe (International)',
    nameBn: 'স্ট্রাইপ (আন্তর্জাতিক)',
    category: 'gateway',
    iconName: 'CreditCard',
    description: 'International credit/debit cards (USD/BDT)',
    descriptionBn: 'আন্তর্জাতিক ক্রেডিট/ডেবিট কার্ড',
    instructions: [
      'Redirects to Stripe Checkout session.',
      'Pay with Visa, MasterCard, American Express.',
    ],
  },
  {
    id: 'bank_wire',
    name: 'Bank Transfer / Wire',
    nameBn: 'ব্যাংক ট্রান্সফার / চেক',
    category: 'bank',
    iconName: 'Landmark',
    description: 'Manual deposit / EFT / RTGS to platform corporate account',
    descriptionBn: 'প্ল্যাটফর্মের ব্যাংক একাউন্টে সরাসরি জমা বা ট্রান্সফার',
    instructions: [
      'Transfer funds to City Bank: PrintERP Ltd (A/C: 1102938475001, Branch: Principal).',
      'Enter the transaction / deposit reference number in the box below.',
      'Platform administrator will verify and activate your subscription.',
    ],
  },
]

