import { PaymentGatewayType } from '@/types/subscription.types'
import {
  PaymentProvider,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentVerifyParams,
  PaymentVerifyResult,
} from './types'
import { BkashPaymentProvider } from './providers/bkash.provider'
import { NagadPaymentProvider } from './providers/nagad.provider'
import { RocketPaymentProvider } from './providers/rocket.provider'
import { SSLCommerzPaymentProvider } from './providers/sslcommerz.provider'
import { BankWirePaymentProvider } from './providers/bank-wire.provider'

class PaymentRegistry {
  private providers: Map<PaymentGatewayType, PaymentProvider> = new Map()

  constructor() {
    this.register(new BkashPaymentProvider())
    this.register(new NagadPaymentProvider())
    this.register(new RocketPaymentProvider())
    this.register(new SSLCommerzPaymentProvider())
    this.register(new BankWirePaymentProvider())
  }

  register(provider: PaymentProvider): void {
    this.providers.set(provider.id, provider)
  }

  getProvider(id: PaymentGatewayType): PaymentProvider {
    const provider = this.providers.get(id)
    if (!provider) {
      // Fallback to bKash if provider not found
      return this.providers.get('bkash') || new BkashPaymentProvider()
    }
    return provider
  }

  getAllProviders(): PaymentProvider[] {
    return Array.from(this.providers.values())
  }

  async initiatePayment(
    gatewayId: PaymentGatewayType,
    params: PaymentInitiateParams
  ): Promise<PaymentInitiateResult> {
    const provider = this.getProvider(gatewayId)
    return provider.initiatePayment(params)
  }

  async verifyPayment(
    gatewayId: PaymentGatewayType,
    params: PaymentVerifyParams
  ): Promise<PaymentVerifyResult> {
    const provider = this.getProvider(gatewayId)
    return provider.verifyPayment(params)
  }
}

export const paymentRegistry = new PaymentRegistry()
