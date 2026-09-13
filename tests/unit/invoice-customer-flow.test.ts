import { test, describe } from 'node:test'
import assert from 'node:assert'

/**
 * Bangladesh Phone Normalizer utility
 */
export function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('880') && digits.length === 13) {
    return '0' + digits.slice(3)
  }
  if (digits.startsWith('80') && digits.length === 12) {
    return '0' + digits.slice(2)
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return '0' + digits
  }
  if (digits.length === 11 && digits.startsWith('01')) {
    return digits
  }
  return digits
}

/**
 * Duplicate customer finder simulation
 */
export function detectDuplicateCustomer(
  input: { name: string; mobile: string; company_name?: string },
  existing: Array<{ id: string; name: string; mobile: string; company_name?: string }>
): { hasDuplicate: boolean; matchedCustomer?: any } {
  const normalizedInputPhone = normalizeBdPhone(input.mobile)

  const match = existing.find((c) => {
    const normExistingPhone = normalizeBdPhone(c.mobile)
    if (normExistingPhone && normExistingPhone === normalizedInputPhone) {
      return true
    }
    if (
      c.name.trim().toLowerCase() === input.name.trim().toLowerCase() &&
      input.company_name &&
      c.company_name &&
      c.company_name.trim().toLowerCase() === input.company_name.trim().toLowerCase()
    ) {
      return true
    }
    return false
  })

  return {
    hasDuplicate: !!match,
    matchedCustomer: match,
  }
}

/**
 * 3-Tier Rate Hierarchy Resolver
 */
export function resolve3TierRate(params: {
  customRate?: number | null
  lastInvoiceRate?: number | null
  productStandardRate: number
}): { effectiveRate: number; source: 'custom' | 'last_invoice' | 'default' } {
  // Tier 1: Customer-specific custom rate
  if (params.customRate !== null && params.customRate !== undefined && params.customRate > 0) {
    return { effectiveRate: params.customRate, source: 'custom' }
  }

  // Tier 2: Last valid invoice rate
  if (params.lastInvoiceRate !== null && params.lastInvoiceRate !== undefined && params.lastInvoiceRate > 0) {
    return { effectiveRate: params.lastInvoiceRate, source: 'last_invoice' }
  }

  // Tier 3: Product default catalog rate
  return { effectiveRate: params.productStandardRate, source: 'default' }
}

describe('Invoice Customer Flow & Duplicate Prevention', () => {
  test('normalizes various BD phone formats consistently', () => {
    assert.strictEqual(normalizeBdPhone('01712345678'), '01712345678')
    assert.strictEqual(normalizeBdPhone('+8801712345678'), '01712345678')
    assert.strictEqual(normalizeBdPhone('8801712345678'), '01712345678')
    assert.strictEqual(normalizeBdPhone('+88 017-1234-5678'), '01712345678')
  })

  test('detects duplicate customer by normalized phone number', () => {
    const existing = [
      { id: 'c-101', name: 'Rahim Enterprise', mobile: '01711223344', company_name: 'Rahim Group' },
      { id: 'c-102', name: 'Karim Brothers', mobile: '01855667788', company_name: 'Karim Press' },
    ]

    const check1 = detectDuplicateCustomer(
      { name: 'Rahim Ent.', mobile: '+8801711223344' },
      existing
    )
    assert.strictEqual(check1.hasDuplicate, true)
    assert.strictEqual(check1.matchedCustomer.id, 'c-101')

    const check2 = detectDuplicateCustomer(
      { name: 'New Client', mobile: '01999887766' },
      existing
    )
    assert.strictEqual(check2.hasDuplicate, false)
  })

  test('resolves 3-tier pricing with Tier 1 Custom Rate taking highest priority', () => {
    const pricing = resolve3TierRate({
      customRate: 18,
      lastInvoiceRate: 20,
      productStandardRate: 25,
    })
    assert.strictEqual(pricing.effectiveRate, 18)
    assert.strictEqual(pricing.source, 'custom')
  })

  test('resolves 3-tier pricing with Tier 2 Last Invoice Rate when no custom rate is set', () => {
    const pricing = resolve3TierRate({
      customRate: null,
      lastInvoiceRate: 21,
      productStandardRate: 25,
    })
    assert.strictEqual(pricing.effectiveRate, 21)
    assert.strictEqual(pricing.source, 'last_invoice')
  })

  test('resolves 3-tier pricing with Tier 3 Standard Catalog Rate for first-time customer', () => {
    const pricing = resolve3TierRate({
      customRate: null,
      lastInvoiceRate: null,
      productStandardRate: 30,
    })
    assert.strictEqual(pricing.effectiveRate, 30)
    assert.strictEqual(pricing.source, 'default')
  })
})
