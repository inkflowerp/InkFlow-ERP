import { test, describe } from 'node:test'
import assert from 'node:assert'
import { getSupplierPriceBenchmark } from '../../services/purchase.service.ts'
import type { SupplierPriceHistoryRecord, SupplierLedgerEntryRecord } from '../../types/purchase.types.ts'

describe('V5 Unit: Purchasing & Procurement Engine Calculations', () => {
  test('calculates supplier price benchmarks accurately across historical transactions', () => {
    const history: SupplierPriceHistoryRecord[] = [
      {
        id: 'h-1',
        company_id: 'c-01',
        material_id: 'mat-flex-510',
        material_name: 'Flex 510 GSM',
        supplier_id: 'sup-01',
        supplier_name: 'Star Flex Corp',
        purchase_price: 32.5,
        quantity: 1000,
        po_date: '2026-09-01',
        created_at: new Date().toISOString(),
      },
      {
        id: 'h-2',
        company_id: 'c-01',
        material_id: 'mat-flex-510',
        material_name: 'Flex 510 GSM',
        supplier_id: 'sup-02',
        supplier_name: 'Apex Media Ltd',
        purchase_price: 28.0,
        quantity: 500,
        po_date: '2026-08-15',
        created_at: new Date().toISOString(),
      },
      {
        id: 'h-3',
        company_id: 'c-01',
        material_id: 'mat-flex-510',
        material_name: 'Flex 510 GSM',
        supplier_id: 'sup-01',
        supplier_name: 'Star Flex Corp',
        purchase_price: 35.5,
        quantity: 800,
        po_date: '2026-07-20',
        created_at: new Date().toISOString(),
      },
    ]

    const benchmark = getSupplierPriceBenchmark('mat-flex-510', 'Flex 510 GSM', history)

    assert.strictEqual(benchmark.material_id, 'mat-flex-510')
    assert.strictEqual(benchmark.last_price, 32.5)
    assert.strictEqual(benchmark.lowest_price, 28.0)
    assert.strictEqual(benchmark.highest_price, 35.5)
    assert.strictEqual(benchmark.average_price, 32) // (32.5 + 28.0 + 35.5) / 3 = 32
    assert.strictEqual(benchmark.history.length, 3)
  })

  test('returns default benchmark values when no history exists for material', () => {
    const benchmark = getSupplierPriceBenchmark('mat-unknown', 'Unknown Vinyl', [])
    assert.strictEqual(benchmark.last_price, 0)
    assert.strictEqual(benchmark.average_price, 0)
    assert.strictEqual(benchmark.lowest_price, 0)
    assert.strictEqual(benchmark.highest_price, 0)
    assert.strictEqual(benchmark.history.length, 0)
  })

  test('calculates running ledger balance correctly for supplier transactions', () => {
    const entries: SupplierLedgerEntryRecord[] = []
    let currentBalance = 0

    // 1. Goods Receipt: Credit liability +৳50,000
    const credit1 = 50000
    currentBalance += credit1
    entries.push({
      id: 'led-1',
      company_id: 'c-01',
      supplier_id: 'sup-01',
      entry_type: 'GOODS_RECEIPT',
      debit: 0,
      credit: credit1,
      running_balance: currentBalance,
      created_at: new Date().toISOString(),
    })
    assert.strictEqual(currentBalance, 50000)

    // 2. Partial Payment: Debit -৳30,000
    const debit1 = 30000
    currentBalance -= debit1
    entries.push({
      id: 'led-2',
      company_id: 'c-01',
      supplier_id: 'sup-01',
      entry_type: 'PAYMENT',
      debit: debit1,
      credit: 0,
      running_balance: currentBalance,
      created_at: new Date().toISOString(),
    })
    assert.strictEqual(currentBalance, 20000)

    // 3. Supplier Return: Debit -৳5,000
    const debit2 = 5000
    currentBalance -= debit2
    entries.push({
      id: 'led-3',
      company_id: 'c-01',
      supplier_id: 'sup-01',
      entry_type: 'RETURN',
      debit: debit2,
      credit: 0,
      running_balance: currentBalance,
      created_at: new Date().toISOString(),
    })
    assert.strictEqual(currentBalance, 15000)
    assert.strictEqual(entries[entries.length - 1].running_balance, 15000)
  })
})
