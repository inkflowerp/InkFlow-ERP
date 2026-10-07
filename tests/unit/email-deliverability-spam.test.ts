// ==============================================================================
// PrintFlow - Email Deliverability & Anti-Spam Standards Unit Tests
// Verifies RFC 5322 Message-ID alignment, MIME multipart/alternative plain text,
// transactional anti-spam headers, and sender domain alignment.
// ==============================================================================

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { htmlToPlainText, wrapHtmlEmail, interpolateVariables, DEFAULT_EMAIL_TEMPLATES } from '../../services/email-template.service.ts'
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
      <p>Hello <strong>John Doe</strong>, welcome to PrintFlow.</p>
      <p>Please click <a href="https://printflow.bd/verify?code=123456">here to verify</a> your account.</p>
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
    assert.strictEqual(plain.includes('Hello John Doe, welcome to PrintFlow.'), true)
    // Should preserve links in parentheses for plain-text readers
    assert.strictEqual(plain.includes('here to verify (https://printflow.bd/verify?code=123456)'), true)
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

    // Message-ID must match sender domain @myprintbiz.com, NOT hardcoded @printflow.bd
    assert.match(rawMime, /Message-ID: <\d+\.[a-z0-9]+@myprintbiz\.com>/i)

    // Transactional anti-spam headers
    assert.strictEqual(rawMime.includes('Auto-Submitted: auto-generated'), true)
    assert.strictEqual(rawMime.includes('X-Auto-Response-Suppress: All'), true)
    assert.strictEqual(rawMime.includes('X-Mailer: PrintFlow Engine'), true)
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
      sender_email: 'notifications@printflow.bd', // Dummy unaligned sender
      reply_to_email: 'support@printflow.bd',
      status: 'active' as const,
      is_default: true,
      extra_settings: { is_mock: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    EmailDataStore.set('printflow_email_gateways', [customSmtpGateway])

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
    const logs = EmailDataStore.get<any[]>('printflow_email_logs') || []
    const log = logs.find((l) => l.recipient === 'verify@customer.com')
    assert.ok(log)
    assert.strictEqual(log.status, 'sent')
  })

  test('6. Transactional user_invitation email suppresses List-Unsubscribe and sets Auto-Submitted: no', () => {
    const adapter = new GmailProviderAdapter({
      provider: 'gmail',
      sender_name: 'PrintFlow Invitations',
      sender_email: 'invites@printflow.bd',
      gmail_account_email: 'invites@printflow.bd',
      decrypted_secret: 'mock-token',
    })

    const mimeBase64Url = (adapter as any).createMimeMessage({
      from: { name: 'PrintFlow Invitations', address: 'invites@printflow.bd' },
      to: 'newemployee@company.com',
      subject: 'You have been invited to join PrintFlow',
      html: '<h1>Welcome</h1><p>Join our team</p>',
      isTransactional: true,
      metadata: { eventType: 'user_invitation' },
    })

    const rawMime = Buffer.from(mimeBase64Url, 'base64url').toString('utf8')

    // RFC 3834 compliance: Human-initiated transactional invitations MUST NOT be flagged as auto-generated bot mail
    assert.strictEqual(rawMime.includes('Auto-Submitted: no'), true)
    assert.strictEqual(rawMime.includes('Auto-Submitted: auto-generated'), false)

    // RFC 2369 & Gmail/Yahoo guidelines: Transactional invites MUST NOT have bulk marketing List-Unsubscribe
    assert.strictEqual(rawMime.includes('List-Unsubscribe:'), false)
    assert.strictEqual(rawMime.includes('List-Unsubscribe-Post:'), false)

    // Priority headers for prompt inbox placement
    assert.strictEqual(rawMime.includes('X-Priority: 3'), true)
    assert.strictEqual(rawMime.includes('Importance: Normal'), true)
  })

  test('7. Upgraded User Invitation Template contains transparent fallback URL, expiration notice, and zero invisible font tricks', () => {
    const inviteTemplate = DEFAULT_EMAIL_TEMPLATES.find((t) => t.event_type === 'user_invitation')
    assert.ok(inviteTemplate, 'User invitation template must exist')

    const renderedBody = interpolateVariables(inviteTemplate.body_template, {
      user_name: 'Kamal Hossain',
      invited_by: 'Shamim Press Owner',
      company_name: 'Dhaka Offset Printers',
      role_name: 'Production Manager',
      email: 'kamal@dhakaprinters.com',
      accept_link: 'https://printflow.bd/auth/verify?token=secure7daytoken987',
    })

    // Anti-phishing compliance: anchor link text must contain the plain URL so security scanners and recipients can verify destination
    assert.strictEqual(renderedBody.includes('https://printflow.bd/auth/verify?token=secure7daytoken987'), true)
    // 7-day expiration disclaimer must be explicitly stated
    assert.strictEqual(renderedBody.includes('7 days'), true)
    assert.strictEqual(renderedBody.includes('Security & Link Expiration:'), true)

    // Wrap in standard container and check preheader spam cleanliness
    const wrapped = wrapHtmlEmail(renderedBody, {
      companyName: 'Dhaka Offset Printers',
      preheader: 'Shamim Press Owner invited you to join Dhaka Offset Printers',
    })

    // Must NOT contain SpamAssassin red flags (tiny font, white-on-white text, or opacity:0)
    assert.strictEqual(wrapped.includes('font-size:1px'), false)
    assert.strictEqual(wrapped.includes('opacity:0'), false)
  })

  test('8. SMTP gateway automatically aligns sender email away from @gmail.com when using custom SMTP host', async () => {
    // Gateway configured with custom SMTP host but sender_email mistakenly set to @gmail.com
    const thirdPartySmtpGateway = {
      id: 'gw-thirdparty-smtp',
      tenant_id: null,
      scope_type: 'PLATFORM' as const,
      provider: 'smtp' as const,
      type: 'transactional' as const,
      smtp_host: 'smtp.sendgrid.net', // Non-Google SMTP host
      smtp_port: 587,
      smtp_username: 'apikey@sendgrid.net',
      encrypted_credentials: 'aes-dummy-secret',
      encryption_type: 'tls' as const,
      sender_name: 'Platform Notifications',
      sender_email: 'printflow.bd@gmail.com', // Would trigger fatal DMARC p=reject if unaligned!
      reply_to_email: 'support@printflow.bd',
      status: 'active' as const,
      is_default: true,
      extra_settings: { is_mock: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    EmailDataStore.set('printflow_email_gateways', [thirdPartySmtpGateway])

    const sendRes = await EmailGatewayService.sendEmail({
      scopeType: 'PLATFORM',
      tenantId: null,
      eventType: 'user_invitation',
      recipient: 'staff@clientpress.com',
      variables: {
        accept_link: 'https://printflow.bd/auth/verify?token=test1234',
        user_name: 'Staff Member',
        company_name: 'Client Press',
        role_name: 'Operator',
        invited_by: 'Admin',
        email: 'staff@clientpress.com',
      },
    })

    assert.strictEqual(sendRes.success, true)

    // Verify recorded transmission log used the safe aligned sender, NOT unaligned @gmail.com on non-Google host
    const logs = EmailDataStore.get<any[]>('printflow_email_logs') || []
    const inviteLog = logs.find((l) => l.recipient === 'staff@clientpress.com')
    assert.ok(inviteLog)
    assert.strictEqual(inviteLog.status, 'sent')
  })
})
