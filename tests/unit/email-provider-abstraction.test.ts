// ==============================================================================
// PrintERP SaaS - Unit Tests: Email Provider Abstraction & Adapters
// ==============================================================================

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { createEmailProvider } from '../../lib/email/provider.factory.ts'
import { GmailProviderAdapter } from '../../lib/email/adapters/gmail.adapter.ts'
import { SmtpProviderAdapter } from '../../lib/email/adapters/smtp.adapter.ts'
import { MockProviderAdapter } from '../../lib/email/adapters/mock.adapter.ts'
import {
  interpolateVariables,
  wrapHtmlEmail,
} from '../../services/email-template.service.ts'

describe('Email Provider Abstraction & Factory Unit Tests', () => {
  it('1. Factory instantiates GmailProviderAdapter for "gmail" provider', () => {
    const provider = createEmailProvider({
      provider: 'gmail',
      sender_name: 'Vision Sign Press',
      sender_email: 'billing@visionsign.com',
      decrypted_secret: JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      }),
    })

    assert.ok(provider instanceof GmailProviderAdapter)
    assert.strictEqual(provider.providerName, 'gmail')
  })

  it('2. Factory instantiates SmtpProviderAdapter for "smtp" provider', () => {
    const provider = createEmailProvider({
      provider: 'smtp',
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_username: 'user@gmail.com',
      decrypted_secret: 'app-password',
      sender_name: 'Vision Sign Press',
      sender_email: 'billing@visionsign.com',
    })

    assert.ok(provider instanceof SmtpProviderAdapter)
    assert.strictEqual(provider.providerName, 'smtp')
  })

  it('3. Gmail Adapter correctly generates and sends MIME message', async () => {
    const provider = new GmailProviderAdapter({
      provider: 'gmail',
      sender_name: 'Vision Sign BD',
      sender_email: 'billing@visionsignbd.com',
      decrypted_secret: JSON.stringify({
        access_token: 'mock-test-access-token',
        refresh_token: 'mock-test-refresh-token',
      }),
    })

    const result = await provider.sendEmail({
      from: { name: 'Vision Sign BD', address: 'billing@visionsignbd.com' },
      to: 'customer@buyer.com',
      subject: 'Quotation #QUO-2026-0042',
      html: '<h1>Your Quotation is Ready</h1><p>Amount: ৳ 45,000</p>',
      text: 'Your Quotation is Ready. Amount: ৳ 45,000',
      attachments: [
        {
          filename: 'quotation-0042.pdf',
          content: 'JVBERi0xLjQKJ...',
          contentType: 'application/pdf',
        },
      ],
    })

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.provider, 'gmail')
    assert.ok(result.messageId)
  })

  it('4. Gmail Adapter verifies live connection', async () => {
    const provider = new GmailProviderAdapter({
      provider: 'gmail',
      gmail_account_email: 'info@visionsignbd.com',
      sender_name: 'Vision Sign Press',
      sender_email: 'info@visionsignbd.com',
      decrypted_secret: JSON.stringify({
        access_token: 'mock-token',
      }),
    })

    const conn = await provider.verifyConnection()
    assert.strictEqual(conn.success, true)
    assert.strictEqual(conn.provider, 'gmail')
    assert.ok(conn.latencyMs >= 0)
    assert.ok(conn.message.includes('verified'))
  })

  it('5. Template Interpolation renders English and Bengali variables correctly', () => {
    const templateBn = 'প্রিয় {{customer_name}}, {{company_name}} থেকে আপনার ইনভয়েস #{{invoice_number}} তৈরি হয়েছে। মোট: ৳ {{amount}}।'
    const rendered = interpolateVariables(templateBn, {
      customer_name: 'আহমেদ হাসান',
      company_name: 'ভিশন সাইন লিমিটেড',
      invoice_number: 'INV-0881',
      amount: '35,000',
    })

    assert.strictEqual(
      rendered,
      'প্রিয় আহমেদ হাসান, ভিশন সাইন লিমিটেড থেকে আপনার ইনভয়েস #INV-0881 তৈরি হয়েছে। মোট: ৳ 35,000।'
    )
  })

  it('6. HTML Wrapper wraps email content safely with branding', () => {
    const wrapped = wrapHtmlEmail('<p>Thank you for your order.</p>', {
      companyName: 'Vision Sign BD',
    })

    assert.ok(wrapped.includes('Vision Sign BD'))
    assert.ok(wrapped.includes('Thank you for your order.'))
    assert.ok(wrapped.includes('<!DOCTYPE html>'))
  })
})
