// ==============================================================================
// PrintERP SaaS - Unit Tests: Business Email Event Dispatches
// ==============================================================================

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { BusinessEmailService } from '../../services/business-email.service.ts'
import { EmailDataStore } from '../../services/email-gateway.service.ts'
import type { EmailGatewayRecord, EmailLogRecord } from '../../types/communication.types.ts'

describe('Business Email Event Workflow Unit Tests', () => {
  const companyId = 'company-test-biz-01'

  beforeEach(() => {
    // Seed tenant gateway
    const tenantGw: EmailGatewayRecord = {
      id: 'gw-biz-tenant',
      tenant_id: companyId,
      scope_type: 'TENANT',
      provider: 'mock',
      type: 'transactional',
      sender_name: 'Metro Sign & Print',
      sender_email: 'billing@metrosign.com',
      status: 'active',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    EmailDataStore.set('printerp_email_gateways', [tenantGw])
    EmailDataStore.set('printerp_email_logs', [])
  })

  it('1. Dispatches Quotation Email with customer & price details', async () => {
    const res = await BusinessEmailService.sendQuotationEmail({
      companyId,
      companyName: 'Metro Sign & Print',
      quotationId: 'quo-901',
      quotationNumber: 'QUO-2026-0901',
      customerName: 'Dhaka City Corporation',
      recipientEmail: 'procurement@dhakacity.gov.bd',
      grandTotal: 120000,
      validUntil: '30-Nov-2026',
      notes: 'Includes 15% NBR VAT and delivery to Gulshan site.',
    })

    assert.strictEqual(res.success, true)
    assert.strictEqual(res.status, 'sent')

    const logs = EmailDataStore.get<EmailLogRecord[]>('printerp_email_logs') || []
    assert.strictEqual(logs.length, 1)
    assert.strictEqual(logs[0].event_type, 'quotation_sent')
    assert.strictEqual(logs[0].recipient, 'procurement@dhakacity.gov.bd')
  })

  it('2. Dispatches Invoice Bill Email with due amount and payment link', async () => {
    const res = await BusinessEmailService.sendInvoiceEmail({
      companyId,
      companyName: 'Metro Sign & Print',
      invoiceId: 'inv-441',
      invoiceNumber: 'INV-2026-0441',
      customerName: 'Pran-RFL Group',
      recipientEmail: 'finance@pranrfl.com',
      totalAmount: 250000,
      paidAmount: 100000,
      dueAmount: 150000,
      dueDate: '15-Dec-2026',
      paymentLink: 'https://printerp.com/pay/INV-0441',
    })

    assert.strictEqual(res.success, true)
    assert.strictEqual(res.status, 'sent')
  })

  it('3. Dispatches Payment Receipt Voucher Email', async () => {
    const res = await BusinessEmailService.sendPaymentReceiptEmail({
      companyId,
      companyName: 'Metro Sign & Print',
      paymentId: 'pay-771',
      receiptNumber: 'REC-0771',
      invoiceNumber: 'INV-2026-0441',
      customerName: 'Pran-RFL Group',
      recipientEmail: 'accounts@pranrfl.com',
      amountPaid: 100000,
      remainingDue: 150000,
      paymentMethod: 'bKash Merchant',
    })

    assert.strictEqual(res.success, true)
    assert.strictEqual(res.status, 'sent')
  })

  it('4. Dispatches Overdue Due Reminder Email', async () => {
    const res = await BusinessEmailService.sendDueReminderEmail({
      companyId,
      companyName: 'Metro Sign & Print',
      customerName: 'Aarong Retail Ltd',
      recipientEmail: 'billing@aarong.com',
      totalDueAmount: 85000,
      overdueInvoicesSummary: 'INV-0312, INV-0315',
    })

    assert.strictEqual(res.success, true)
    assert.strictEqual(res.status, 'sent')
  })

  it('5. Dispatches Graphic Design Proof Approval Request', async () => {
    const res = await BusinessEmailService.sendDesignApprovalEmail({
      companyId,
      companyName: 'Metro Sign & Print',
      designId: 'dsg-552',
      jobTitle: 'Acrylic LED Letter Signage 3D',
      customerName: 'Beximco Pharma',
      recipientEmail: 'brand@beximco.com',
      proofUrl: 'https://printerp.com/proofs/dsg-552/review',
      approvalDeadline: 'Tomorrow 5:00 PM',
    })

    assert.strictEqual(res.success, true)
    assert.strictEqual(res.status, 'sent')
  })

  it('6. Dispatches Delivery Challan Notification', async () => {
    const res = await BusinessEmailService.sendDeliveryEmail({
      companyId,
      companyName: 'Metro Sign & Print',
      deliveryId: 'del-109',
      challanNumber: 'CHAL-0109',
      orderNumber: 'ORD-2026-0099',
      customerName: 'Akij Food & Beverage',
      recipientEmail: 'logistics@akij.net',
      deliveryDate: 'Today',
      driverContact: 'Driver Kamal (+8801811223344)',
    })

    assert.strictEqual(res.success, true)
    assert.strictEqual(res.status, 'sent')
  })
})
