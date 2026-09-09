// ==============================================================================
// PrintERP SaaS - Mock / Dev Provider Adapter
// High-speed simulated email provider for testing and offline development.
// ==============================================================================

import type {
  IEmailProvider,
  OutgoingEmailPayload,
  ProviderSendResult,
  ProviderConnectionResult,
  DecryptedGatewayConfig,
} from '../types.ts'

export class MockProviderAdapter implements IEmailProvider {
  readonly providerName = 'mock' as const
  private config: DecryptedGatewayConfig
  public static sentEmails: OutgoingEmailPayload[] = []

  constructor(config: DecryptedGatewayConfig) {
    this.config = config
  }

  async sendEmail(payload: OutgoingEmailPayload): Promise<ProviderSendResult> {
    MockProviderAdapter.sentEmails.push(payload)

    // Simulate small network delay
    await new Promise((resolve) => setTimeout(resolve, 50))

    const messageId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    return {
      success: true,
      messageId,
      provider: 'mock',
      timestamp: new Date().toISOString(),
      rawResponse: {
        simulated: true,
        to: payload.to,
        subject: payload.subject,
      },
    }
  }

  async verifyConnection(): Promise<ProviderConnectionResult> {
    return {
      success: true,
      provider: 'mock',
      latencyMs: 12,
      message: 'Mock Email Provider is ready and healthy (Simulated)',
    }
  }

  public static clearHistory(): void {
    MockProviderAdapter.sentEmails = []
  }
}
