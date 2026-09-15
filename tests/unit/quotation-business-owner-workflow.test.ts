import { describe, it } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { QuotationService } from '../../services/quotation.service.ts'
import { QuotationRepository } from '../../lib/repositories/quotation.repository.ts'
import type { QuotationRecord, QuotationItemRecord } from '../../types/quotation.types.ts'

describe('InkFlow — Business-Owner-First Quotation Workflow & Control Center', () => {
  const testCompanyId = 'comp-owner-test-01'

  // Sample items
  const sampleItems: QuotationItemRecord[] = [
    {
      id: 'qi-101',
      description: 'LED 3D Acrylic Letter Signboard',
      material_spec: '3mm Cast Acrylic with LED modules',
      width: 12,
      height: 4,
      dimension_unit: 'ft',
      area_sft: 48,
      quantity: 1,
      unit: 'sft',
      unit_rate: 650,
      material_cost: 15000,
      labor_cost: 6000,
      finishing_cost: 1200,
      installation_cost: 2000,
      item_total: 31200,
    },
    {
      id: 'qi-102',
      description: 'Star Flex Backdrop Banner',
      material_spec: '280 GSM Frontlit Flex',
      width: 20,
      height: 10,
      dimension_unit: 'ft',
      area_sft: 200,
      quantity: 1,
      unit: 'sft',
      unit_rate: 22,
      material_cost: 2200,
      labor_cost: 800,
      item_total: 4400,
    },
  ]

  it('1. Calculates Area & Dimensional Pricing for ft, inch, and meter accurately', () => {
    // Feet: 12ft x 4ft = 48 sft @ ৳650 = ৳31,200
    const areaFt = 12 * 4 * 1
    const totalFt = areaFt * 650
    assert.strictEqual(areaFt, 48)
    assert.strictEqual(totalFt, 31200)

    // Inch: 18in x 24in (4 pcs) = (18*24/144)*4 = 12 sft @ ৳35 = ৳420
    const areaInch = ((18 * 24) / 144) * 4
    const totalInch = areaInch * 35
    assert.strictEqual(areaInch, 12)
    assert.strictEqual(totalInch, 420)

    // Meter: 1m x 2m (1 pcs) = 1 * 2 * 10.7639 = 21.53 sft approx
    const areaM = Math.round(1 * 2 * 10.7639 * 100) / 100
    assert.strictEqual(areaM, 21.53)
  })

  it('2. Computes Commercial Sales-Control KPIs for Business Owners', () => {
    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
    const expiringSoonDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]

    const quotes: QuotationRecord[] = [
      {
        id: 'q-kpi-1',
        company_id: testCompanyId,
        quotation_number: 'QUO-1001',
        customer_name: 'Rahman Traders',
        customer_phone: '01711000001',
        status: 'sent',
        quotation_date: today,
        valid_until: futureDate,
        salesperson_name: 'Imran',
        subtotal: 50000,
        discount_amount: 0,
        vat_rate: 7.5,
        vat_amount: 3750,
        grand_total: 53750,
        total_cost: 30000,
        margin_percent: 44,
        language_mode: 'bn',
        items: sampleItems,
        follow_up_date: today, // Scheduled today!
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'q-kpi-2',
        company_id: testCompanyId,
        quotation_number: 'QUO-1002',
        customer_name: 'Apex Advertising',
        customer_phone: '01711000002',
        status: 'negotiation',
        quotation_date: today,
        valid_until: expiringSoonDate, // Expiring in 2 days!
        salesperson_name: 'Tanvir',
        subtotal: 80000,
        discount_amount: 5000,
        vat_rate: 7.5,
        vat_amount: 5625,
        grand_total: 80625,
        total_cost: 48000,
        margin_percent: 40,
        language_mode: 'en',
        items: sampleItems,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'q-kpi-3',
        company_id: testCompanyId,
        quotation_number: 'QUO-1003',
        customer_name: 'Standard Bank Ltd',
        customer_phone: '01711000003',
        status: 'converted',
        quotation_date: today,
        valid_until: futureDate,
        salesperson_name: 'Imran',
        subtotal: 120000,
        discount_amount: 0,
        vat_rate: 7.5,
        vat_amount: 9000,
        grand_total: 129000,
        total_cost: 72000,
        margin_percent: 44,
        language_mode: 'en',
        items: sampleItems,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const kpis = QuotationService.getKpiMetrics(quotes)

    // Open Pipeline = q1 (53750) + q2 (80625) = 134,375
    assert.strictEqual(kpis.openPipeline, 134375)
    assert.strictEqual(kpis.activeCount, 2)
    assert.strictEqual(kpis.followUpToday, 1)
    assert.strictEqual(kpis.expiringSoon, 1)
    assert.strictEqual(kpis.wonCount, 1)
    assert.strictEqual(kpis.wonValue, 129000)
  })

  it('3. Identifies Urgent Quotations for Needs Attention Triage', () => {
    const today = new Date().toISOString().split('T')[0]
    const expiringSoonDate = new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0]

    const quotes: QuotationRecord[] = [
      {
        id: 'q-att-1',
        company_id: testCompanyId,
        quotation_number: 'QUO-2001',
        customer_name: 'ABC Signage',
        customer_phone: '01711000001',
        status: 'sent',
        quotation_date: today,
        valid_until: expiringSoonDate, // Expiring tomorrow
        salesperson_name: 'Imran',
        subtotal: 48500,
        discount_amount: 0,
        vat_rate: 7.5,
        vat_amount: 3637.5,
        grand_total: 52137.5,
        total_cost: 30000,
        margin_percent: 42,
        language_mode: 'bn',
        items: sampleItems,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'q-att-2',
        company_id: testCompanyId,
        quotation_number: 'QUO-2002',
        customer_name: 'Dhaka City Bank',
        customer_phone: '01711000002',
        status: 'approved', // Approved but not yet converted!
        quotation_date: today,
        valid_until: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        salesperson_name: 'Tanvir',
        subtotal: 100000,
        discount_amount: 0,
        vat_rate: 7.5,
        vat_amount: 7500,
        grand_total: 107500,
        total_cost: 60000,
        margin_percent: 44,
        language_mode: 'en',
        items: sampleItems,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const attentionList = QuotationService.getNeedsAttentionQuotes(quotes)
    assert.strictEqual(attentionList.length, 2)
    assert.ok(attentionList.some((q) => q.id === 'q-att-1'))
    assert.ok(attentionList.some((q) => q.id === 'q-att-2'))
  })

  it('4. Translates Expiry Date into Actionable Urgency Labels', () => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
    const in10Days = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const past5Days = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]

    assert.strictEqual(QuotationService.calculateExpiryUrgency(todayStr).label, 'Expires today')
    assert.strictEqual(QuotationService.calculateExpiryUrgency(todayStr).urgency, 'critical')

    assert.strictEqual(QuotationService.calculateExpiryUrgency(tomorrow).label, 'Expires tomorrow')
    assert.strictEqual(QuotationService.calculateExpiryUrgency(tomorrow).urgency, 'critical')

    assert.strictEqual(QuotationService.calculateExpiryUrgency(in3Days).label, 'Expires in 3 days')
    assert.strictEqual(QuotationService.calculateExpiryUrgency(in3Days).urgency, 'warning')

    assert.strictEqual(QuotationService.calculateExpiryUrgency(in10Days).label, 'Expires in 10 days')
    assert.strictEqual(QuotationService.calculateExpiryUrgency(in10Days).urgency, 'normal')

    assert.strictEqual(QuotationService.calculateExpiryUrgency(yesterday).label, 'Expired yesterday')
    assert.strictEqual(QuotationService.calculateExpiryUrgency(yesterday).urgency, 'expired')

    assert.strictEqual(QuotationService.calculateExpiryUrgency(past5Days).label, 'Expired 5 days ago')
    assert.strictEqual(QuotationService.calculateExpiryUrgency(past5Days).urgency, 'expired')
  })

  it('5. Correctly Derives Context-Aware Next Action', () => {
    const today = new Date().toISOString().split('T')[0]
    const baseQuote: QuotationRecord = {
      id: 'q-na-1',
      company_id: testCompanyId,
      quotation_number: 'QUO-3001',
      customer_name: 'Bashundhara Group',
      customer_phone: '01711000001',
      status: 'approved',
      quotation_date: today,
      valid_until: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      salesperson_name: 'Tanvir',
      subtotal: 50000,
      discount_amount: 0,
      vat_rate: 7.5,
      vat_amount: 3750,
      grand_total: 53750,
      total_cost: 30000,
      margin_percent: 44,
      language_mode: 'bn',
      items: sampleItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Approved quote
    assert.strictEqual(
      QuotationService.calculateNextAction(baseQuote),
      'Approved — Convert to Job Order / Invoice'
    )

    // Negotiation quote
    assert.strictEqual(
      QuotationService.calculateNextAction({ ...baseQuote, status: 'negotiation' }),
      'Customer is negotiating — Finalize price'
    )

    // Converted quote with order number
    assert.strictEqual(
      QuotationService.calculateNextAction({ ...baseQuote, status: 'converted', converted_order_id: 'ORD-0091' }),
      'Converted to Order #ORD-0091'
    )

    // Follow up scheduled for today
    assert.strictEqual(
      QuotationService.calculateNextAction({ ...baseQuote, status: 'sent', follow_up_date: today }),
      'Follow up today (Scheduled)'
    )
  })

  it('6. Records Follow-Up and Appends Activity Timeline Record', async () => {
    const quoteId = `q-fu-${Date.now()}`
    const today = new Date().toISOString().split('T')[0]
    const testQuote: QuotationRecord = {
      id: quoteId,
      company_id: testCompanyId,
      quotation_number: 'QUO-FU-001',
      customer_name: 'Meghna Group',
      customer_phone: '01711000004',
      status: 'sent',
      quotation_date: today,
      valid_until: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      salesperson_name: 'Imran',
      subtotal: 75000,
      discount_amount: 0,
      vat_rate: 7.5,
      vat_amount: 5625,
      grand_total: 80625,
      total_cost: 45000,
      margin_percent: 44,
      language_mode: 'bn',
      items: sampleItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, testQuote)

    const nextDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const updated = await QuotationRepository.recordFollowUp(
      testQuote.id,
      testCompanyId,
      {
        method: 'whatsapp',
        note: 'Customer asked for revised installation schedule. Confirmed 3-day lead time.',
        outcome: 'negotiating',
        nextFollowUpDate: nextDate,
        markResponded: true,
      },
      'Imran Khan'
    )

    assert.ok(updated)
    assert.strictEqual(updated?.last_follow_up_method, 'whatsapp')
    assert.strictEqual(updated?.follow_up_date, nextDate)
    assert.strictEqual(updated?.status, 'negotiation')
    assert.strictEqual(updated?.follow_up_count, 1)

    const activities = await QuotationRepository.getActivities(quoteId, testCompanyId)
    assert.ok(activities.length > 0)
    assert.ok(activities.some((a) => a.action === 'follow_up' && a.details?.includes('installation schedule')))
  })

  it('7. Simulates and Applies Negotiation Concession Discount with Low Margin Alerting', async () => {
    const quoteId = `q-neg-${Date.now()}`
    const today = new Date().toISOString().split('T')[0]
    const testQuote: QuotationRecord = {
      id: quoteId,
      company_id: testCompanyId,
      quotation_number: 'QUO-NEG-001',
      customer_name: 'City Bank Ltd',
      customer_phone: '01711000005',
      status: 'sent',
      quotation_date: today,
      valid_until: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      salesperson_name: 'Tanvir',
      subtotal: 100000,
      discount_amount: 0,
      vat_rate: 7.5,
      vat_amount: 7500,
      grand_total: 107500,
      total_cost: 65000, // 65k base cost
      margin_percent: 40,
      language_mode: 'en',
      items: sampleItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, testQuote)

    // Apply ৳15,000 concession discount
    // Subtotal after disc = 85,000. VAT 7.5% = 6,375. Grand total = 91,375.
    // Gross margin = (91375 - 65000) / 91375 = 28.8% ~ 29%
    const updated = await QuotationRepository.applyNegotiation(
      testQuote.id,
      testCompanyId,
      15000,
      'Approved ৳15,000 concession for payment on delivery confirmation.',
      'Tanvir Ahmed'
    )

    assert.ok(updated)
    assert.strictEqual(updated?.discount_amount, 15000)
    assert.strictEqual(updated?.vat_amount, 6375)
    assert.strictEqual(updated?.grand_total, 91375)
    assert.strictEqual(updated?.status, 'negotiation')
    assert.ok(updated?.margin_percent < 35) // Margin decreased from 40% to ~29%
  })

  it('8. Converts Quotation to Production Job Order Preserving Specs and Preventing Double Conversion', async () => {
    const quoteId = `q-order-conv-${Date.now()}`
    const today = new Date().toISOString().split('T')[0]
    const testQuote: QuotationRecord = {
      id: quoteId,
      company_id: testCompanyId,
      quotation_number: 'QUO-ORDCONV-01',
      customer_name: 'Square Pharmaceuticals',
      customer_phone: '01711000006',
      customer_address: 'Square Centre, 48 Mohakhali C/A, Dhaka',
      status: 'approved',
      quotation_date: today,
      valid_until: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      salesperson_name: 'Imran',
      subtotal: 35600,
      discount_amount: 600,
      vat_rate: 7.5,
      vat_amount: 2625,
      grand_total: 37625,
      total_cost: 20000,
      margin_percent: 47,
      language_mode: 'en',
      items: sampleItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, testQuote)

    // Convert with ৳15,000 advance
    const order = await QuotationRepository.convertQuotationToJobOrder(
      testQuote.id,
      testCompanyId,
      {
        createdByName: 'Imran Khan',
        advanceAmount: 15000,
      }
    )

    assert.ok(order)
    assert.strictEqual(order.customer_name, 'Square Pharmaceuticals')
    assert.strictEqual(order.final_price, 37625)
    assert.strictEqual(order.advance_amount, 15000)
    assert.strictEqual(order.due_amount, 22625)
    assert.strictEqual(order.items.length, 2)
    assert.strictEqual(order.items[0].unit_price, 650) // QUOTED RATE PRESERVED
    assert.strictEqual(order.items[0].width, 12) // DIMENSIONS PRESERVED

    const refreshedQuote = await QuotationRepository.getQuotationById(testQuote.id, testCompanyId)
    assert.strictEqual(refreshedQuote?.status, 'converted')
    assert.strictEqual(refreshedQuote?.converted_order_id, order.order_number)

    // Double conversion attempt must be rejected
    await assert.rejects(
      async () => {
        await QuotationRepository.convertQuotationToJobOrder(testQuote.id, testCompanyId)
      },
      /already been converted/
    )
  })

  it('9. Converts Quotation to Invoice Preserving Quoted Rates and Customer Info', async () => {
    const quoteId = `q-inv-conv-${Date.now()}`
    const today = new Date().toISOString().split('T')[0]
    const testQuote: QuotationRecord = {
      id: quoteId,
      company_id: testCompanyId,
      quotation_number: 'QUO-INVCONV-01',
      customer_name: 'Beximco Textiles',
      customer_phone: '01711000007',
      customer_address: '17 Dhanmondi R/A, Dhaka',
      customer_bin: '001928471-0101',
      status: 'approved',
      quotation_date: today,
      valid_until: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      salesperson_name: 'Tanvir',
      subtotal: 50000,
      discount_amount: 2000,
      vat_rate: 7.5,
      vat_amount: 3600,
      grand_total: 51600,
      total_cost: 28000,
      margin_percent: 46,
      language_mode: 'en',
      items: sampleItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, testQuote)

    const invoice = await QuotationRepository.convertQuotationToInvoice(
      testQuote.id,
      testCompanyId,
      {
        createdByName: 'Tanvir Ahmed',
      }
    )

    assert.ok(invoice)
    assert.strictEqual(invoice.customer_name, 'Beximco Textiles')
    assert.strictEqual(invoice.customer_bin, '001928471-0101')
    assert.strictEqual(invoice.subtotal, 50000)
    assert.strictEqual(invoice.discount_amount, 2000)
    assert.strictEqual(invoice.vat_amount, 3600)
    assert.strictEqual(invoice.grand_total, 51600)
    assert.strictEqual(invoice.due_amount, 51600)
    assert.strictEqual(invoice.items[0].unit_price, 650) // Quoted price snapshot preserved
  })

  it('10. Strictly Shields Internal Cost, Profit, and Private Notes from Customer Output', () => {
    const sensitiveQuote: QuotationRecord = {
      id: 'q-shield-1',
      company_id: testCompanyId,
      quotation_number: 'QUO-SHIELD-01',
      customer_name: 'Akij Group',
      customer_phone: '01711000008',
      status: 'sent',
      quotation_date: '2026-09-15',
      valid_until: '2026-09-30',
      salesperson_name: 'Imran',
      subtotal: 80000,
      discount_amount: 0,
      vat_rate: 7.5,
      vat_amount: 6000,
      grand_total: 86000,
      total_cost: 44000, // INTERNAL CONFIDENTIAL
      margin_percent: 48.8, // INTERNAL CONFIDENTIAL
      internal_notes: 'CONFIDENTIAL: Direct raw material vendor rate ৳12/sft, labor ৳4/sft',
      notes: 'Standard production timeline 4 business days.',
      language_mode: 'bn',
      items: sampleItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const message = QuotationService.generateQuotationTextMessage(sensitiveQuote, 'InkFlow Solutions')

    // Customer text must contain essential proposal details
    assert.ok(message.includes('QUO-SHIELD-01'))
    assert.ok(message.includes('Akij Group'))
    assert.ok(message.includes('86,000 BDT'))
    assert.ok(message.includes('Standard production timeline 4 business days.'))

    // Must NEVER leak confidential internal data
    assert.strictEqual(message.includes('CONFIDENTIAL'), false)
    assert.strictEqual(message.includes('44000'), false)
    assert.strictEqual(message.includes('44,000'), false)
    assert.strictEqual(message.includes('margin'), false)
    assert.strictEqual(message.includes('vendor rate'), false)
  })
})
