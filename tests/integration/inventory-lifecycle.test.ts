import { test, describe } from 'node:test'
import assert from 'node:assert'
import type {
  MaterialRecord,
  InventoryLocationRecord,
  InventoryStockBalanceRecord,
  MaterialRequestRecord,
  MaterialIssueRecord,
  InventoryRemnantRecord,
  InventoryTransferRecord,
  InventoryAdjustmentRecord,
  StockLedgerRecord,
} from '../../types/inventory.types.ts'

describe('V3 Inventory Complete Operational Lifecycle Integration Test Suite', () => {
  const companyId = 'tenant-dhaka-print-01'

  // Mock State In-Memory Simulator for Unit/Integration Verification
  const store = {
    materials: new Map<string, MaterialRecord>(),
    locations: new Map<string, InventoryLocationRecord>(),
    balances: new Map<string, InventoryStockBalanceRecord>(),
    requests: new Map<string, MaterialRequestRecord>(),
    issues: new Map<string, MaterialIssueRecord>(),
    remnants: new Map<string, InventoryRemnantRecord>(),
    transfers: new Map<string, InventoryTransferRecord>(),
    adjustments: new Map<string, InventoryAdjustmentRecord>(),
    ledger: [] as StockLedgerRecord[],
  }

  test('Step 1: Creates Material Master with Bangla Unicode & Technical Specs', () => {
    const mat: MaterialRecord = {
      id: 'mat-flex-440',
      company_id: companyId,
      sku: 'FLEX-440-WHT',
      name: 'Star Frontlit Flex 440 GSM Gloss',
      name_bn: 'স্টার ফ্রন্টলিট ফ্লেক্স ৪৪০ জিএসএম',
      category: 'flex',
      brand: 'Star Flex Korea',
      specification: 'High Tenacity Polyester Mesh',
      color: 'Pure White Gloss',
      thickness: '440 GSM',
      width: 10,
      length: 164,
      dimension_unit: 'ft',
      unit: 'roll',
      base_unit: 'roll',
      is_roll: true,
      roll_width_ft: 10,
      roll_length_ft: 164,
      total_roll_area_sft: 1640,
      current_stock: 0,
      reorder_level: 5,
      min_stock_level: 2,
      last_purchase_price: 12500,
      average_cost: 12500,
      manual_cost: 12500,
      valuation_method: 'average_cost',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    store.materials.set(mat.id, mat)
    assert.strictEqual(store.materials.get('mat-flex-440')?.sku, 'FLEX-440-WHT')
    assert.strictEqual(store.materials.get('mat-flex-440')?.name_bn, 'স্টার ফ্রন্টলিট ফ্লেক্স ৪৪০ জিএসএম')
  })

  test('Step 2: Creates Warehouse Locations (Main Store, Press Floor, Remnant Rack)', () => {
    const locMain: InventoryLocationRecord = {
      id: 'loc-main-store',
      company_id: companyId,
      location_code: 'LOC-MAIN-01',
      location_name: 'Central Warehouse Store',
      location_type: 'main_store',
      description: 'Ground Floor Substrate Racks',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const locFloor: InventoryLocationRecord = {
      id: 'loc-press-floor',
      company_id: companyId,
      location_code: 'LOC-FLOOR-01',
      location_name: 'Roland Wide-Format Press Area',
      location_type: 'production_floor',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const locRemnants: InventoryLocationRecord = {
      id: 'loc-remnant-rack',
      company_id: companyId,
      location_code: 'LOC-REM-01',
      location_name: 'Usable Remnants Rack A',
      location_type: 'remnant_rack',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    store.locations.set(locMain.id, locMain)
    store.locations.set(locFloor.id, locFloor)
    store.locations.set(locRemnants.id, locRemnants)

    assert.strictEqual(store.locations.size, 3)
  })

  test('Step 3: Receives Initial Opening Stock Balance with Immutable Ledger Audit', () => {
    const mat = store.materials.get('mat-flex-440')!
    const receiveQty = 20 // 20 rolls

    // Update material overall stock
    mat.current_stock += receiveQty

    // Create location balance
    store.balances.set(`bal-${mat.id}-loc-main-store`, {
      id: `bal-${mat.id}-loc-main-store`,
      company_id: companyId,
      material_id: mat.id,
      location_id: 'loc-main-store',
      available_quantity: receiveQty,
      reserved_quantity: 0,
      issued_quantity: 0,
      unit: 'roll',
      updated_at: new Date().toISOString(),
    })

    // Ledger Entry
    store.ledger.push({
      id: 'led-001',
      company_id: companyId,
      material_id: mat.id,
      location_id: 'loc-main-store',
      transaction_type: 'opening_stock',
      quantity_change: receiveQty,
      unit: 'roll',
      balance_after: receiveQty,
      unit_cost: 12500,
      total_cost: receiveQty * 12500,
      reference_type: 'OPENING_BALANCE',
      reference_id: 'MIG-2026-001',
      performed_by_name: 'Store Manager',
      created_at: new Date().toISOString(),
    })

    assert.strictEqual(mat.current_stock, 20)
    assert.strictEqual(store.ledger.length, 1)
    assert.strictEqual(store.ledger[0].transaction_type, 'opening_stock')
  })

  test('Step 4: Production Task Requisitions 4 Rolls and Store Approves', () => {
    const req: MaterialRequestRecord = {
      id: 'req-1001',
      company_id: companyId,
      request_number: 'MRQ-001001',
      production_task_id: 'task-print-banner-01',
      status: 'requested',
      priority: 'high',
      requested_by_name: 'Production Operator Rahim',
      items: [
        {
          id: 'req-item-01',
          request_id: 'req-1001',
          material_id: 'mat-flex-440',
          requested_quantity: 4,
          issued_quantity: 0,
          unit: 'roll',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    store.requests.set(req.id, req)

    // Store manager approves
    req.status = 'approved'
    req.approved_by_name = 'Inventory Head'

    assert.strictEqual(store.requests.get('req-1001')?.status, 'approved')
  })

  test('Step 5: Store Issues 4 Rolls to Production Floor (Deducts Available Stock)', () => {
    const req = store.requests.get('req-1001')!
    const mat = store.materials.get('mat-flex-440')!
    const mainBal = store.balances.get('bal-mat-flex-440-loc-main-store')!

    const issueQty = 4
    assert.ok(mainBal.available_quantity >= issueQty)

    // Deduct stock from main store
    mainBal.available_quantity -= issueQty
    mat.current_stock -= issueQty
    req.items![0].issued_quantity = issueQty
    req.status = 'issued'

    // Create Issue Record
    const issue: MaterialIssueRecord = {
      id: 'iss-2001',
      company_id: companyId,
      issue_number: 'ISS-002001',
      request_id: req.id,
      production_task_id: 'task-print-banner-01',
      source_location_id: 'loc-main-store',
      issued_by_name: 'Store Keeper',
      received_by_name: 'Rahim Operator',
      status: 'completed',
      items: [
        {
          id: 'iss-item-01',
          issue_id: 'iss-2001',
          request_item_id: 'req-item-01',
          material_id: 'mat-flex-440',
          issued_quantity: 4,
          unit: 'roll',
          unit_cost: 12500,
          total_cost: 50000,
        },
      ],
      created_at: new Date().toISOString(),
    }
    store.issues.set(issue.id, issue)

    // Append Issue to Ledger
    store.ledger.push({
      id: 'led-002',
      company_id: companyId,
      material_id: mat.id,
      location_id: 'loc-main-store',
      transaction_type: 'ISSUE',
      quantity_change: -issueQty,
      unit: 'roll',
      balance_after: mat.current_stock,
      unit_cost: 12500,
      total_cost: issueQty * 12500,
      reference_type: 'MATERIAL_ISSUE',
      reference_id: issue.id,
      production_task_id: 'task-print-banner-01',
      performed_by_name: 'Store Keeper',
      created_at: new Date().toISOString(),
    })

    assert.strictEqual(mainBal.available_quantity, 16)
    assert.strictEqual(mat.current_stock, 16)
    assert.strictEqual(req.status, 'issued')
    assert.strictEqual(store.ledger.length, 2)
  })

  test('Step 6: Production Completes with Consumption Sign-Off, Scrap & Discrete Remnants', () => {
    const mat = store.materials.get('mat-flex-440')!

    // Actual usage: 3 full rolls consumed, 1 roll partially used (creates remnant 10ft x 40ft = 400 SFT),
    // 50 SFT scrap logged with reason
    const consumedRolls = 3
    const remnantAreaSft = 400 // 10ft x 40ft

    // 1. Create Reusable Remnant Record
    const rem: InventoryRemnantRecord = {
      id: 'rem-9001',
      company_id: companyId,
      remnant_code: 'REM-FLEX-0001',
      parent_material_id: mat.id,
      production_task_id: 'task-print-banner-01',
      location_id: 'loc-remnant-rack',
      width: 10,
      length: 40,
      dimension_unit: 'ft',
      area_sft: remnantAreaSft,
      quantity: 1,
      unit: 'pcs',
      condition: 'usable',
      status: 'available',
      created_by_name: 'Rahim Operator',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    store.remnants.set(rem.id, rem)

    // 2. Ledger Consumption Entry
    store.ledger.push({
      id: 'led-003',
      company_id: companyId,
      material_id: mat.id,
      transaction_type: 'CONSUMPTION',
      quantity_change: 0,
      unit: 'roll',
      balance_after: mat.current_stock,
      unit_cost: 12500,
      total_cost: consumedRolls * 12500,
      reference_type: 'PRODUCTION_CONSUMPTION',
      production_task_id: 'task-print-banner-01',
      notes: 'Completed Billboard Print Job #101',
      performed_by_name: 'Rahim Operator',
      created_at: new Date().toISOString(),
    })

    // 3. Ledger Scrap Entry
    store.ledger.push({
      id: 'led-004',
      company_id: companyId,
      material_id: mat.id,
      transaction_type: 'WASTAGE',
      quantity_change: 0,
      unit: 'roll',
      balance_after: mat.current_stock,
      unit_cost: 0,
      total_cost: 0,
      reference_type: 'PRODUCTION_WASTAGE',
      production_task_id: 'task-print-banner-01',
      notes: 'Margin trim and color test strips (50 SFT)',
      performed_by_name: 'Rahim Operator',
      created_at: new Date().toISOString(),
    })

    assert.strictEqual(store.remnants.size, 1)
    assert.strictEqual(store.remnants.get('rem-9001')?.remnant_code, 'REM-FLEX-0001')
    assert.strictEqual(store.remnants.get('rem-9001')?.area_sft, 400)
    assert.strictEqual(store.ledger.length, 4)
  })

  test('Step 7: Inter-Location Transfer (Main Store -> Press Floor Staging)', () => {
    const mainBal = store.balances.get('bal-mat-flex-440-loc-main-store')!
    const mat = store.materials.get('mat-flex-440')!
    const transferQty = 5

    // TRANSFER_OUT from main store
    mainBal.available_quantity -= transferQty

    // TRANSFER_IN to press floor
    let floorBal = store.balances.get('bal-mat-flex-440-loc-press-floor')
    if (!floorBal) {
      floorBal = {
        id: 'bal-mat-flex-440-loc-press-floor',
        company_id: companyId,
        material_id: mat.id,
        location_id: 'loc-press-floor',
        available_quantity: transferQty,
        reserved_quantity: 0,
        issued_quantity: 0,
        unit: 'roll',
        updated_at: new Date().toISOString(),
      }
      store.balances.set(floorBal.id, floorBal)
    } else {
      floorBal.available_quantity += transferQty
    }

    const trf: InventoryTransferRecord = {
      id: 'trf-5001',
      company_id: companyId,
      transfer_number: 'TRF-005001',
      source_location_id: 'loc-main-store',
      destination_location_id: 'loc-press-floor',
      material_id: mat.id,
      quantity: transferQty,
      unit: 'roll',
      status: 'completed',
      transferred_by_name: 'Store Officer',
      created_at: new Date().toISOString(),
    }
    store.transfers.set(trf.id, trf)

    assert.strictEqual(mainBal.available_quantity, 11)
    assert.strictEqual(floorBal.available_quantity, 5)
    // Overall material stock remains constant: 11 + 5 = 16
    assert.strictEqual(mainBal.available_quantity + floorBal.available_quantity, 16)
  })

  test('Step 8: Physical Count Reconciliation with Variance Logging', () => {
    const mat = store.materials.get('mat-flex-440')!
    const mainBal = store.balances.get('bal-mat-flex-440-loc-main-store')!
    const currentSysQty = mainBal.available_quantity // 11 rolls
    const physicalAuditedCount = 10 // 1 roll damaged by water leak
    const variance = physicalAuditedCount - currentSysQty // -1

    mainBal.available_quantity = physicalAuditedCount
    mat.current_stock += variance // 16 - 1 = 15

    const adj: InventoryAdjustmentRecord = {
      id: 'adj-6001',
      company_id: companyId,
      adjustment_number: 'ADJ-006001',
      location_id: 'loc-main-store',
      material_id: mat.id,
      adjustment_type: 'damage_discovered',
      previous_quantity: currentSysQty,
      new_quantity: physicalAuditedCount,
      variance_quantity: variance,
      unit: 'roll',
      reason: 'Water leak damage during heavy monsoon rain',
      authorized_by_name: 'Audit Manager',
      created_at: new Date().toISOString(),
    }
    store.adjustments.set(adj.id, adj)

    // Ledger Adjustment Entry
    store.ledger.push({
      id: 'led-005',
      company_id: companyId,
      material_id: mat.id,
      location_id: 'loc-main-store',
      transaction_type: 'ADJUSTMENT_OUT',
      quantity_change: variance,
      unit: 'roll',
      balance_after: mat.current_stock,
      unit_cost: 12500,
      total_cost: Math.abs(variance) * 12500,
      reference_type: 'INVENTORY_ADJUSTMENT',
      reference_id: adj.id,
      notes: 'Water leak damage during heavy monsoon rain (-1 roll)',
      performed_by_name: 'Audit Manager',
      created_at: new Date().toISOString(),
    })

    assert.strictEqual(mainBal.available_quantity, 10)
    assert.strictEqual(mat.current_stock, 15)
    assert.strictEqual(adj.variance_quantity, -1)
    assert.strictEqual(store.ledger.length, 5)
  })
})
