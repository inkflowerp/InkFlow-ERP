import { describe, it } from 'node:test'
import assert from 'node:assert'
import { GreenwebSmsAdapter } from '../../lib/sms/adapters/greenweb.adapter.ts'
import { BulkSmsBdAdapter } from '../../lib/sms/adapters/bulksmsbd.adapter.ts'
import { SslWirelessSmsAdapter } from '../../lib/sms/adapters/ssl-wireless.adapter.ts'
import { TwilioSmsAdapter } from '../../lib/sms/adapters/twilio.adapter.ts'
import { BkashPaymentAdapter } from '../../lib/payments/adapters/bkash.adapter.ts'
import { SslCommerzPaymentAdapter } from '../../lib/payments/adapters/sslcommerz.adapter.ts'
import { UddoktaPayPaymentAdapter } from '../../lib/payments/adapters/uddoktapay.adapter.ts'
import { MetaWhatsAppAdapter } from '../../lib/whatsapp/adapters/meta-whatsapp.adapter.ts'
import { TelegramBotAdapter } from '../../lib/telegram/adapters/telegram-bot.adapter.ts'

describe('Gateway Provider Adapters Unit Tests', () => {
  it('1. Greenweb SMS adapter validates missing credentials fail-closed', async () => {
    const adapter = new GreenwebSmsAdapter({ token: '' })
    const res = await adapter.testConnection()
    assert.strictEqual(res.success, false)
    assert.ok(res.message.includes('missing'))
  })

  it('2. BulkSMSBD adapter validates missing credentials fail-closed', async () => {
    const adapter = new BulkSmsBdAdapter({ apiKey: '' })
    const res = await adapter.testConnection()
    assert.strictEqual(res.success, false)
    assert.ok(res.message.includes('missing'))
  })

  it('3. SSL Wireless SMS adapter validates missing credentials', async () => {
    const adapter = new SslWirelessSmsAdapter({ apiToken: '', sid: '' })
    const res = await adapter.testConnection()
    assert.strictEqual(res.success, false)
    assert.ok(res.message.includes('required'))
  })

  it('4. Twilio SMS adapter validates missing credentials', async () => {
    const adapter = new TwilioSmsAdapter({ accountSid: '', authToken: '' })
    const res = await adapter.testConnection()
    assert.strictEqual(res.success, false)
  })

  it('5. bKash payment adapter rejects initiation when credentials incomplete', async () => {
    const adapter = new BkashPaymentAdapter({ appKey: '', appSecret: '', username: '', password: '' })
    const res = await adapter.initiatePayment({
      amount: 1500,
      currency: 'BDT',
      customerName: 'Test Customer',
      customerPhone: '01711223344',
      companyName: 'Test Corp',
    })
    assert.strictEqual(res.success, false)
  })

  it('6. SSLCOMMERZ payment adapter validates missing store credentials', async () => {
    const adapter = new SslCommerzPaymentAdapter({ storeId: '', storePassword: '' })
    const res = await adapter.testConnection()
    assert.strictEqual(res.success, false)
    assert.ok(res.message.includes('required'))
  })

  it('7. UddoktaPay payment adapter validates missing API key', async () => {
    const adapter = new UddoktaPayPaymentAdapter({ apiKey: '' })
    const res = await adapter.testConnection()
    assert.strictEqual(res.success, false)
  })

  it('8. Meta WhatsApp Cloud API adapter validates missing access token', async () => {
    const adapter = new MetaWhatsAppAdapter({ accessToken: '', phoneNumberId: '' })
    const res = await adapter.testConnection()
    assert.strictEqual(res.success, false)
    assert.ok(res.message.includes('required'))
  })

  it('9. Telegram Bot API adapter validates missing token', async () => {
    const adapter = new TelegramBotAdapter({ botToken: '' })
    const res = await adapter.testConnection()
    assert.strictEqual(res.success, false)
    assert.ok(res.message.includes('required'))
  })
})
