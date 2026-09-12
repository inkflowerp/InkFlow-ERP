// ==============================================================================
// PrintERP SaaS - Email Provider Factory
// Instantiates and returns the appropriate IEmailProvider adapter.
// ==============================================================================

import type { IEmailProvider, DecryptedGatewayConfig } from './types.ts'
import { GmailProviderAdapter } from './adapters/gmail.adapter.ts'
import { SmtpProviderAdapter } from './adapters/smtp.adapter.ts'
import { ResendProviderAdapter } from './adapters/resend.adapter.ts'
import { SendGridProviderAdapter } from './adapters/sendgrid.adapter.ts'
import { SesProviderAdapter } from './adapters/ses.adapter.ts'
import { MockProviderAdapter } from './adapters/mock.adapter.ts'

export function createEmailProvider(config: DecryptedGatewayConfig): IEmailProvider {
  switch (config.provider) {
    case 'gmail':
      return new GmailProviderAdapter(config)
    case 'smtp':
    case 'custom':
      return new SmtpProviderAdapter(config)
    case 'resend':
      return new ResendProviderAdapter(config)
    case 'sendgrid':
      return new SendGridProviderAdapter(config)
    case 'ses':
      return new SesProviderAdapter(config)
    case 'mock':
    default:
      // If in test environment or mock provider requested
      if (config.provider === 'mock' || process.env.NODE_ENV === 'test') {
        return new MockProviderAdapter(config)
      }
      return new SmtpProviderAdapter(config)
  }
}
