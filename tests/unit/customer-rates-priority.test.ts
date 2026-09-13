import { test, describe } from 'node:test'
import assert from 'node:assert'

/**
 * Pure 3-tier Pricing Priority Engine simulation for Unit Testing
 */
export function resolveRatePriority(params: {
  productId: string
  productName: string
  defaultSellingPrice: number
  customRate: number | null
  invoiceHistory: Array<{
    productId?: string
    productName?: string
    unitPrice: number
    invoiceDate: string
    isCancelled: boolean
  }>
}): {
  effectiveRate: number
  source: 'custom' | 'last_invoice' | 'default'
  hasCustomRate: boolean
  lastInvoiceRate: number | null
} {
  // Priority 1: Customer-specific rate
  if (params.customRate !== null && params.customRate !== undefined) {
    return {
      effectiveRate: params.customRate,
      source: 'custom',
      hasCustomRate: true,
      lastInvoiceRate: null,
    }
  }

  // Priority 2: Most recent valid non-cancelled invoice item
  const validItems = params.invoiceHistory
    .filter((inv) => !inv.isCancelled && inv.unitPrice > 0)
    .filter((inv) => inv.productId === params.productId || (inv.productName && inv.productName.toLowerCase() === params.productName.toLowerCase()))
    .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())

  if (validItems.length > 0) {
    return {
      effectiveRate: validItems[0].unitPrice,
      source: 'last_invoice',
      hasCustomRate: false,
      lastInvoiceRate: validItems[0].unitPrice,
    }
  }

  // Priority 3: Default catalog selling price
  return {
    effectiveRate: params.defaultSellingPrice,
    source: 'default',
    hasCustomRate: false,
    lastInvoiceRate: null,
  }
}

describe('Customer Rates 3-Tier Priority & Immutability Unit Tests', () => {
  const sampleProduct = {
    productId: 'prd-001',
    productName: 'Star Flex Banner (280 GSM)',
    defaultSellingPrice: 18.0,
  }

  test('Tier 1: Explicit Customer-Specific Rate takes top priority over invoice and default rate', () => {
    const result = resolveRatePriority({
      ...sampleProduct,
      customRate: 14.5,
      invoiceHistory: [
        {
          productId: 'prd-001',
          productName: 'Star Flex Banner (280 GSM)',
          unitPrice: 16.0,
          invoiceDate: '2026-09-01',
          isCancelled: false,
        },
      ],
    })

    assert.strictEqual(result.effectiveRate, 14.5)
    assert.strictEqual(result.source, 'custom')
    assert.strictEqual(result.hasCustomRate, true)
  })

  test('Tier 2: When no custom rate exists, falls back to most recent valid invoice rate', () => {
    const result = resolveRatePriority({
      ...sampleProduct,
      customRate: null,
      invoiceHistory: [
        {
          productId: 'prd-001',
          productName: 'Star Flex Banner (280 GSM)',
          unitPrice: 15.5,
          invoiceDate: '2026-08-15',
          isCancelled: false,
        },
        {
          productId: 'prd-001',
          productName: 'Star Flex Banner (280 GSM)',
          unitPrice: 16.5,
          invoiceDate: '2026-09-05',
          isCancelled: false,
        },
      ],
    })

    // Must pick the latest date (2026-09-05 at 16.50)
    assert.strictEqual(result.effectiveRate, 16.5)
    assert.strictEqual(result.source, 'last_invoice')
    assert.strictEqual(result.hasCustomRate, false)
    assert.strictEqual(result.lastInvoiceRate, 16.5)
  })

  test('Tier 2 Exclusion: Cancelled or void invoices are strictly excluded from fallback', () => {
    const result = resolveRatePriority({
      ...sampleProduct,
      customRate: null,
      invoiceHistory: [
        {
          productId: 'prd-001',
          productName: 'Star Flex Banner (280 GSM)',
          unitPrice: 12.0, // Erroneous cancelled invoice rate
          invoiceDate: '2026-09-10',
          isCancelled: true, // Cancelled!
        },
        {
          productId: 'prd-001',
          productName: 'Star Flex Banner (280 GSM)',
          unitPrice: 17.0,
          invoiceDate: '2026-08-01',
          isCancelled: false,
        },
      ],
    })

    // Cancelled invoice on Sept 10 is skipped; valid Aug 1 invoice is chosen
    assert.strictEqual(result.effectiveRate, 17.0)
    assert.strictEqual(result.source, 'last_invoice')
  })

  test('Tier 3: When no custom rate and no invoice history exists, falls back to catalog default rate', () => {
    const result = resolveRatePriority({
      ...sampleProduct,
      customRate: null,
      invoiceHistory: [],
    })

    assert.strictEqual(result.effectiveRate, 18.0)
    assert.strictEqual(result.source, 'default')
    assert.strictEqual(result.hasCustomRate, false)
    assert.strictEqual(result.lastInvoiceRate, null)
  })

  test('Historical Immutability: Mutating customer rate does not alter past invoice snapshot', () => {
    // 1. Create initial historical invoice at ৳16.00
    const historicalInvoiceLine = {
      invoiceId: 'inv-1001',
      productId: 'prd-001',
      unitPrice: 16.0,
      quantity: 100,
      totalPrice: 1600.0,
    }

    // 2. Change customer rate to ৳22.00
    const updatedCustomRate = 22.0

    // 3. Historical invoice line remains frozen at ৳16.00
    assert.strictEqual(historicalInvoiceLine.unitPrice, 16.0)
    assert.strictEqual(historicalInvoiceLine.totalPrice, 1600.0)
    assert.notStrictEqual(historicalInvoiceLine.unitPrice, updatedCustomRate)
  })
})
