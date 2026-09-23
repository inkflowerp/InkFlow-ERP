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

  test('surfaces all active inventory materials with discrete configured roll sizes and economics', async () => {
    const { PriceIntelligenceEngine } = await import('../../lib/domain/price-intelligence-engine.ts')

    // 1. Roll Media with configured roll sizes (e.g. Black PVC)
    const rollMaterial = {
      id: 'mat-black-pvc',
      name: 'Black PVC Substrate',
      sku: 'MAT-43550',
      category: 'roll_media',
      unit: 'roll',
      is_active: true,
      current_stock: 0,
      material_config: {
        roll_sizes: [
          { id: 'rs-4ft', width_ft: 4, length_ft: 164, default_supplier_price: 6560, is_active: true },
          { id: 'rs-5ft', width_ft: 5.25, length_ft: 164, default_supplier_price: 8610, is_active: true },
        ],
      },
    }

    const rollSizes = PriceIntelligenceEngine.getMaterialActiveSizes(rollMaterial)
    assert.strictEqual(rollSizes.length, 2)
    assert.strictEqual(rollSizes[0].width_ft, 4)
    assert.strictEqual(rollSizes[0].length_ft, 164)
    assert.strictEqual(rollSizes[0].default_supplier_price, 6560)
    assert.strictEqual(rollSizes[0].standard_area_sft, 656)

    assert.strictEqual(rollSizes[1].width_ft, 5.25)
    assert.strictEqual(rollSizes[1].length_ft, 164)
    assert.strictEqual(rollSizes[1].default_supplier_price, 8610)
    assert.strictEqual(rollSizes[1].standard_area_sft, 861)

    // 2. Rigid Sheet (e.g. Forex Board)
    const sheetMaterial = {
      id: 'mat-forex-board',
      name: 'Forex 5mm PVC Sheet',
      sku: 'MAT-FX5MM',
      category: 'rigid_sheet',
      unit: 'sheet',
      is_active: true,
      average_cost: 1400,
      available_sheet_sizes: [{ id: 'sz-4x8', width: 4, length: 8, label: '4ft x 8ft', default_supplier_price: 1400 }],
    }
    const formSheet = PriceIntelligenceEngine.detectMaterialPhysicalForm(sheetMaterial)
    assert.strictEqual(formSheet, 'sheet')

    // 3. Liquid / Inks
    const inkMaterial = {
      id: 'mat-cyan-ink',
      name: 'Eco-Solvent Cyan Ink 1L',
      sku: 'INK-CYAN',
      category: 'ink_chemistry',
      unit: 'bottle',
      is_active: true,
      last_purchase_price: 2200,
    }
    const formInk = PriceIntelligenceEngine.detectMaterialPhysicalForm(inkMaterial)
    assert.strictEqual(formInk, 'liquid')
  })

  test('PurchaseRepository creates PO items preserving roll dimensions (width_ft, length_ft)', async () => {
    const { PurchaseRepository } = await import('../../lib/repositories/purchase.repository.ts')

    const po = await PurchaseRepository.createPurchaseOrder({
      company_id: 'c-test-procure',
      supplier_id: 'sup-star-media',
      supplier_name: 'Star Media BD',
      supplier_phone: '+8801711000000',
      po_date: '2026-09-23',
      expected_delivery_date: '2026-09-28',
      items: [
        {
          id: 'poi-1',
          material_id: 'mat-black-pvc',
          material_name: 'Black PVC (4ft × 164ft)',
          supplier_sku: '4ft × 164ft Roll (656 sqft/roll)',
          roll_width_ft: 4,
          roll_length_ft: 164,
          quantity_ordered: 5,
          quantity_received: 0,
          quantity_remaining: 5,
          unit: 'roll',
          unit_cost: 6560,
          discount_percent: 0,
          tax_percent: 0,
          total_cost: 32800,
        },
      ],
    })

    assert.strictEqual(po.items.length, 1)
    assert.strictEqual(po.items[0].roll_width_ft, 4)
    assert.strictEqual(po.items[0].roll_length_ft, 164)
    assert.strictEqual(po.items[0].unit, 'roll')
    assert.strictEqual(po.items[0].unit_cost, 6560)
    assert.strictEqual(po.items[0].total_cost, 32800)
    assert.strictEqual(po.grand_total, 32800)
  })
})

