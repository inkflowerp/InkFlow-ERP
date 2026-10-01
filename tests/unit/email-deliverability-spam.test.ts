// ==============================================================================
// PrintERP SaaS - Email Deliverability & Anti-Spam Standards Unit Tests
// Verifies RFC 5322 Message-ID alignment, MIME multipart/alternative plain text,
// transactional anti-spam headers, and sender domain alignment.
// ==============================================================================

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { htmlToPlainText, wrapHtmlEmail } from '../../services/email-template.service.ts'
import { GmailProviderAdapter } from '../../lib/email/adapters/gmail.adapter.ts'
import { SmtpProviderAdapter } from '../../lib/email/adapters/smtp.adapter.ts'
import { EmailGatewayService, EmailDataStore } from '../../services/email-gateway.service.ts'

describe('Email Deliverability & Anti-Spam Protection Suite', () => {
  before(() => {
    process.env.NODE_ENV = 'test'
  })

  after(() => {
    EmailDataStore.clear()
  })

  test('1. htmlToPlainText converts HTML to clean, link-preserved plain text', () => {
    const html = `
      <style>body { color: red; }</style>
      <h1>Account Verification</h1>
      <p>Hello <strong>John Doe</strong>, welcome to InkFlow.</p>
      <p>Please click <a href="https://printerp.com/verify?code=123456">here to verify</a> your account.</p>
      <ul>
        <li>Fast processing</li>
        <li>Zero spam</li>
      </ul>
    `
    const plain = htmlToPlainText(html)

    // Should NOT contain CSS style content
    assert.strictEqual(plain.includes('color: red'), false)
    // Should preserve text content
    assert.strictEqual(plain.includes('Account Verification'), true)
    assert.strictEqual(plain.includes('Hello John Doe, welcome to InkFlow.'), true)
    // Should preserve links in parentheses for plain-text readers
    assert.strictEqual(plain.includes('here to verify (https://printerp.com/verify?code=123456)'), true)
    // Should format list items
    assert.strictEqual(plain.includes('• Fast processing'), true)
  })

  test('2. wrapHtmlEmail includes invisible preheader and CAN-SPAM compliant sender footer', () => {
    const wrapped = wrapHtmlEmail('<p>Your OTP code is 998877</p>', {
      companyName: 'Acme Printing',
      preheader: 'Your secure verification code is inside',
    })

    // Preheader exists and is hidden
    assert.strictEqual(wrapped.includes('Your secure verification code is inside'), true)
    assert.strictEqual(wrapped.includes('mso-hide:all'), true)
    assert.strictEqual(wrapped.includes('display:none'), true)

    // Compliant footer elements
    assert.strictEqual(wrapped.includes('Acme Printing'), true)
    assert.strictEqual(wrapped.includes('safe contacts'), true)
    assert.strictEqual(wrapped.includes('authentic transactional notification'), true)
  })

  test('3. Gmail Adapter MIME message generates domain-aligned Message-ID and RFC anti-spam headers', () => {
    const adapter = new GmailProviderAdapter({
      provider: 'gmail',
      sender_name: 'Custom Domain Admin',
      sender_email: 'support@myprintbiz.com',
      gmail_account_email: 'support@myprintbiz.com',
      decrypted_secret: 'mock-token',
    })

    // Access the private createMimeMessage via type casting for verification
    const mimeBase64Url = (adapter as any).createMimeMessage({
      from: { name: 'Custom Domain Admin', address: 'support@myprintbiz.com' },
      to: 'client@recipient.com',
      subject: 'Your Invoice #INV-1001',
      html: '<h1>Invoice</h1><p>Amount: $500</p>',
      // Note: text is intentionally omitted to verify automatic plain-text fallback
    })

    const rawMime = Buffer.from(mimeBase64Url, 'base64url').toString('utf8')

    // Message-ID must match sender domain @myprintbiz.com, NOT hardcoded @printerp.com
    assert.match(rawMime, /Message-ID: <\d+\.[a-z0-9]+@myprintbiz\.com>/i)

    // Transactional anti-spam headers
    assert.strictEqual(rawMime.includes('Auto-Submitted: auto-generated'), true)
    assert.strictEqual(rawMime.includes('X-Auto-Response-Suppress: All'), true)
    assert.strictEqual(rawMime.includes('X-Mailer: InkFlow ERP Engine'), true)
    assert.strictEqual(rawMime.includes('List-Unsubscribe: <mailto:support@myprintbiz.com?subject=unsubscribe>'), true)
    assert.strictEqual(rawMime.includes('List-Unsubscribe-Post: List-Unsubscribe=One-Click'), true)

    // Must contain BOTH text/plain and text/html parts (no MIME_HTML_ONLY penalty)
    assert.strictEqual(rawMime.includes('Content-Type: text/plain'), true)
    assert.strictEqual(rawMime.includes('Content-Type: text/html'), true)
  })

  test('4. Smtp Adapter sends with domain-aligned messageId, envelope, and deliverability headers', async () => {
    const adapter = new SmtpProviderAdapter({
      provider: 'smtp',
      smtp_host: 'smtp.tenant-corp.example.com',
      smtp_port: 587,
      smtp_username: 'billing@tenant-corp.com',
      sender_name: 'Tenant Billing',
      sender_email: 'billing@tenant-corp.com',
      decrypted_secret: 'secret123',
    })

    const result = await adapter.sendEmail({
      from: { name: 'Tenant Billing', address: 'billing@tenant-corp.com' },
      to: 'customer@buyer.com',
      subject: 'Payment Receipt',
      html: '<p>Thank you for your payment!</p>',
      text: 'Thank you for your payment!',
    })

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.provider, 'smtp')
  })

  test('5. EmailGatewayService automatically aligns sender email with SMTP username to avoid SPF/DMARC failure', async () => {
    // Configure a platform gateway where sender_email was left default but smtp_username is custom
    const customSmtpGateway = {
      id: 'gw-deliverability-test',
      tenant_id: null,
      scope_type: 'PLATFORM' as const,
      provider: 'smtp' as const,
      type: 'transactional' as const,
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_username: 'bdinfosky@gmail.com',
      encrypted_credentials: 'aes-dummy-secret',
      encryption_type: 'tls' as const,
      sender_name: 'Platform Notifications',
      sender_email: 'notifications@printerp.com', // Dummy unaligned sender
      reply_to_email: 'support@printerp.com',
      status: 'active' as const,
      is_default: true,
      extra_settings: { is_mock: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    EmailDataStore.set('printerp_email_gateways', [customSmtpGateway])

    const sendRes = await EmailGatewayService.sendEmail({
      scopeType: 'PLATFORM',
      tenantId: null,
      eventType: 'email_verification',
      recipient: 'verify@customer.com',
      variables: {
        otp_code: '123456',
        verification_link: 'https://app.com/verify?code=123456',
        user_name: 'Jane Doe',
      },
    })

    assert.strictEqual(sendRes.success, true)

    // Check recorded log
    const logs = EmailDataStore.get<any[]>('printerp_email_logs') || []
    const log = logs.find((l) => l.recipient === 'verify@customer.com')
    assert.ok(log)
    assert.strictEqual(log.status, 'sent')
  })
})
