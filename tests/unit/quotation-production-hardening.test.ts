import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { QuotationService } from '../../services/quotation.service.ts'
import { QuotationRepository } from '../../lib/repositories/quotation.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { QuotationRecord, CreateQuotationPayload } from '../../types/quotation.types.ts'

describe('Quotation Production Hardening & Sales-Control Center Test Suite', () => {
  const companyA = 'comp-tenant-a-101'
  const companyB = 'comp-tenant-b-202'

  beforeEach(() => {
    // Reset test storage
    PrintERPDataStore.set(STORAGE_KEYS.QUOTATIONS, [])
    PrintERPDataStore.set(STORAGE_KEYS.QUOTATION_ACTIVITIES, [])
    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
  })

  describe('1. Financial Integrity & Tamper-Resistant Calculations', () => {
    it('should correctly calculate area (SFT) and line totals for ft, inch, and m units', async () => {
      const quote = await QuotationRepository.createQuotation({
        company_id: companyA,
        customer_name: 'Metro Advertising Ltd',
        customer_phone: '01711223344',
        valid_until: '2026-10-01',
        salesperson_name: 'Tanvir Ahmed',
        items: [
          // 4ft x 8ft x 2 qty @ 50/sft = 64 sft = 3,200 BDT
          {
            description: 'Flex Banner Large',
            width: 4,
            height: 8,
            dimension_unit: 'ft',
            quantity: 2,
            unit_rate: 50,
          },
          // 12in x 18in x 1 qty @ 200/sft = 1.5 sft = 300 BDT
          {
            description: 'Acrylic Desk Stand',
            width: 12,
            height: 18,
            dimension_unit: 'inch',
            quantity: 1,
            unit_rate: 200,
          },
          // 1m x 2m x 1 qty @ 100/sft = 21.53 sft = 2,153 BDT
          {
            description: 'Backlit Film Display',
            width: 1,
            height: 2,
            dimension_unit: 'm',
            quantity: 1,
            unit_rate: 100,
          },
        ],
      })

      assert.strictEqual(quote.items.length, 3)
      assert.strictEqual(quote.items[0].area_sft, 64)
      assert.strictEqual(quote.items[0].item_total, 3200)

      assert.strictEqual(quote.items[1].area_sft, 1.5)
      assert.strictEqual(quote.items[1].item_total, 300)

      assert.strictEqual(quote.items[2].area_sft, 21.53)
      assert.strictEqual(quote.items[2].item_total, 2153)

      // Subtotal = 3200 + 300 + 2153 = 5653
      assert.strictEqual(quote.subtotal, 5653)
      assert.strictEqual(quote.vat_rate, 7.5)
      // VAT = round(5653 * 0.075) = 424
      assert.strictEqual(quote.vat_amount, 424)
      assert.strictEqual(quote.grand_total, 5653 + 424)
    })

    it('should resist negative rates, zero quantities, and excessive discounts', async () => {
      const quote = await QuotationRepository.createQuotation({
        company_id: companyA,
        customer_name: 'Apex Prints',
        customer_phone: '01811223344',
        valid_until: '2026-10-01',
        salesperson_name: 'Rakib Hassan',
        discount_amount: 999999, // Excessive discount attempting to invert subtotal
        items: [
          {
            description: 'Digital Poster',
            width: 0,
            height: 0,
            quantity: -5, // Negative quantity
            unit_rate: -100, // Negative rate
          },
        ],
      })

      // Quantity should be clamped to >= 1, unit rate to >= 0
      assert.ok(quote.items[0].quantity >= 1)
      assert.ok(quote.items[0].unit_rate >= 0)
      assert.ok(quote.grand_total >= 0)
    })
  })

  describe('2. Dual Conversion Idempotency & Duplicate Protection', () => {
    it('should convert an approved quotation to a Job Order and strictly prevent duplicate conversion', async () => {
      const quote = await QuotationRepository.createQuotation({
        company_id: companyA,
        customer_name: 'Bengal Signage Ltd',
        customer_phone: '01911223344',
        valid_until: '2026-10-15',
        salesperson_name: 'Shakil Khan',
        items: [
          {
            description: '3D Acrylic Lettering',
            width: 10,
            height: 4,
            dimension_unit: 'ft',
            quantity: 1,
            unit_rate: 350,
          },
        ],
      })

      // Advance to approved
      await QuotationRepository.updateStatus(quote.id, 'approved', 'Customer signed approval', companyA)

      // First conversion to Job Order
      const jobOrder = await QuotationRepository.convertQuotationToJobOrder(quote.id, companyA, {
        advanceAmount: 5000,
        createdByName: 'Shakil Khan',
      })

      assert.ok(jobOrder.order_number)
      assert.strictEqual(jobOrder.customer_name, 'Bengal Signage Ltd')
      assert.strictEqual(jobOrder.advance_amount, 5000)

      const updatedQuote = await QuotationRepository.getQuotationById(quote.id, companyA)
      assert.strictEqual(updatedQuote?.status, 'converted')
      assert.strictEqual(updatedQuote?.converted_order_id, jobOrder.order_number)

      // Attempt second conversion (concurrent / repeated click) -> MUST throw error
      await assert.rejects(
        async () => {
          await QuotationRepository.convertQuotationToJobOrder(quote.id, companyA)
        },
        /already been converted/i
      )
    })

    it('should convert a quotation to an Invoice and strictly prevent duplicate invoice conversion', async () => {
      const quote = await QuotationRepository.createQuotation({
        company_id: companyA,
        customer_name: 'Standard Fashion Ltd',
        customer_phone: '01611223344',
        valid_until: '2026-10-15',
        salesperson_name: 'Nazmul Islam',
        items: [
          {
            description: 'Clothing Tags (1000 pcs)',
            width: 0,
            height: 0,
            quantity: 5,
            unit_rate: 1200,
          },
        ],
      })

      // Convert to Invoice
      const invoice = await QuotationRepository.convertQuotationToInvoice(quote.id, companyA, {
        createdByName: 'Nazmul Islam',
      })

      assert.ok(invoice.invoice_number)
      assert.strictEqual(invoice.customer_name, 'Standard Fashion Ltd')
      assert.strictEqual(invoice.grand_total, quote.grand_total)

      const updatedQuote = await QuotationRepository.getQuotationById(quote.id, companyA)
      assert.strictEqual(updatedQuote?.status, 'converted')
      assert.strictEqual(updatedQuote?.converted_invoice_id, invoice.id)

      // Attempt second invoice conversion -> MUST throw error
      await assert.rejects(
        async () => {
          await QuotationRepository.convertQuotationToInvoice(quote.id, companyA)
        },
        /already been converted/i
      )
    })
  })

  describe('3. Status State Machine & Workflow Validation', () => {
    it('should enforce valid state machine transitions and disallow arbitrary jumps', async () => {
      const quote = await QuotationRepository.createQuotation({
        company_id: companyA,
        customer_name: 'City Corporation',
        customer_phone: '01511223344',
        valid_until: '2026-10-15',
        salesperson_name: 'Tanvir Ahmed',
        items: [{ description: 'Safety Posters', quantity: 10, unit_rate: 50 }],
      })

      // Draft -> Sent: valid
      await QuotationRepository.updateStatus(quote.id, 'sent', 'Sent via WhatsApp', companyA)
      let current = await QuotationRepository.getQuotationById(quote.id, companyA)
      assert.strictEqual(current?.status, 'sent')

      // Sent -> Negotiation: valid
      await QuotationRepository.updateStatus(quote.id, 'negotiation', 'Client requested discount', companyA)
      current = await QuotationRepository.getQuotationById(quote.id, companyA)
      assert.strictEqual(current?.status, 'negotiation')

      // Negotiation -> Approved: valid
      await QuotationRepository.updateStatus(quote.id, 'approved', 'Price agreed', companyA)
      current = await QuotationRepository.getQuotationById(quote.id, companyA)
      assert.strictEqual(current?.status, 'approved')

      // Approved -> Converted: valid
      await QuotationRepository.convertQuotationToInvoice(quote.id, companyA)
      current = await QuotationRepository.getQuotationById(quote.id, companyA)
      assert.strictEqual(current?.status, 'converted')

      // Converted -> Draft: MUST BE REJECTED
      await assert.rejects(
        async () => {
          await QuotationRepository.updateStatus(quote.id, 'draft', 'Attempt reset', companyA)
        },
        /Cannot change status of a converted quotation/i
      )
    })
  })

  describe('4. Cost & Margin Shielding on Customer-Facing Outputs', () => {
    it('should strictly strip cost, gross profit, margin %, and internal notes from customer text messages', async () => {
      const quote = await QuotationRepository.createQuotation({
        company_id: companyA,
        customer_name: 'VIP Client',
        customer_phone: '01700000000',
        valid_until: '2026-10-15',
        salesperson_name: 'Tanvir Ahmed',
        internal_notes: 'Client is demanding but pays quickly. Low margin acceptable.',
        items: [
          {
            description: 'Custom Acrylic Sign',
            width: 4,
            height: 4,
            dimension_unit: 'ft',
            quantity: 1,
            unit_rate: 500,
            material_cost: 2000,
            labor_cost: 1000,
          },
        ],
      })

      const customerMsg = QuotationService.generateQuotationTextMessage(quote, 'InkFlow Press')

      // Customer message must include commercial details
      assert.ok(customerMsg.includes(quote.quotation_number))
      assert.ok(customerMsg.includes('VIP Client'))
      assert.ok(customerMsg.includes('Grand Total: ৳'))

      // Customer message must NEVER include internal financial costs or internal notes
      assert.ok(!customerMsg.includes('total_cost'))
      assert.ok(!customerMsg.includes('margin_percent'))
      assert.ok(!customerMsg.includes('Client is demanding'))
      assert.ok(!customerMsg.includes('material_cost'))
      assert.ok(!customerMsg.includes('labor_cost'))
    })
  })

  describe('5. Timezone-Safe Date Urgency & Follow-Up Calculations', () => {
    it('should correctly evaluate relative expiry urgency without UTC day-shift errors', () => {
      const todayStr = new Date().toISOString().split('T')[0]
      const expToday = QuotationService.calculateExpiryUrgency(todayStr)
      assert.strictEqual(expToday.urgency, 'critical')
      assert.strictEqual(expToday.label, 'Expires today')

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const expTomorrow = QuotationService.calculateExpiryUrgency(tomorrow.toISOString().split('T')[0])
      assert.strictEqual(expTomorrow.urgency, 'critical')
      assert.strictEqual(expTomorrow.label, 'Expires tomorrow')

      const inTwoDays = new Date()
      inTwoDays.setDate(inTwoDays.getDate() + 2)
      const expTwoDays = QuotationService.calculateExpiryUrgency(inTwoDays.toISOString().split('T')[0])
      assert.strictEqual(expTwoDays.urgency, 'warning')
      assert.strictEqual(expTwoDays.label, 'Expires in 2 days')

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const expYesterday = QuotationService.calculateExpiryUrgency(yesterday.toISOString().split('T')[0])
      assert.strictEqual(expYesterday.urgency, 'expired')
      assert.strictEqual(expYesterday.label, 'Expired yesterday')
    })
  })

  describe('6. Needs Attention Triage & Commercial KPI Accuracy', () => {
    it('should accurately aggregate commercial KPIs and isolate high-priority actionable quotes', async () => {
      // 1. Active Quote expiring tomorrow
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
      const q1 = await QuotationRepository.createQuotation({
        company_id: companyA,
        customer_name: 'Urgent Client',
        customer_phone: '01711111111',
        valid_until: tomorrow,
        salesperson_name: 'Agent A',
        items: [{ description: 'Backlit Banner', quantity: 1, unit_rate: 10000 }],
      })

      // 2. Approved Quote waiting conversion
      const q2 = await QuotationRepository.createQuotation({
        company_id: companyA,
        customer_name: 'Approved Client',
        customer_phone: '01722222222',
        valid_until: '2026-11-01',
        salesperson_name: 'Agent B',
        items: [{ description: 'CNC Engraving', quantity: 1, unit_rate: 25000 }],
      })
      await QuotationRepository.updateStatus(q2.id, 'approved', 'Approved by owner', companyA)

      // 3. Converted Quote (Won)
      const q3 = await QuotationRepository.createQuotation({
        company_id: companyA,
        customer_name: 'Converted Client',
        customer_phone: '01733333333',
        valid_until: '2026-11-01',
        salesperson_name: 'Agent C',
        items: [{ description: 'Flyers', quantity: 1, unit_rate: 15000 }],
      })
      await QuotationRepository.convertQuotationToInvoice(q3.id, companyA)

      const allQuotes = await QuotationRepository.getQuotations(companyA)
      const kpis = QuotationService.getKpiMetrics(allQuotes)

      // Open Pipeline includes q1 (active) and q2 (approved)
      assert.strictEqual(kpis.activeCount, 2)
      assert.strictEqual(kpis.expiringSoon, 1)
      assert.strictEqual(kpis.wonCount, 2) // q2 (approved) + q3 (converted)

      // Needs Attention triage must highlight q1 (expiring tomorrow) and q2 (approved but not converted)
      const needsAttention = QuotationService.getNeedsAttentionQuotes(allQuotes)
      assert.strictEqual(needsAttention.length, 2)
      assert.ok(needsAttention.some((q) => q.id === q1.id))
      assert.ok(needsAttention.some((q) => q.id === q2.id))
      assert.ok(!needsAttention.some((q) => q.id === q3.id)) // Converted quote is not in attention list
    })
  })

  describe('7. Multi-Tenant Isolation & Security Boundaries', () => {
    it('should strictly isolate quotations by tenant company_id', async () => {
      // Create quote under Company A
      const quoteA = await QuotationRepository.createQuotation({
        company_id: companyA,
        customer_name: 'Tenant A Customer',
        customer_phone: '01700000001',
        valid_until: '2026-10-01',
        salesperson_name: 'Staff A',
        items: [{ description: 'Banner A', quantity: 1, unit_rate: 5000 }],
      })

      // Create quote under Company B
      const quoteB = await QuotationRepository.createQuotation({
        company_id: companyB,
        customer_name: 'Tenant B Customer',
        customer_phone: '01700000002',
        valid_until: '2026-10-01',
        salesperson_name: 'Staff B',
        items: [{ description: 'Banner B', quantity: 1, unit_rate: 8000 }],
      })

      // Query Company A quotes
      const listA = await QuotationRepository.getQuotations(companyA)
      assert.strictEqual(listA.length, 1)
      assert.strictEqual(listA[0].id, quoteA.id)

      // Cross-tenant get by ID must return null
      const crossTenantLookup = await QuotationRepository.getQuotationById(quoteA.id, companyB)
      assert.strictEqual(crossTenantLookup, null)

      // Cross-tenant conversion must fail
      await assert.rejects(
        async () => {
          await QuotationRepository.convertQuotationToJobOrder(quoteA.id, companyB)
        },
        /not found in company context/i
      )
    })
  })
})
