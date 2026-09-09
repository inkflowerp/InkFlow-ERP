import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { EmailGatewayService, EmailDataStore } from '../../services/email-gateway.service.ts'
import { MockProviderAdapter } from '../../lib/email/adapters/mock.adapter.ts'

describe('Email Queue Asynchronous Processing & Retry Unit Tests', () => {
  beforeEach(() => {
    EmailDataStore.set('printerp_email_queue', [])
    EmailDataStore.set('printerp_email_logs', [])
    MockProviderAdapter.clearHistory()
  })

  it('1. Enqueues email job successfully without blocking', async () => {
    const res = await EmailGatewayService.sendEmail({
      tenantId: 'tenant-test',
      eventType: 'payment_received',
      recipient: 'payee@client.com',
      variables: {
        customer_name: 'Delta Digital Press',
        invoice_number: 'INV-1004',
        amount: '25,000',
      },
      queueNow: true,
    })

    assert.strictEqual(res.success, true)
    assert.strictEqual(res.status, 'queued')
    assert.ok(res.messageId)

    const queue = EmailDataStore.get<any[]>('printerp_email_queue') || []
    assert.strictEqual(queue.length, 1)
    assert.strictEqual(queue[0].recipient, 'payee@client.com')
    assert.strictEqual(queue[0].status, 'pending')
  })

  it('2. Processes pending queue jobs and marks them completed', async () => {
    await EmailGatewayService.sendEmail({
      tenantId: 'tenant-test',
      eventType: 'job_completed',
      recipient: 'dispatch@client.com',
      variables: {
        customer_name: 'Metro Prints Ltd',
        job_number: 'JOB-771',
      },
      queueNow: true,
    })

    const processRes = await EmailGatewayService.processQueue(5)
    assert.strictEqual(processRes.processed, 1)
    assert.strictEqual(processRes.succeeded, 1)
    assert.strictEqual(processRes.failed, 0)

    const queue = EmailDataStore.get<any[]>('printerp_email_queue') || []
    assert.strictEqual(queue[0].status, 'completed')
    assert.strictEqual(queue[0].attempts, 1)
  })
})
