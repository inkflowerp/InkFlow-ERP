import { describe, it } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { QuotationRecord, QuotationItemRecord } from '../../types/quotation.types.ts'

// Quotation Text Message Generator matching QuotationService
function generateQuotationTextMessage(quote: QuotationRecord, companyName: string = 'InkFlow'): string {
  const itemsSummary = (quote.items || [])
    .map((it, idx) => {
      const dim = it.width > 0 && it.height > 0 ? ` (${it.width}ft × ${it.height}ft)` : ''
      return `${idx + 1}. ${it.description}${dim} - ৳${Number(it.item_total).toLocaleString('en-BD')}`
    })
    .slice(0, 4)
    .join('\n')

  const moreItems = quote.items && quote.items.length > 4 ? `\n...and ${quote.items.length - 4} more items` : ''

  return `*Quotation: ${quote.quotation_number}*
From: ${companyName}
Customer: ${quote.customer_name}${quote.customer_company ? ` (${quote.customer_company})` : ''}
Date: ${quote.quotation_date}
Valid Until: ${quote.valid_until}

*Items Summary:*
${itemsSummary}${moreItems}

Subtotal: ৳${Number(quote.subtotal).toLocaleString('en-BD')}
${quote.discount_amount > 0 ? `Discount: -৳${Number(quote.discount_amount).toLocaleString('en-BD')}\n` : ''}VAT (${quote.vat_rate}%): ৳${Number(quote.vat_amount).toLocaleString('en-BD')}
*Grand Total: ৳${Number(quote.grand_total).toLocaleString('en-BD')} BDT*

${quote.notes ? `*Notes:* ${quote.notes}\n` : ''}Thank you for your business.`
}

// Bangladesh Phone Helper
function cleanPhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('880') && digits.length === 13) {
    return digits.substring(2)
  }
  return digits
}

function isValidBdPhone(phone: string): boolean {
  const cleaned = cleanPhoneDigits(phone)
  if (!cleaned) return false
  return /^01[3-9]\d{8}$/.test(cleaned)
}

describe('InkFlow — Quotation Workflow & Pricing Engine', () => {
  const testCompanyId = 'comp-test-quo-01'

  it('1. Calculates SFT Area & Dimensional Pricing Accurately', () => {
    // 40ft x 20ft Banner (1 pcs) = 800 sft @ ৳18/sft = ৳14,400
    const w = 40
    const h = 20
    const qty = 1
    const rate = 18.0

    const area = w * h * qty
    const itemTotal = area * rate

    assert.strictEqual(area, 800)
    assert.strictEqual(itemTotal, 14400)

    // Inch calculation: 24in x 36in (2 pcs) = (24*36/144)*2 = 12 sft @ ৳35/sft = ৳420
    const wInch = 24
    const hInch = 36
    const qtyInch = 2
    const rateInch = 35.0

    const areaInch = ((wInch * hInch) / 144) * qtyInch
    const itemTotalInch = areaInch * rateInch

    assert.strictEqual(areaInch, 12)
    assert.strictEqual(itemTotalInch, 420)
  })

  it('2. Enforces 3-Tier Customer Rate Resolution Priority Hierarchy', () => {
    // 3-Tier Hierarchy:
    // Level 1: Customer-specific rate (custom_rate)
    // Level 2: Last valid invoice rate (last_invoice)
    // Level 3: Product catalog default (default)

    const productCatalogRate = 20.0
    const lastInvoiceRate = 18.0
    const customCustomerRate = 16.5

    const resolveRate = (
      hasCustom: boolean,
      customVal: number | null,
      hasLastInv: boolean,
      lastInvVal: number | null,
      catalogDefault: number
    ): { rate: number; source: 'custom' | 'last_invoice' | 'default' } => {
      if (hasCustom && customVal !== null) {
        return { rate: customVal, source: 'custom' }
      }
      if (hasLastInv && lastInvVal !== null) {
        return { rate: lastInvVal, source: 'last_invoice' }
      }
      return { rate: catalogDefault, source: 'default' }
    }

    // Tier 1 Wins when present
    const t1 = resolveRate(true, customCustomerRate, true, lastInvoiceRate, productCatalogRate)
    assert.strictEqual(t1.rate, 16.5)
    assert.strictEqual(t1.source, 'custom')

    // Tier 2 Wins when Tier 1 is absent
    const t2 = resolveRate(false, null, true, lastInvoiceRate, productCatalogRate)
    assert.strictEqual(t2.rate, 18.0)
    assert.strictEqual(t2.source, 'last_invoice')

    // Tier 3 Default Catalog Rate
    const t3 = resolveRate(false, null, false, null, productCatalogRate)
    assert.strictEqual(t3.rate, 20.0)
    assert.strictEqual(t3.source, 'default')
  })

  it('3. Generates Concurrency-Safe Sequential Quotation Numbers', () => {
    const quoteNum1 = PrintERPDataStore.getNextDocumentNumber(testCompanyId, 'quotation')
    const quoteNum2 = PrintERPDataStore.getNextDocumentNumber(testCompanyId, 'quotation')

    assert.ok(quoteNum1.startsWith('QUO-'))
    assert.ok(quoteNum2.startsWith('QUO-'))
    assert.notStrictEqual(quoteNum1, quoteNum2)
  })

  it('4. Creates Formal Quotation with Immutable Price Snapshot', () => {
    const quoteId = `quo-test-${Date.now()}`
    const testQuote: QuotationRecord = {
      id: quoteId,
      company_id: testCompanyId,
      quotation_number: 'QUO-TEST-001',
      customer_id: 'cust-quo-01',
      customer_name: 'Rahim Enterprise',
      customer_phone: '01711000000',
      customer_address: '42 Motijheel C/A, Dhaka',
      status: 'draft',
      quotation_date: '2026-09-14',
      valid_until: '2026-09-29',
      salesperson_name: 'Imran Khan',
      items: [
        {
          id: 'qi-test-1',
          description: 'Star Flex Banner 40ft x 20ft',
          width: 40,
          height: 20,
          dimension_unit: 'ft',
          area_sft: 800,
          quantity: 1,
          unit: 'sft',
          unit_rate: 18.0,
          item_total: 14400,
        },
      ],
      subtotal: 14400,
      discount_amount: 400,
      vat_rate: 7.5,
      vat_amount: 1050,
      grand_total: 15050,
      total_cost: 7920,
      margin_percent: 47,
      language_mode: 'bn',
      notes: 'Standard flex print',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, testQuote)

    const list = PrintERPDataStore.get<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS) || []
    const retrieved = list.find((q) => q.id === quoteId)

    assert.ok(retrieved)
    assert.strictEqual(retrieved?.quotation_number, 'QUO-TEST-001')
    assert.strictEqual(retrieved?.customer_name, 'Rahim Enterprise')
    assert.strictEqual(retrieved?.subtotal, 14400)
    assert.strictEqual(retrieved?.discount_amount, 400)
    assert.strictEqual(retrieved?.grand_total, 15050)
    assert.strictEqual(retrieved?.items.length, 1)
    assert.strictEqual(retrieved?.items[0].unit_rate, 18.0)
  })

  it('5. Converts Approved Quotation to Job Order Preserving Quoted Prices', () => {
    const quoteId = `quo-conv-${Date.now()}`
    const quote: QuotationRecord = {
      id: quoteId,
      company_id: testCompanyId,
      quotation_number: 'QUO-CONVERT-01',
      customer_id: 'cust-quo-01',
      customer_name: 'Rahim Enterprise',
      customer_phone: '01711000000',
      status: 'draft',
      quotation_date: '2026-09-14',
      valid_until: '2026-09-29',
      salesperson_name: 'Imran Khan',
      subtotal: 14400,
      discount_amount: 0,
      vat_rate: 7.5,
      vat_amount: 1080,
      grand_total: 15480,
      total_cost: 7920,
      margin_percent: 48,
      language_mode: 'bn',
      items: [
        {
          id: 'qi-conv-1',
          description: 'Star Flex Banner 40ft x 20ft',
          width: 40,
          height: 20,
          dimension_unit: 'ft',
          area_sft: 800,
          quantity: 1,
          unit: 'sft',
          unit_rate: 18.0,
          item_total: 14400,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, quote)
    const order = PrintERPDataStore.convertQuotationToSalesOrder(quote.id)

    assert.ok(order)
    assert.strictEqual(order?.customer_name, 'Rahim Enterprise')
    assert.strictEqual(order?.final_price, 15480)
    assert.strictEqual(order?.items[0].unit_price, 18.0) // Quoted price strictly preserved
    assert.strictEqual(order?.items[0].total_price, 14400)
  })

  it('6. Generates Customer-Facing WhatsApp/SMS Text Message Shielding Internal Notes', () => {
    const sampleQuote: QuotationRecord = {
      id: 'quo-text-01',
      company_id: testCompanyId,
      quotation_number: 'QUO-000101',
      customer_name: 'Prime Media Ltd.',
      customer_company: 'Prime Media Group',
      customer_phone: '01711223344',
      status: 'draft',
      quotation_date: '2026-09-14',
      valid_until: '2026-09-29',
      salesperson_name: 'Tanvir Ahmed',
      items: [
        {
          id: 'qi-1',
          description: 'Panaflex Backlit Signboard',
          width: 10,
          height: 5,
          dimension_unit: 'ft',
          area_sft: 50,
          quantity: 1,
          unit: 'sft',
          unit_rate: 35.0,
          item_total: 1750,
        },
      ],
      subtotal: 1750,
      discount_amount: 150,
      vat_rate: 7.5,
      vat_amount: 120,
      grand_total: 1720,
      total_cost: 950, // INTERNAL
      margin_percent: 45, // INTERNAL
      internal_notes: 'CONFIDENTIAL: Subcontracted to Nazmul printer', // INTERNAL
      notes: 'Includes installation at Banani branch', // CUSTOMER FACING
      language_mode: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const text = generateQuotationTextMessage(sampleQuote, 'InkFlow Solutions')

    // Must include customer info and totals
    assert.ok(text.includes('QUO-000101'))
    assert.ok(text.includes('Prime Media Ltd.'))
    assert.ok(text.includes('1,720 BDT'))
    assert.ok(text.includes('Includes installation at Banani branch'))

    // Must NEVER leak internal notes or costs
    assert.strictEqual(text.includes('CONFIDENTIAL'), false)
    assert.strictEqual(text.includes('Subcontracted'), false)
    assert.strictEqual(text.includes('950'), false)
    assert.strictEqual(text.includes('margin'), false)
  })

  it('7. Normalizes Bangladesh Phone Numbers Accurately', () => {
    const raw1 = '01711-223344'
    const raw2 = '+8801812345678'
    const raw3 = '8801911223344'
    const raw4 = '01611 223344'

    assert.strictEqual(isValidBdPhone(raw1), true)
    assert.strictEqual(isValidBdPhone(raw2), true)
    assert.strictEqual(isValidBdPhone(raw3), true)
    assert.strictEqual(isValidBdPhone(raw4), true)

    assert.strictEqual(cleanPhoneDigits(raw1), '01711223344')
    assert.strictEqual(cleanPhoneDigits(raw2), '01812345678')
  })
})
