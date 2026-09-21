import test from 'node:test'
import assert from 'node:assert/strict'
import { BANGLADESHI_PRINT_PRESETS, getPresetsByCategory } from '../../lib/quotation-presets'
import { QuotationRepository } from '../../lib/repositories/quotation.repository'
import { QuotationService } from '../../services/quotation.service'
import { formatBDT, numberToWordsBangla, numberToWordsBDT } from '../../lib/formatters'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store'

test('Quotation Bangladeshi Press Upgrade - Presets Catalog', () => {
  // Test presets availability
  assert.ok(BANGLADESHI_PRINT_PRESETS.length >= 10, 'Expected at least 10 Bangladeshi printing presets')

  const digital = getPresetsByCategory('digital')
  assert.ok(digital.some((p) => p.name.includes('Pana Flex') && p.name.includes('Frontlit')), 'Should contain Pana Flex')
  assert.ok(digital.some((p) => p.name.includes('Backlit')), 'Should contain Backlit')

  const offset = getPresetsByCategory('offset')
  assert.ok(offset.some((p) => p.name.includes('Visiting Card')), 'Should contain Visiting Card')
  assert.ok(offset.some((p) => p.name.includes('Cash Memo')), 'Should contain Cash Memo')

  const signage = getPresetsByCategory('signage')
  assert.ok(signage.some((p) => p.name.includes('Acrylic LED')), 'Should contain Acrylic LED Sign')
  assert.ok(signage.some((p) => p.name.includes('Neon')), 'Should contain Neon Flex')

  const ready = getPresetsByCategory('ready')
  assert.ok(ready.some((p) => p.name.includes('ID Card')), 'Should contain ID Card')
})

test('Quotation Creation with Bangladeshi Commercial Terms (50% Advance, VAT, Margin Shield)', async () => {
  const testCompanyId = `test-comp-${Date.now()}`

  const created = await QuotationRepository.createQuotation({
    company_id: testCompanyId,
    customer_name: 'Bengal Marketing & Trade',
    customer_phone: '01711122233',
    salesperson_name: 'Rafiqul Islam',
    valid_until: '2026-10-15',
    vat_rate: 7.5,
    advance_percentage: 50,
    items: [
      {
        description: 'Pana Flex Frontlit Banner (Standard 280 GSM)',
        category_preset: 'digital',
        material_spec: '280 GSM Star Frontlit China Flex',
        width: 10,
        height: 5,
        dimension_unit: 'ft',
        area_sft: 50,
        quantity: 2,
        unit: 'sft',
        unit_rate: 22,
        rate_source: 'tier_corporate',
        item_total: 2200, // 50 * 2 * 22 = 2200
        artwork_required: true,
      },
      {
        description: '3D Acrylic LED Backlit Channel Letter Signboard',
        category_preset: 'signage',
        material_spec: '3mm Cast Acrylic + 0.8mm SS Border',
        width: 12,
        height: 3,
        dimension_unit: 'ft',
        area_sft: 36,
        quantity: 1,
        unit_rate: 650,
        rate_source: 'preset',
        item_total: 23400, // 36 * 650 = 23400
        signage_specs: {
          lighting: 'Samsung Module 1.2W LED Backlit',
          structure: '1.5-inch MS Square Pipe Frame',
          frame: 'SS 304 Gold Mirror',
        },
      },
    ],
  })

  assert.ok(created.id, 'Quotation ID must be present')
  assert.equal(created.subtotal, 25600, 'Subtotal should be 2200 + 23400 = 25600')
  assert.equal(created.vat_amount, 1920, 'VAT @ 7.5% should be 1920')
  assert.equal(created.grand_total, 27520, 'Grand total should be 27520')
  assert.equal(created.advance_percentage, 50, 'Advance percentage should be 50%')
  assert.equal(created.advance_amount, 13760, 'Advance amount should be 50% of 27520 = 13760')
  assert.equal(created.due_on_delivery, 13760, 'Due on delivery should be 13760')

  // Check currency formatting and in-words
  const wordsBn = numberToWordsBangla(created.grand_total)
  assert.ok(wordsBn.length > 0, 'Bangla in-words must be generated')

  const wordsEn = numberToWordsBDT(created.grand_total)
  assert.ok(wordsEn.includes('Twenty Seven Thousand Five Hundred Twenty Taka Only'), `Words EN mismatch: ${wordsEn}`)
})

test('Quotation Negotiation and Concession Margin Simulator', async () => {
  const testCompanyId = `test-comp-${Date.now()}`

  const created = await QuotationRepository.createQuotation({
    company_id: testCompanyId,
    customer_name: 'Dhaka Offset Press',
    customer_phone: '01811223344',
    salesperson_name: 'Shamol',
    valid_until: '2026-10-15',
    vat_rate: 7.5,
    items: [
      {
        description: 'Visiting Card - Spot UV & Matt Lamination',
        category_preset: 'offset',
        material_spec: '300 GSM Art Card',
        width: 0,
        height: 0,
        quantity: 10,
        unit: 'box',
        unit_rate: 650,
        item_total: 6500,
        offset_specs: {
          paper_gsm: '300',
          print_mode: 'Both Side 4-Color (4+4)',
          binding: 'Die Cut & Box Pack',
        },
      },
    ],
  })

  // Apply negotiated discount of ৳500
  const negotiated = await QuotationRepository.applyNegotiation(
    created.id,
    testCompanyId,
    500,
    'Agreed to ৳500 discount for 10 boxes'
  )

  assert.ok(negotiated, 'Negotiation result should exist')
  assert.equal(negotiated.discount_amount, 500, 'Discount amount should be 500')
  assert.equal(negotiated.subtotal, 6500)
  // Subtotal after disc = 6000. VAT 7.5% = 450. Grand Total = 6450
  assert.equal(negotiated.vat_amount, 450)
  assert.equal(negotiated.grand_total, 6450)
})

test('Conversion to Job Order and Invoice with Full Domain Specs & Advance Retention', async () => {
  const testCompanyId = `test-comp-${Date.now()}`

  const created = await QuotationRepository.createQuotation({
    company_id: testCompanyId,
    customer_name: 'Apex Footwear Signage Project',
    customer_phone: '01911223344',
    salesperson_name: 'Karim',
    valid_until: '2026-10-15',
    advance_percentage: 50,
    items: [
      {
        description: 'SS 3D Letter Signboard with Warm LED',
        category_preset: 'signage',
        material_spec: '304 Grade Stainless Steel Gold Mirror',
        width: 15,
        height: 4,
        dimension_unit: 'ft',
        area_sft: 60,
        quantity: 1,
        unit_rate: 750,
        item_total: 45000,
        signage_specs: {
          lighting: 'Warm White LED Module',
          structure: 'Heavy Duty MS Frame',
          frame: 'Gold Mirror SS',
        },
      },
    ],
  })

  // 1. Convert to Job Order
  const jobOrder = await QuotationRepository.convertQuotationToJobOrder(created.id, testCompanyId)
  assert.ok(jobOrder, 'Job Order should be created')
  assert.equal(jobOrder.order_number.startsWith('ORD-'), true)
  assert.equal(jobOrder.final_price, created.grand_total)
  assert.equal(jobOrder.advance_amount, created.advance_amount, 'Advance amount must match quoted advance')
  assert.equal(jobOrder.items[0].category_preset, 'signage', 'Signage category preset must be preserved')
  assert.ok(jobOrder.items[0].signage_specs, 'Signage specs must be preserved in job order')

  // Check quotation status
  const refreshed = await QuotationRepository.getQuotationById(created.id, testCompanyId)
  assert.equal(refreshed?.status, 'converted')
  assert.equal(refreshed?.converted_order_id, jobOrder.order_number)
})
