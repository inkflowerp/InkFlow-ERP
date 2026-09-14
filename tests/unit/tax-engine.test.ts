import { test, describe } from 'node:test'
import assert from 'node:assert'
import { TaxService } from '../../services/tax.service.ts'
import { numberToWordsBangla, numberToWordsBDT } from '../../lib/formatters.ts'
import type { TaxProfileRecord } from '../../types/tax.types.ts'

describe('Tax & VAT Engine Unit Tests (V7)', () => {
  const std15Profile: TaxProfileRecord = {
    id: 'tp-test-15',
    company_id: 'co-tax-unit-test',
    code: 'VAT-15',
    name: 'Standard VAT 15%',
    rate: 15.00,
    calculation_mode: 'exclusive',
    tax_type: 'STANDARD',
    is_recoverable: true,
    effective_from: '2026-01-01',
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const trun75Profile: TaxProfileRecord = {
    id: 'tp-test-7-5',
    company_id: 'co-tax-unit-test',
    code: 'VAT-7.5',
    name: 'Truncated Service VAT 7.5%',
    rate: 7.50,
    calculation_mode: 'exclusive',
    tax_type: 'TRUNCATED',
    is_recoverable: true,
    effective_from: '2026-01-01',
    is_active: true,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const retail5InclusiveProfile: TaxProfileRecord = {
    id: 'tp-test-5-inc',
    company_id: 'co-tax-unit-test',
    code: 'VAT-5',
    name: 'Retail POS 5%',
    rate: 5.00,
    calculation_mode: 'inclusive',
    tax_type: 'REDUCED',
    is_recoverable: false,
    effective_from: '2026-01-01',
    is_active: true,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const zeroRatedProfile: TaxProfileRecord = {
    id: 'tp-test-zero',
    company_id: 'co-tax-unit-test',
    code: 'VAT-ZERO',
    name: 'Zero-Rated 0%',
    rate: 0.00,
    calculation_mode: 'exclusive',
    tax_type: 'ZERO_RATED',
    is_recoverable: true,
    effective_from: '2026-01-01',
    is_active: true,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const exemptProfile: TaxProfileRecord = {
    id: 'tp-test-exempt',
    company_id: 'co-tax-unit-test',
    code: 'VAT-EXEMPT',
    name: 'Exempt Goods 0%',
    rate: 0.00,
    calculation_mode: 'exclusive',
    tax_type: 'EXEMPT',
    is_recoverable: false,
    effective_from: '2026-01-01',
    is_active: true,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  test('calculates standard 15% exclusive VAT accurately on commercial printing order', () => {
    // Qty 10, Unit Price ৳5,000 = ৳50,000. 15% VAT = ৳7,500. Total = ৳57,500.
    const res = TaxService.calculateLineVat(
      { quantity: 10, unit_price: 5000 },
      std15Profile
    )

    assert.strictEqual(res.gross_amount, 50000)
    assert.strictEqual(res.discount_amount, 0)
    assert.strictEqual(res.taxable_amount, 50000)
    assert.strictEqual(res.vat_rate, 15)
    assert.strictEqual(res.vat_amount, 7500)
    assert.strictEqual(res.total_amount, 57500)
    assert.strictEqual(res.pricing_mode, 'exclusive')
  })

  test('calculates 5% inclusive retail VAT accurately with net price extraction', () => {
    // Walk-in gross total ৳10,500 with 5% inclusive VAT.
    // Base = 10,500 / 1.05 = 10,000. VAT = 500. Total = 10,500.
    const res = TaxService.calculateLineVat(
      { quantity: 1, unit_price: 10500 },
      retail5InclusiveProfile
    )

    assert.strictEqual(res.gross_amount, 10500)
    assert.strictEqual(res.taxable_amount, 10500)
    assert.strictEqual(res.vat_amount, 500)
    assert.strictEqual(res.total_amount, 10500)
    assert.strictEqual(res.pricing_mode, 'inclusive')
  })

  test('enforces correct discount order of operations before applying 7.5% truncated VAT', () => {
    // Gross: 100 units @ ৳200 = ৳20,000.
    // Discount: ৳2,000.
    // Taxable base = ৳18,000. 7.5% VAT on 18,000 = ৳1,350. Total = ৳19,350.
    const res = TaxService.calculateLineVat(
      { quantity: 100, unit_price: 200, discount_amount: 2000 },
      trun75Profile
    )

    assert.strictEqual(res.gross_amount, 20000)
    assert.strictEqual(res.discount_amount, 2000)
    assert.strictEqual(res.taxable_amount, 18000)
    assert.strictEqual(res.vat_amount, 1350)
    assert.strictEqual(res.total_amount, 19350)
  })

  test('preserves statutory legal distinction between zero-rated and exempt supply', () => {
    const zeroRes = TaxService.calculateLineVat({ quantity: 1, unit_price: 80000 }, zeroRatedProfile)
    const exemptRes = TaxService.calculateLineVat({ quantity: 1, unit_price: 80000 }, exemptProfile)

    assert.strictEqual(zeroRes.vat_amount, 0)
    assert.strictEqual(zeroRes.tax_type, 'ZERO_RATED')
    assert.strictEqual(zeroRes.tax_profile_code, 'VAT-ZERO')

    assert.strictEqual(exemptRes.vat_amount, 0)
    assert.strictEqual(exemptRes.tax_type, 'EXEMPT')
    assert.strictEqual(exemptRes.tax_profile_code, 'VAT-EXEMPT')
  })

  test('aggregates document-level multi-rate breakdowns correctly across mixed items', () => {
    const profiles = new Map<string, TaxProfileRecord>([
      [std15Profile.id, std15Profile],
      [trun75Profile.id, trun75Profile],
      [zeroRatedProfile.id, zeroRatedProfile],
    ])

    const items = [
      { item_id: 'i1', quantity: 2, unit_price: 10000, tax_profile_id: std15Profile.id }, // Gross 20,000 -> 15% VAT = 3,000 -> Total 23,000
      { item_id: 'i2', quantity: 5, unit_price: 4000, discount_amount: 2000, tax_profile_id: trun75Profile.id }, // Gross 20,000 - 2,000 = 18,000 -> 7.5% VAT = 1,350 -> Total 19,350
      { item_id: 'i3', quantity: 1, unit_price: 50000, tax_profile_id: zeroRatedProfile.id }, // Gross 50,000 -> 0% VAT = 0 -> Total 50,000
    ]

    const docBreakdown = TaxService.calculateDocumentVat(items, profiles)

    assert.strictEqual(docBreakdown.subtotal, 90000)
    assert.strictEqual(docBreakdown.total_discount, 2000)
    assert.strictEqual(docBreakdown.taxable_subtotal, 88000)
    assert.strictEqual(docBreakdown.total_vat, 4350)
    assert.strictEqual(docBreakdown.grand_total, 92350)
    assert.strictEqual(docBreakdown.rate_breakdowns.length, 3)
  })

  test('converts numerical amounts to English and Bangla words with complete accuracy', () => {
    const amount = 150000
    assert.strictEqual(numberToWordsBDT(amount), 'One Lakh Fifty Thousand Taka Only')
    assert.strictEqual(numberToWordsBangla(amount), 'এক লক্ষ পঞ্চাশ হাজার টাকা মাত্র')

    const amount2 = 12500
    assert.strictEqual(numberToWordsBDT(amount2), 'Twelve Thousand Five Hundred Taka Only')
    assert.strictEqual(numberToWordsBangla(amount2), 'বারো হাজার পাঁচ শত টাকা মাত্র')
  })
})
