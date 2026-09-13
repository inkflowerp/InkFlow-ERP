import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PdfGeneratorService } from '../../services/pdf-generator.service.ts'
import {
  CommunicationTemplateService,
  SUPPORTED_TEMPLATE_VARIABLES,
  DEFAULT_QUOTATION_COMMUNICATION_TEMPLATE,
  DEFAULT_INVOICE_COMMUNICATION_TEMPLATE,
} from '../../services/communication-templates.service.ts'
import { BusinessEmailService } from '../../services/business-email.service.ts'
import { BillingService } from '../../services/billing.service.ts'
import { EmailDataStore } from '../../services/email-gateway.service.ts'
import type { QuotationRecord } from '../../types/quotation.types.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'

describe('Quotation & Invoice PDF and Communication Template Suite', () => {
  const mockCompany = {
    id: 'comp-01',
    name: 'PrintCraft Visuals Ltd.',
    slug: 'printcraft',
    address: '42 Motijheel C/A, Dhaka',
    phone: '+880 1711-223344',
    email: 'billing@printcraft.com',
    bin: '18291004821',
  }

  const mockQuotation: QuotationRecord = {
    id: 'quote-01',
    company_id: 'comp-01',
    quotation_number: 'Q-2026-0099',
    customer_name: 'Metro Retail Ltd.',
    customer_phone: '01711223344',
    customer_email: 'finance@metroretail.com',
    status: 'draft',
    quotation_date: '2026-09-14',
    valid_until: '2026-09-29',
    salesperson_name: 'Imtiaz Ahmed',
    items: [
      {
        id: 'qi-1',
        description: 'PVC Flex Banner 10x20 ft',
        width: 10,
        height: 20,
        dimension_unit: 'ft',
        area_sft: 200,
        quantity: 1,
        unit: 'pcs',
        unit_rate: 150,
        item_total: 30000,
      },
    ],
    subtotal: 30000,
    discount_amount: 0,
    vat_rate: 7.5,
    vat_amount: 2250,
    grand_total: 32250,
    total_cost: 20000,
    margin_percent: 38,
    language_mode: 'bn',
    created_at: '2026-09-14T00:00:00Z',
    updated_at: '2026-09-14T00:00:00Z',
  }

  const mockInvoice: InvoiceRecord = {
    id: 'inv-01',
    company_id: 'comp-01',
    invoice_number: 'INV-2026-0501',
    invoice_type: 'sales_invoice',
    customer_id: 'cust-01',
    customer_name: 'Metro Retail Ltd.',
    customer_phone: '01711223344',
    customer_email: 'finance@metroretail.com',
    customer_bin: '0029104821',
    invoice_date: '2026-09-14',
    due_date: '2026-09-21',
    status: 'unpaid',
    items: [
      {
        id: 'ii-1',
        item_name: 'PVC Flex Banner 10x20 ft',
        item_description: 'PVC Flex Banner 10x20 ft',
        quantity: 1,
        unit: 'pcs',
        unit_price: 30000,
        vat_percentage: 7.5,
        total_price: 30000,
      },
    ],
    subtotal: 30000,
    discount_amount: 0,
    vat_percentage: 7.5,
    vat_amount: 2250,
    grand_total: 32250,
    paid_amount: 10000,
    due_amount: 22250,
    write_off_amount: 0,
    created_by_name: 'Admin User',
    created_at: '2026-09-14T00:00:00Z',
    updated_at: '2026-09-14T00:00:00Z',
  }

  beforeEach(() => {
    EmailDataStore.clear()
    // Configure an active mock tenant email gateway in test data store
    EmailDataStore.set('printerp_email_gateways', [
      {
        id: 'gw-tenant-test',
        tenant_id: 'comp-01',
        scope_type: 'TENANT',
        provider: 'mock',
        status: 'active',
        sender_name: 'PrintCraft Billing',
        sender_email: 'billing@printcraft.com',
      },
    ])
  })

  test('1. Native PDF Generator produces valid standard PDF-1.4 buffer for Quotations', () => {
    const pdfBuf = PdfGeneratorService.generateQuotationPdf(mockQuotation, mockCompany)
    assert.ok(Buffer.isBuffer(pdfBuf), 'Must return a Buffer')
    assert.ok(pdfBuf.length > 500, 'PDF buffer should be substantial')

    const pdfString = pdfBuf.toString('utf8')
    assert.ok(pdfString.startsWith('%PDF-1.4'), 'Must start with PDF 1.4 header')
    assert.ok(pdfString.includes('%%EOF'), 'Must end with EOF marker')
    assert.ok(pdfString.includes('Q-2026-0099'), 'Must contain Quotation Number')
    assert.ok(pdfString.includes('PRICE PROPOSAL'), 'Must contain Quotation title')
  })

  test('2. Native PDF Generator produces valid standard PDF-1.4 buffer for Invoices', () => {
    const pdfBuf = PdfGeneratorService.generateInvoicePdf(mockInvoice, mockCompany)
    assert.ok(Buffer.isBuffer(pdfBuf), 'Must return a Buffer')
    assert.ok(pdfBuf.length > 500, 'PDF buffer should be substantial')

    const pdfString = pdfBuf.toString('utf8')
    assert.ok(pdfString.startsWith('%PDF-1.4'), 'Must start with PDF 1.4 header')
    assert.ok(pdfString.includes('%%EOF'), 'Must end with EOF marker')
    assert.ok(pdfString.includes('INV-2026-0501'), 'Must contain Invoice Number')
    assert.ok(pdfString.includes('COMMERCIAL SALES INVOICE'), 'Must contain Invoice title')
  })

  test('3. CommunicationTemplateService correctly builds variables & interpolates templates', () => {
    const vars = CommunicationTemplateService.buildQuotationVariables(mockQuotation, mockCompany, 'https://printerp.app')
    assert.strictEqual(vars.customer_name, 'Metro Retail Ltd.')
    assert.strictEqual(vars.quotation_number, 'Q-2026-0099')
    assert.ok(vars.grand_total.includes('32,250'))
    assert.ok(vars.document_link.includes('printcraft/quotations/quote-01'))

    const tpl = 'Hello {{customer_name}}, your quote #{{quotation_number}} total is ৳ {{grand_total}}.'
    const rendered = CommunicationTemplateService.interpolate(tpl, vars)
    assert.strictEqual(rendered, 'Hello Metro Retail Ltd., your quote #Q-2026-0099 total is ৳ 32,250.')
  })

  test('4. CommunicationTemplateService interpolates Invoice variables accurately', () => {
    const vars = CommunicationTemplateService.buildInvoiceVariables(mockInvoice, mockCompany, 'https://printerp.app')
    assert.strictEqual(vars.invoice_number, 'INV-2026-0501')
    assert.ok(vars.due_amount.includes('22,250'))
    assert.ok(vars.paid_amount.includes('10,000'))

    const tpl = 'Invoice #{{invoice_number}} has balance due ৳ {{due_amount}}.'
    const rendered = CommunicationTemplateService.interpolate(tpl, vars)
    assert.strictEqual(rendered, 'Invoice #INV-2026-0501 has balance due ৳ 22,250.')
  })

  test('5. BusinessEmailService sends quotation email with PDF attachment', async () => {
    const pdfBuf = PdfGeneratorService.generateQuotationPdf(mockQuotation, mockCompany)
    const result = await BusinessEmailService.sendQuotationEmail({
      companyId: 'comp-01',
      companyName: mockCompany.name,
      quotationId: mockQuotation.id,
      quotationNumber: mockQuotation.quotation_number,
      customerName: mockQuotation.customer_name,
      recipientEmail: 'client@example.com',
      grandTotal: mockQuotation.grand_total,
      customSubject: 'Official Proposal #Q-2026-0099',
      customHtmlBody: '<p>Please find attached proposal PDF.</p>',
      attachments: [
        {
          filename: 'Quotation-Q-2026-0099.pdf',
          content: pdfBuf,
          contentType: 'application/pdf',
        },
      ],
    })

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.status, 'sent')
  })

  test('6. BusinessEmailService sends invoice email with PDF attachment', async () => {
    const pdfBuf = PdfGeneratorService.generateInvoicePdf(mockInvoice, mockCompany)
    const result = await BusinessEmailService.sendInvoiceEmail({
      companyId: 'comp-01',
      companyName: mockCompany.name,
      invoiceId: mockInvoice.id,
      invoiceNumber: mockInvoice.invoice_number,
      customerName: mockInvoice.customer_name,
      recipientEmail: 'client@example.com',
      totalAmount: mockInvoice.grand_total,
      paidAmount: mockInvoice.paid_amount || 0,
      dueAmount: mockInvoice.due_amount || 0,
      customSubject: 'Sales Invoice #INV-2026-0501',
      customHtmlBody: '<p>Please find attached invoice PDF.</p>',
      attachments: [
        {
          filename: 'Invoice-INV-2026-0501.pdf',
          content: pdfBuf,
          contentType: 'application/pdf',
        },
      ],
    })

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.status, 'sent')
  })

  test('7. BillingService.sendInvoice strictly rejects SMS with deprecation error', async () => {
    const smsRes = await BillingService.sendInvoice({
      companyId: 'comp-01',
      invoiceId: 'inv-01',
      channel: 'sms',
    })

    assert.strictEqual(smsRes.success, false)
    assert.ok(smsRes.error?.includes('SMS dispatch is deprecated and disabled'))
  })

  test('8. SUPPORTED_TEMPLATE_VARIABLES matches recommended whitelist across all 5 categories', () => {
    assert.ok(SUPPORTED_TEMPLATE_VARIABLES.company.length >= 5)
    assert.ok(SUPPORTED_TEMPLATE_VARIABLES.customer.length >= 6)
    assert.ok(SUPPORTED_TEMPLATE_VARIABLES.quotation.length >= 8)
    assert.ok(SUPPORTED_TEMPLATE_VARIABLES.invoice.length >= 9)
    assert.ok(SUPPORTED_TEMPLATE_VARIABLES.user.length >= 2)

    const compTags = SUPPORTED_TEMPLATE_VARIABLES.company.map((v) => v.tag)
    assert.ok(compTags.includes('{{company_name}}'))
    assert.ok(compTags.includes('{{company_phone}}'))
    assert.ok(compTags.includes('{{company_email}}'))
    assert.ok(compTags.includes('{{company_address}}'))
    assert.ok(compTags.includes('{{company_website}}'))

    const custTags = SUPPORTED_TEMPLATE_VARIABLES.customer.map((v) => v.tag)
    assert.ok(custTags.includes('{{customer_name}}'))
    assert.ok(custTags.includes('{{customer_company}}'))
    assert.ok(custTags.includes('{{customer_phone}}'))
    assert.ok(custTags.includes('{{customer_whatsapp}}'))
    assert.ok(custTags.includes('{{customer_email}}'))
    assert.ok(custTags.includes('{{customer_address}}'))

    const quoteTags = SUPPORTED_TEMPLATE_VARIABLES.quotation.map((v) => v.tag)
    assert.ok(quoteTags.includes('{{quotation_number}}'))
    assert.ok(quoteTags.includes('{{quotation_date}}'))
    assert.ok(quoteTags.includes('{{valid_until}}'))
    assert.ok(quoteTags.includes('{{quotation_subtotal}}'))
    assert.ok(quoteTags.includes('{{quotation_discount}}'))
    assert.ok(quoteTags.includes('{{quotation_vat}}'))
    assert.ok(quoteTags.includes('{{quotation_total}}'))
    assert.ok(quoteTags.includes('{{quotation_notes}}'))

    const invTags = SUPPORTED_TEMPLATE_VARIABLES.invoice.map((v) => v.tag)
    assert.ok(invTags.includes('{{invoice_number}}'))
    assert.ok(invTags.includes('{{invoice_date}}'))
    assert.ok(invTags.includes('{{invoice_subtotal}}'))
    assert.ok(invTags.includes('{{invoice_discount}}'))
    assert.ok(invTags.includes('{{invoice_vat}}'))
    assert.ok(invTags.includes('{{invoice_total}}'))
    assert.ok(invTags.includes('{{paid_amount}}'))
    assert.ok(invTags.includes('{{due_amount}}'))
    assert.ok(invTags.includes('{{payment_status}}'))

    const userTags = SUPPORTED_TEMPLATE_VARIABLES.user.map((v) => v.tag)
    assert.ok(userTags.includes('{{prepared_by}}'))
    assert.ok(userTags.includes('{{salesperson_name}}'))
  })

  test('9. buildQuotationVariables and buildInvoiceVariables populate all supported variables without arbitrary leaks', () => {
    const quoteVars = CommunicationTemplateService.buildQuotationVariables(mockQuotation, mockCompany, 'https://printerp.app')
    assert.strictEqual(quoteVars.company_name, 'PrintCraft Visuals Ltd.')
    assert.strictEqual(quoteVars.customer_name, 'Metro Retail Ltd.')
    assert.strictEqual(quoteVars.customer_phone, '01711223344')
    assert.strictEqual(quoteVars.customer_whatsapp, '01711223344')
    assert.strictEqual(quoteVars.quotation_number, 'Q-2026-0099')
    assert.strictEqual(quoteVars.quotation_subtotal, '30,000')
    assert.strictEqual(quoteVars.quotation_vat, '2,250')
    assert.strictEqual(quoteVars.quotation_total, '32,250')
    assert.strictEqual(quoteVars.salesperson_name, 'Imtiaz Ahmed')

    const invVars = CommunicationTemplateService.buildInvoiceVariables(mockInvoice, mockCompany, 'https://printerp.app')
    assert.strictEqual(invVars.invoice_number, 'INV-2026-0501')
    assert.strictEqual(invVars.invoice_total, '32,250')
    assert.strictEqual(invVars.paid_amount, '10,000')
    assert.strictEqual(invVars.due_amount, '22,250')
    assert.strictEqual(invVars.payment_status, 'UNPAID')
    assert.strictEqual(invVars.prepared_by, 'Admin User')
  })
})
