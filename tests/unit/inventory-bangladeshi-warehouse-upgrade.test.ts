import { describe, it } from 'node:test'
import assert from 'node:assert'
import type {
  MaterialRecord,
  InventoryRollRecord,
  InventoryRemnantRecord,
  InventorySummaryStats,
} from '../../types/inventory.types.ts'
import type { PurchaseOrderRecord } from '../../types/purchase.types.ts'
import type { ProductRecord } from '../../types/product.types.ts'

describe('Bangladeshi Press Inventory & Warehouse Operations Upgrade Unit Tests', () => {
  const mockMaterials: MaterialRecord[] = [
    {
      id: 'mat-001',
      company_id: 'tenant-dhaka-press',
      sku: 'FLEX-STAR-440',
      name: 'Star Flex Backlit Banner Media 440 GSM (10ft)',
      name_bn: 'স্টার ফ্লেক্স ব্যাকলিট মিডিয়া ৪৪০ জিএসএম',
      category: 'flex' as any,
      unit: 'sft' as any,
      current_stock: 3000,
      reorder_level: 1000,
      min_stock_level: 500,
      average_cost: 14.5,
      last_purchase_price: 15.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mat-002',
      company_id: 'tenant-dhaka-press',
      sku: 'VINYL-GLOSS-3M',
      name: 'Glossy Vinyl Sticker Media (4ft)',
      name_bn: 'গ্লসি ভিনাইল স্টিকার মিডিয়া',
      category: 'vinyl' as any,
      unit: 'sft' as any,
      current_stock: 400,
      reorder_level: 600, // LOW STOCK
      min_stock_level: 300,
      average_cost: 18.0,
      last_purchase_price: 18.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mat-003',
      company_id: 'tenant-dhaka-press',
      sku: 'ACRYLIC-5MM-CLR',
      name: 'Cast Clear Acrylic Sheet 5mm (8ft x 4ft)',
      name_bn: 'ক্লিয়ার অ্যাক্রিলিক শিট ৫ মিমি',
      category: 'acrylic' as any,
      unit: 'sheets' as any,
      current_stock: 0, // OUT OF STOCK
      reorder_level: 10,
      min_stock_level: 5,
      average_cost: 3200.0,
      last_purchase_price: 3200.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const mockRolls: InventoryRollRecord[] = [
    {
      id: 'roll-001',
      company_id: 'tenant-dhaka-press',
      material_id: 'mat-001',
      roll_code: 'ROL-FLEX-10FT-01',
      roll_tag: 'BATCH-2026-09A',
      width_ft: 10,
      initial_length_ft: 164,
      current_length_ft: 120,
      remaining_area_sft: 1200,
      status: 'mounted' as any,
      mounted_machine_id: 'mach-seiko-01',
      mounted_machine_name: 'Seiko ColorPainter H3-104S (10.5ft)',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'roll-002',
      company_id: 'tenant-dhaka-press',
      material_id: 'mat-002',
      roll_code: 'ROL-VINYL-4FT-01',
      roll_tag: 'BATCH-2026-09B',
      width_ft: 4,
      initial_length_ft: 164,
      current_length_ft: 164,
      remaining_area_sft: 656,
      status: 'available' as any,
      location_name: 'Main Roll Warehouse - Rack A3',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const mockRemnants: InventoryRemnantRecord[] = [
    {
      id: 'rem-001',
      company_id: 'tenant-dhaka-press',
      parent_material_id: 'mat-003',
      remnant_code: 'REM-ACR-001',
      width: 4,
      length: 3,
      dimension_unit: 'ft' as any,
      area_sft: 12,
      condition: 'usable' as any,
      status: 'available' as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const mockPurchaseOrders: PurchaseOrderRecord[] = [
    {
      id: 'po-001',
      company_id: 'tenant-dhaka-press',
      po_number: 'PO-2026-0001',
      supplier_id: 'sup-01',
      supplier_name: 'Dhaka Media Importers Ltd',
      po_date: '2026-09-22',
      status: 'issued',
      grand_total: 85000,
      paid_amount: 0,
      due_amount: 85000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  it('1. Computes total valuation, low-stock warnings, and out-of-stock items accurately', () => {
    let totalValuation = 0
    const lowStockList: MaterialRecord[] = []
    const outOfStockList: MaterialRecord[] = []

    for (const mat of mockMaterials) {
      const stock = Number(mat.current_stock || 0)
      const cost = Number(mat.average_cost || 0)
      const reorder = Number(mat.reorder_level || 0)

      totalValuation += stock * cost

      if (stock <= 0) {
        outOfStockList.push(mat)
      } else if (stock <= reorder) {
        lowStockList.push(mat)
      }
    }

    // 3000 * 14.5 + 400 * 18.0 + 0 * 3200 = 43500 + 7200 = 50700
    assert.strictEqual(totalValuation, 50700)
    assert.strictEqual(lowStockList.length, 1)
    assert.strictEqual(lowStockList[0].sku, 'VINYL-GLOSS-3M')
    assert.strictEqual(outOfStockList.length, 1)
    assert.strictEqual(outOfStockList[0].sku, 'ACRYLIC-5MM-CLR')
  })

  it('2. Evaluates Large Format Roll dimensions and calculated SFT area correctly', () => {
    const roll1 = mockRolls[0]
    const calculatedArea = (roll1.current_length_ft || 0) * (roll1.width_ft || 0)
    assert.strictEqual(calculatedArea, 1200)
    assert.strictEqual(roll1.status, 'mounted')
    assert.strictEqual(roll1.mounted_machine_id, 'mach-seiko-01')

    const roll2 = mockRolls[1]
    const calculatedArea2 = (roll2.current_length_ft || 0) * (roll2.width_ft || 0)
    assert.strictEqual(calculatedArea2, 656)
    assert.strictEqual(roll2.status, 'available')
  })

  it('3. Tracks Remnants / Off-cuts leftover area and state transitions', () => {
    const remnant = mockRemnants[0]
    const area = remnant.width * remnant.length
    assert.strictEqual(area, 12)
    assert.strictEqual(remnant.status, 'available')
    assert.strictEqual(remnant.condition, 'usable')
  })

  it('4. Validates Pending Inward PO queue calculation for Receiving GRN', () => {
    const pendingPOs = mockPurchaseOrders.filter((po) => po.status === 'issued' || po.status === 'partially_received')
    assert.strictEqual(pendingPOs.length, 1)
    assert.strictEqual(pendingPOs[0].po_number, 'PO-2026-0001')
    assert.strictEqual(pendingPOs[0].grand_total, 85000)
  })
})
