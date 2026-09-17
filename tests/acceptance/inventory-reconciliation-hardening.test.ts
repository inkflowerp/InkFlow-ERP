import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { PurchaseRepository } from '../../lib/repositories/purchase.repository.ts'
import { PurchaseService } from '../../services/purchase.service.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { evaluateStockAvailability } from '../../lib/domain/stock-availability.ts'
import type {
  MaterialRecord,
  InventoryRollRecord,
  StockLedgerRecord,
  InventoryLocationRecord,
  InventoryRemnantRecord,
  InventoryStockBalanceRecord,
} from '../../types/inventory.types.ts'

describe('INKFLOW — Inventory & Purchasing Deep Hardening & Reconciliation Suite', () => {
  const companyId = 'co-hardening-test'
  const branchId = 'br-main'

  let mainLocation: InventoryLocationRecord

  beforeEach(() => {
    PrintERPDataStore.clear()

    mainLocation = {
      id: 'loc-main-store',
      company_id: companyId,
      branch_id: branchId,
      location_code: 'MAIN-01',
      location_name: 'Main Central Store',
      location_type: 'main_store',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.LOCATIONS, mainLocation)
  })

  test('1. PO -> GRN -> Stock Inflow & Physical Roll Creation without PO stock pre-inflation', async () => {
    // 1. Setup Material: Vinyl Sticker Roll (Purchase: Roll, Billing: SFT, Dimensions: 2.25ft x 164ft)
    const vinylMaterial: MaterialRecord = {
      id: 'mat-vinyl-225',
      company_id: companyId,
      branch_id: branchId,
      name: 'Vinyl Sticker Glossy 2.25ft',
      sku: 'MAT-VIN-225',
      category: 'vinyl',
      unit: 'roll',
      is_roll: true,
      material_type: 'roll',
      roll_width_ft: 2.25,
      roll_length_ft: 164.0,
      standard_roll_length_ft: 164.0,
      available_widths_ft: [2.25],
      current_stock: 0,
      min_stock_level: 1,
      reorder_level: 2,
      average_cost: 8500.0,
      last_purchase_price: 8500.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, vinylMaterial)

    // 2. Create Purchase Order for 2 Rolls from ABC Media
    const po = await PurchaseService.createPurchaseOrder({
      company_id: companyId,
      branch_id: branchId,
      supplier_id: 'sup-abc-media',
      supplier_name: 'ABC Media Supplier',
      supplier_phone: '01711223344',
      po_date: '2026-09-17',
      expected_delivery_date: '2026-09-18',
      status: 'issued',
      items: [
        {
          id: 'poi-vinyl-01',
          purchase_order_id: 'po-test-01',
          material_id: vinylMaterial.id,
          material_name: vinylMaterial.name,
          quantity_ordered: 2,
          quantity_received: 0,
          quantity_remaining: 2,
          unit: 'roll',
          unit_cost: 8500,
          total_cost: 17000,
        },
      ],
    })

    assert.ok(po.id, 'Purchase order must be successfully created')
    assert.strictEqual(po.status, 'issued')

    // Rule: PO Creation MUST NOT increase inventory or spawn rolls
    const stockAfterPo = await InventoryRepository.getMaterialById(vinylMaterial.id, companyId)
    assert.strictEqual(Number(stockAfterPo?.current_stock || 0), 0, 'Inventory stock must remain 0 after PO creation')

    const rollsAfterPo = await InventoryRepository.getInventoryRolls(companyId)
    assert.strictEqual(rollsAfterPo.length, 0, 'No physical rolls should exist before GRN')

    // 3. Receive partial delivery: 1 Roll via GRN
    const grnResult = await PurchaseService.receiveGoods({
      company_id: companyId,
      branch_id: branchId,
      purchase_order_id: po.id,
      receiving_location_id: mainLocation.id,
      received_date: '2026-09-17',
      challan_number: 'CH-ABC-9001',
      supplier_delivery_note: 'DN-9001',
      received_by_name: 'Store Keeper Rakib',
      items_received: [
        {
          po_item_id: 'poi-vinyl-01',
          material_id: vinylMaterial.id,
          material_name: vinylMaterial.name,
          current_received: 1,
          accepted_quantity: 1,
          rejected_quantity: 0,
          damaged_quantity: 0,
          unit: 'roll',
          unit_cost: 8500,
          batch_lot_number: 'LOT-2026-A',
        },
      ],
    })

    assert.ok(grnResult.grn.id, 'GRN must be recorded')
    assert.strictEqual(grnResult.updatedPO.status, 'partially_received', 'PO status should be partially_received')
    assert.strictEqual(grnResult.updatedPO.items[0].quantity_received, 1)
    assert.strictEqual(grnResult.updatedPO.items[0].quantity_remaining, 1)

    // Verify stock increased by exactly 1 roll
    const stockAfterGrn = await InventoryRepository.getMaterialById(vinylMaterial.id, companyId)
    assert.strictEqual(Number(stockAfterGrn?.current_stock), 1, 'Inventory stock must increase by exactly 1 received roll')

    // Verify exactly 1 physical roll created with accurate dimensions
    const rollsAfterGrn = await InventoryRepository.getInventoryRolls(companyId)
    assert.strictEqual(rollsAfterGrn.length, 1, 'Exactly 1 discrete physical roll record must be created')
    const receivedRoll = rollsAfterGrn[0]
    assert.strictEqual(Number(receivedRoll.width_ft), 2.25, 'Physical roll width must be preserved at 2.25 ft')
    assert.strictEqual(Number(receivedRoll.initial_length_ft), 164.0, 'Physical roll initial length must be 164.0 ft')
    assert.strictEqual(Number(receivedRoll.current_length_ft), 164.0, 'Physical roll current length must be 164.0 ft')
    assert.strictEqual(receivedRoll.status, 'available')
    assert.strictEqual(receivedRoll.purchase_order_id, po.id)
    assert.strictEqual(receivedRoll.grn_id, grnResult.grn.id)
  })

  test('2. Physical Roll Lineal Consumption & Ghost Remnant Bug Elimination', async () => {
    // Setup a 4ft x 164ft Vinyl Roll
    const rollId = 'roll-test-ghost-audit'
    const materialId = 'mat-vinyl-4ft'

    const material: MaterialRecord = {
      id: materialId,
      company_id: companyId,
      name: 'Vinyl Sticker Glossy 4.0ft',
      sku: 'MAT-VIN-400',
      category: 'vinyl',
      unit: 'sft',
      is_roll: true,
      material_type: 'roll',
      roll_width_ft: 4.0,
      roll_length_ft: 164.0,
      current_stock: 656, // 4 * 164 SFT
      min_stock_level: 100,
      average_cost: 25.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, material)

    const initialRoll = await InventoryRepository.createPhysicalRoll({
      id: rollId,
      company_id: companyId,
      material_id: materialId,
      roll_code: 'ROLL-4FT-001',
      width_ft: 4.0,
      initial_length_ft: 164.0,
      unit_cost: 16400,
      location_name: 'Main Store',
    })

    assert.strictEqual(Number(initialRoll.current_length_ft), 164.0)
    assert.strictEqual(initialRoll.status, 'available')

    // Perform standard lineal cut of 12 ft for Job #JOB-101
    const consumeRes = await InventoryRepository.consumeFromPhysicalRoll({
      company_id: companyId,
      roll_id: rollId,
      linear_length_consumed_ft: 12.0,
      job_order_id: 'JOB-101',
      operator_name: 'Print Operator Karim',
    })

    const consumed = consumeRes.roll

    // Rule: Continuous active roll length drops to 152.0 ft, status is 'in_use'
    assert.strictEqual(Number(consumed.current_length_ft), 152.0, 'Remaining roll length must be exactly 152.0 ft')
    assert.strictEqual(consumed.status, 'in_use', 'Active roll status should be in_use')

    // Critical Bug Check: Ensure NO phantom ghost remnant was spawned in inventory_remnants
    const remnants = await InventoryRepository.getRemnants(companyId)
    assert.strictEqual(
      remnants.length,
      0,
      'Crucial Fix: Active continuous rolls must NOT spawn duplicate phantom remnant records in inventory_remnants'
    )

    // Now record explicit usable offcut remnant: width = 4ft, length = 6ft (24 SFT)
    const explicitRemnant = await InventoryRepository.createRemnant({
      company_id: companyId,
      material_id: materialId,
      source_roll_id: rollId,
      width_ft: 4.0,
      length_ft: 6.0,
      area_sqft: 24.0,
      status: 'usable',
      location_id: mainLocation.id,
      notes: 'Trimmed usable banner section',
    })

    assert.ok(explicitRemnant.id, 'Explicit remnant must be saved')
    assert.strictEqual(explicitRemnant.status, 'usable')
    assert.strictEqual(Number(explicitRemnant.width), 4.0)
    assert.strictEqual(Number(explicitRemnant.length), 6.0)

    const allRemnantsAfter = await InventoryRepository.getRemnants(companyId)
    assert.strictEqual(allRemnantsAfter.length, 1, 'Only the explicitly registered usable remnant exists')
  })

  test('3. Issue vs Actual Consumption Separation & Variance Scrap Resolution', async () => {
    const materialId = 'mat-pvc-foam'
    const material: MaterialRecord = {
      id: materialId,
      company_id: companyId,
      name: 'PVC Foam Board 5mm (4x8 ft)',
      sku: 'MAT-PVC-5MM',
      category: 'board',
      unit: 'sheet',
      is_roll: false,
      material_type: 'sheet',
      width: 4.0,
      length: 8.0,
      current_stock: 20,
      min_stock_level: 5,
      average_cost: 1200.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, material)

    // Step 1: Issue 5 Sheets to Production Floor for Job #JOB-202
    const issueResult = await InventoryService.issueMaterial({
      company_id: companyId,
      source_location_id: mainLocation.id,
      issued_by_name: 'Store Manager',
      items: [
        {
          material_id: materialId,
          issued_quantity: 5,
          unit: 'sheet',
          unit_cost: 1200.0,
        },
      ],
      notes: 'Issued 5 sheets for CNC lettering',
    })

    assert.ok(issueResult.id, 'Material Issue must be recorded')
    assert.strictEqual(issueResult.status, 'completed')

    // Stock on hand in store is now 15 (20 initial - 5 issued)
    const matAfterIssue = await InventoryRepository.getMaterialById(materialId, companyId)
    assert.strictEqual(Number(matAfterIssue?.current_stock), 15)

    // Step 2: Fabrication finishes: Actual consumed = 4 sheets. Variance = 1 sheet (Scrapped / Broken)
    // Record actual consumption of 4 sheets and 1 sheet scrap waste explicitly in ledger
    const consumptionResult = await InventoryService.logProductionConsumption({
      company_id: companyId,
      production_task_id: 'TASK-CNC-01',
      material_id: materialId,
      location_id: mainLocation.id,
      consumed_quantity: 4,
      unit: 'sheet',
      wastage_quantity: 1,
      wastage_reason: '1 sheet damaged during routing - resolved as scrap',
      actor_name: 'CNC Operator Ripon',
    })

    assert.strictEqual(consumptionResult.success, true)

    // Step 3: Verify Stock Ledger has complete traceable history
    const ledgerEntries = await InventoryRepository.getStockLedger(companyId, materialId)
    const transTypes = ledgerEntries.map((l) => l.transaction_type)

    assert.ok(transTypes.includes('ISSUE'), 'Ledger must trace ISSUE')
    assert.ok(transTypes.includes('CONSUMPTION'), 'Ledger must trace CONSUMPTION')
    assert.ok(transTypes.includes('WASTAGE'), 'Ledger must trace WASTAGE')
  })

  test('4. Full Mathematical Reconciliation Equation Test', async () => {
    // Equation:
    // Opening (10) + Received (5) + Returned (1) + Transfers In (0)
    // - Consumption (4) - Waste (1) - Transfers Out (0) ± Adjustments (-1)
    // = Current Stock (10)
    const materialId = 'mat-reconciliation-check'
    const material: MaterialRecord = {
      id: materialId,
      company_id: companyId,
      name: 'Acrylic Sheet 3mm Clear',
      sku: 'MAT-ACR-3MM',
      category: 'board',
      unit: 'sheet',
      is_roll: false,
      current_stock: 0,
      min_stock_level: 2,
      average_cost: 2500.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, material)

    // 1. Opening balance = 10 (ADJUSTMENT_IN)
    await InventoryRepository.recordStockAdjustment({
      company_id: companyId,
      material_id: materialId,
      location_id: mainLocation.id,
      quantity_change: 10,
      transaction_type: 'ADJUSTMENT_IN',
      notes: 'Opening stock count',
      performed_by_name: 'Auditor',
    })

    // 2. Received via GRN = +5
    await InventoryRepository.recordStockAdjustment({
      company_id: companyId,
      material_id: materialId,
      location_id: mainLocation.id,
      quantity_change: 5,
      transaction_type: 'PURCHASE_RECEIPT',
      notes: 'GRN from Supplier',
      performed_by_name: 'Receiver',
    })

    // 3. Return to Stock from floor = +1
    await InventoryRepository.recordStockAdjustment({
      company_id: companyId,
      material_id: materialId,
      location_id: mainLocation.id,
      quantity_change: 1,
      transaction_type: 'RETURN',
      notes: 'Unused sheet returned from floor',
      performed_by_name: 'Operator',
    })

    // 4. Production Consumption = -4
    await InventoryRepository.recordStockAdjustment({
      company_id: companyId,
      material_id: materialId,
      location_id: mainLocation.id,
      quantity_change: -4,
      transaction_type: 'CONSUMPTION',
      notes: 'Laser cut letters',
      performed_by_name: 'Laser Operator',
    })

    // 5. Explicit Waste / Scrap = -1
    await InventoryRepository.recordStockAdjustment({
      company_id: companyId,
      material_id: materialId,
      location_id: mainLocation.id,
      quantity_change: -1,
      transaction_type: 'WASTAGE',
      notes: 'Cracked sheet discarded',
      performed_by_name: 'QC Inspector',
    })

    // 6. Stock Count Adjustment = -1
    await InventoryRepository.recordStockAdjustment({
      company_id: companyId,
      material_id: materialId,
      location_id: mainLocation.id,
      quantity_change: -1,
      transaction_type: 'ADJUSTMENT_OUT',
      notes: 'Physical audit reconciliation delta',
      performed_by_name: 'Auditor',
    })

    // Fetch final stock
    const updatedMaterial = await InventoryRepository.getMaterialById(materialId, companyId)
    const expectedFinalStock = 10 + 5 + 1 - 4 - 1 - 1 // = 10

    assert.strictEqual(
      Number(updatedMaterial?.current_stock),
      expectedFinalStock,
      `Reconciliation must balance: Expected ${expectedFinalStock}, got ${updatedMaterial?.current_stock}`
    )

    // Verify Ledger records reflect all 6 transactions
    const ledger = await InventoryRepository.getStockLedger(companyId, materialId)
    assert.strictEqual(ledger.length, 6, 'All 6 transaction movements must be preserved in immutable stock ledger')
  })

  test('5. Stock Availability Engine distinguishes LOW_STOCK from INSUFFICIENT_FOR_ORDER', () => {
    // Material with 50 SFT on hand, reorder level is 100 SFT
    const material: MaterialRecord = {
      id: 'mat-banner-flex',
      company_id: companyId,
      name: 'PVC Flex Banner 380gsm',
      sku: 'MAT-FLEX-380',
      category: 'banner',
      unit: 'sft',
      is_roll: true,
      material_type: 'roll',
      available_widths_ft: [3.2, 5.0],
      standard_roll_length_ft: 164.0,
      current_stock: 50, // 50 SFT available
      min_stock_level: 50,
      reorder_level: 100, // Trigger threshold for LOW_STOCK
      average_cost: 15.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Physical Roll: 5.0 ft width x 10 ft length = 50 SFT
    const rolls: InventoryRollRecord[] = [
      {
        id: 'roll-flex-01',
        company_id: companyId,
        material_id: material.id,
        roll_code: 'ROLL-FLEX-001',
        roll_tag: 'TAG-FLEX-001',
        width_ft: 5.0,
        initial_length_ft: 10.0,
        current_length_ft: 10.0,
        initial_area_sft: 50.0,
        consumed_area_sft: 0,
        remaining_area_sft: 50.0,
        unit_cost: 750,
        status: 'available',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    // Scenario A: Job requires 20 SFT (4ft x 5ft). Stock is sufficient for order, but BELOW reorder level
    const evalA = evaluateStockAvailability({
      materialId: material.id,
      materials: [material],
      physicalRolls: rolls,
      customerWidthFt: 4.0,
      customerLengthFt: 5.0,
      quantity: 1,
    })

    assert.strictEqual(evalA.isAvailableForOrder, true, 'Stock should be available for 20 SFT job')
    assert.strictEqual(evalA.isLowStock, true, 'Must trigger LOW_STOCK warning because stock (50) < reorder_level (100)')
    assert.strictEqual(evalA.isShortage, false, 'Should NOT be short for this 20 SFT order')
    assert.strictEqual(evalA.status, 'LOW_STOCK')

    // Scenario B: Job requires 80 SFT (8ft x 10ft). Stock is 50 SFT
    const evalB = evaluateStockAvailability({
      materialId: material.id,
      materials: [material],
      physicalRolls: rolls,
      customerWidthFt: 8.0,
      customerLengthFt: 10.0,
      quantity: 1,
    })

    assert.strictEqual(evalB.isAvailableForOrder, false, 'Stock must be marked unavailable for 80 SFT job')
    assert.strictEqual(evalB.isShortage, true, 'Must trigger shortage flag')
    assert.ok(evalB.status === 'INSUFFICIENT_FOR_ORDER' || evalB.status === 'GEOMETRY_INCOMPATIBLE')

    // Scenario C: Width Incompatibility (Job requires 6.0 ft width, max available roll width is 5.0 ft)
    const evalC = evaluateStockAvailability({
      materialId: material.id,
      materials: [material],
      physicalRolls: rolls,
      customerWidthFt: 6.0,
      customerLengthFt: 5.0,
      quantity: 1,
    })

    assert.strictEqual(
      evalC.isAvailableForOrder,
      false,
      'Width incompatibility must prevent stock fulfillment even if total area arithmetic appears sufficient'
    )
    assert.strictEqual(evalC.isGeometryCompatible, false)
    assert.strictEqual(evalC.status, 'GEOMETRY_INCOMPATIBLE')
  })
})
