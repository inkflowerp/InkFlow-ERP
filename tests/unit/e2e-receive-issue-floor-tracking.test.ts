import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { getMaterialWarehouseStockBreakdown } from '../../lib/units.ts'
import type { MaterialRecord, InventoryLocationRecord, FloorConsumptionRecord } from '../../types/inventory.types'

/**
 * End-to-End Flow Test:
 *   Receive Stock → Available Stock → Issue to Floor → Available Stock → Factory Floor Consumption & Tracking
 *
 * Validates each stage:
 *   1. receiveStock() adds to current_stock and roll_sizes
 *   2. getMaterialWarehouseStockBreakdown() reflects correct available stock
 *   3. issueMaterial() (or issueMasterRollsBatch()) deducts from available stock, creates floor record
 *   4. Available stock reflects the deduction
 *   5. getFloorConsumptions() shows the on-floor material with correct balance
 */

test('E2E: Receive Stock → Available Stock → Issue to Floor → Available Stock → Floor Consumption Tracking', async (t) => {
  const companyId = `comp-e2e-${Date.now()}`

  const storeLocation: InventoryLocationRecord = {
    id: `loc-store-${Date.now()}`,
    company_id: companyId,
    location_code: 'WH-MAIN',
    location_name: 'Main Warehouse',
    location_type: 'raw_material_store',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const floorLocation: InventoryLocationRecord = {
    id: `loc-floor-${Date.now()}`,
    company_id: companyId,
    location_code: 'FL-MAIN',
    location_name: 'Production Floor',
    location_type: 'production_floor',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  PrintERPDataStore.addItem(STORAGE_KEYS.LOCATIONS, storeLocation, companyId)
  PrintERPDataStore.addItem(STORAGE_KEYS.LOCATIONS, floorLocation, companyId)

  // ============================================================
  // SCENARIO A: ROLL MEDIA (PVC Flex Banner) — full lifecycle
  // ============================================================
  await t.test('A. Roll Media — Receive 5 Rolls (5ft × 164ft), verify available, issue 1 Roll to floor, verify available again, verify floor tracking', async () => {
    const matId = `mat-flex-e2e-${Date.now()}`
    const flexMat: MaterialRecord = {
      id: matId,
      company_id: companyId,
      sku: 'MAT-FLEX-E2E',
      name: 'PVC Flex Banner (E2E Test)',
      category: 'roll_media',
      unit: 'sft',
      purchase_unit: 'roll',
      master_purchase_unit: 'roll',
      current_stock: 0,
      average_cost: 20, // ৳20/sft
      last_purchase_price: 20,
      is_roll: true,
      roll_width_ft: 5,
      standard_roll_length_ft: 164,
      roll_sizes: [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, flexMat, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, flexMat)

    // --- STEP 1: Receive 5 Rolls into Warehouse ---
    const receiveResult = await InventoryService.receiveStock({
      company_id: companyId,
      material_id: matId,
      location_id: storeLocation.id,
      quantity: 5, // 5 rolls
      unit_cost: 16400, // ৳16,400/roll (= ৳20/sft × 820 sft)
      purchase_unit: 'roll',
      width_ft: 5,
      length_ft: 164,
      performed_by_name: 'Store Keeper',
    })

    assert.ok(receiveResult.material, 'receiveStock should return material')
    assert.ok(receiveResult.ledgerEntry, 'receiveStock should return ledger entry')

    // --- STEP 2: Verify Available Stock ---
    const matAfterReceive = await InventoryRepository.getMaterialById(matId, companyId)
    assert.ok(matAfterReceive, 'Material should exist after receive')

    const expectedSft = 5 * 5 * 164 // 5 rolls × 5ft × 164ft = 4100 sft
    assert.strictEqual(matAfterReceive.current_stock, expectedSft, `current_stock should be ${expectedSft} sft after receiving 5 rolls`)

    const breakdownAfterReceive = getMaterialWarehouseStockBreakdown(matAfterReceive)
    assert.strictEqual(breakdownAfterReceive.is_roll, true, 'Should be classified as roll')
    assert.strictEqual(breakdownAfterReceive.purchase_unit, 'roll')
    assert.strictEqual(breakdownAfterReceive.consumption_unit, 'sft')

    // Verify roll_sizes updated with 5 rolls of 5ft
    const rollSizes = matAfterReceive.roll_sizes
    assert.ok(Array.isArray(rollSizes) && rollSizes.length > 0, 'roll_sizes should be populated after receive')
    const size5 = rollSizes.find((s: any) => Math.abs(Number(s.width_ft || s.width || s.nominal_width_ft || 0) - 5) < 0.1)
    assert.ok(size5, 'Should have a 5ft roll size entry')
    const size5Count = Number(size5.quantity ?? size5.roll_count ?? size5.stock ?? size5.stock_qty ?? 0)
    assert.strictEqual(size5Count, 5, 'Should show 5 rolls of 5ft width')

    // Verify breakdown shows 5 rolls
    assert.ok(breakdownAfterReceive.roll_items.length > 0, 'Breakdown should have roll items')
    const breakdownRolls = breakdownAfterReceive.roll_items.reduce((s, it) => s + (it.roll_count || 0), 0)
    assert.strictEqual(breakdownRolls, 5, 'Breakdown should show total 5 rolls')

    // --- STEP 3: Issue 1 Roll (820 sft) to Production Floor ---
    const issueResult = await InventoryService.issueMaterial({
      company_id: companyId,
      source_location_id: storeLocation.id,
      destination_location_id: floorLocation.id,
      issued_by_name: 'Store Manager',
      received_by_name: 'Rahim (Pressman)',
      notes: 'Machine: Roland TrueVIS | Job Ref: JOB-E2E-001',
      items: [
        {
          material_id: matId,
          issued_quantity: 820, // 1 Roll = 5ft × 164ft = 820 sft
          unit: 'sft',
          unit_cost: 20,
          width_ft: 5,
          length_ft: 164,
          purchase_quantity: 1,
        } as any,
      ],
    })

    assert.ok(issueResult.id, 'Issue record should be created')
    assert.strictEqual(issueResult.items.length, 1)
    assert.strictEqual(issueResult.items[0].issued_quantity, 820)
    assert.strictEqual(issueResult.items[0].remaining_floor_balance, 820)
    assert.strictEqual(issueResult.items[0].status, 'on_floor')

    // --- STEP 4: Verify Available Stock reduced ---
    const matAfterIssue = await InventoryRepository.getMaterialById(matId, companyId)
    assert.ok(matAfterIssue, 'Material should exist after issue')

    const expectedStockAfterIssue = expectedSft - 820 // 4100 - 820 = 3280 sft
    assert.strictEqual(matAfterIssue.current_stock, expectedStockAfterIssue, `current_stock should be ${expectedStockAfterIssue} after issuing 1 roll`)

    // Verify roll_sizes decremented: 5ft count should be 4 now
    const rollSizesAfterIssue = matAfterIssue.roll_sizes
    assert.ok(Array.isArray(rollSizesAfterIssue), 'roll_sizes should still exist after issue')
    const size5After = rollSizesAfterIssue.find((s: any) => Math.abs(Number(s.width_ft || s.width || s.nominal_width_ft || 0) - 5) < 0.1)
    assert.ok(size5After, 'Should still have 5ft entry in roll_sizes')
    const size5CountAfter = Number(size5After.quantity ?? size5After.roll_count ?? size5After.stock ?? size5After.stock_qty ?? 0)
    assert.strictEqual(size5CountAfter, 4, '5ft roll count should be decremented from 5 to 4')

    const breakdownAfterIssue = getMaterialWarehouseStockBreakdown(matAfterIssue)
    const breakdownRollsAfterIssue = breakdownAfterIssue.roll_items.reduce((s, it) => s + (it.roll_count || 0), 0)
    assert.strictEqual(breakdownRollsAfterIssue, 4, 'Breakdown should now show 4 rolls')

    // --- STEP 5: Verify Floor Consumption & Tracking ---
    const floorConsumptions = await InventoryRepository.getFloorConsumptions(companyId)
    const floorItem = floorConsumptions.find((f) => f.material_id === matId)
    assert.ok(floorItem, 'Issued material MUST appear in floor consumption tracking')
    assert.strictEqual(floorItem.issued_quantity, 820, 'Floor record should show 820 sft issued')
    assert.strictEqual(floorItem.remaining_floor_balance, 820, 'Floor record should show 820 sft remaining on floor')
    assert.strictEqual(floorItem.status, 'on_floor', 'Floor record status should be on_floor')
    assert.strictEqual(floorItem.consumed_quantity, 0, 'Floor record consumed should be 0 initially')
  })

  // ============================================================
  // SCENARIO B: DISCRETE PIECES (X-Stand) — full lifecycle
  // ============================================================
  await t.test('B. Discrete Pieces — Receive 50 X-Stands, verify available, issue 10 to floor via issueMasterRollsBatch, verify available, verify floor tracking', async () => {
    const matId = `mat-xstand-e2e-${Date.now()}`
    const xstandMat: MaterialRecord = {
      id: matId,
      company_id: companyId,
      sku: 'RP-XSTAND-E2E',
      name: 'X-Stand Banner Stand',
      category: 'hardware_accessories',
      unit: 'piece',
      purchase_unit: 'piece',
      master_purchase_unit: 'piece',
      current_stock: 0,
      average_cost: 350,
      last_purchase_price: 350,
      is_roll: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, xstandMat, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, xstandMat)

    // --- STEP 1: Receive 50 X-Stands ---
    const receiveResult = await InventoryService.receiveStock({
      company_id: companyId,
      material_id: matId,
      location_id: storeLocation.id,
      quantity: 50,
      unit_cost: 350,
      performed_by_name: 'Store Keeper',
    })

    assert.ok(receiveResult.material)

    // --- STEP 2: Verify Available Stock ---
    const matAfterReceive = await InventoryRepository.getMaterialById(matId, companyId)
    assert.ok(matAfterReceive)
    assert.strictEqual(matAfterReceive.current_stock, 50, 'Should have 50 X-Stands after receiving')

    // --- STEP 3: Issue 10 pieces to floor ---
    const issueRes = await InventoryRepository.issueMasterRollsBatch({
      company_id: companyId,
      material_id: matId,
      width_ft: 1,
      length_ft: 1,
      quantity_rolls: 10,
      destination: 'floor_staging',
      operator_name: 'Floor Lead',
      unit_cost: 350,
    })

    assert.ok(issueRes.roll, 'Issue should create a floor record')
    assert.strictEqual(issueRes.quantity_issued, 10, 'Should issue 10 pieces')
    assert.strictEqual(issueRes.total_area_sft, 10, 'total_area_sft should be 10 for discrete pieces')
    assert.strictEqual(issueRes.total_valuation, 10 * 350, 'Valuation should be 10 × ৳350')

    // --- STEP 4: Verify Available Stock reduced ---
    const matAfterIssue = await InventoryRepository.getMaterialById(matId, companyId)
    assert.ok(matAfterIssue)
    assert.strictEqual(matAfterIssue.current_stock, 40, 'Should have 40 X-Stands remaining after issuing 10')

    // --- STEP 5: Verify Floor Consumption Tracking ---
    const floorConsumptions = await InventoryRepository.getFloorConsumptions(companyId)
    const floorItem = floorConsumptions.find((f) => f.material_id === matId)
    assert.ok(floorItem, 'X-Stand must appear in floor consumption tracking after issue')
    assert.strictEqual(floorItem.issued_quantity, 10, 'Floor record should show 10 issued')
    assert.strictEqual(floorItem.remaining_floor_balance, 10, 'Floor record should show 10 remaining on floor')
    assert.strictEqual(floorItem.status, 'on_floor')
  })

  // ============================================================
  // SCENARIO C: ROLL MEDIA via issueMasterRollsBatch — full lifecycle
  // ============================================================
  await t.test('C. Roll Media via issueMasterRollsBatch — Receive, verify, issue, verify, check floor', async () => {
    const matId = `mat-vinyl-e2e-${Date.now()}`
    const vinylMat: MaterialRecord = {
      id: matId,
      company_id: companyId,
      sku: 'MAT-VINYL-E2E',
      name: 'SAV Sticker Vinyl (E2E)',
      category: 'roll_media',
      unit: 'sft',
      purchase_unit: 'roll',
      master_purchase_unit: 'roll',
      current_stock: 0,
      average_cost: 15,
      last_purchase_price: 15,
      is_roll: true,
      roll_width_ft: 4,
      standard_roll_length_ft: 164,
      roll_sizes: [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, vinylMat, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, vinylMat)

    // --- STEP 1: Receive 3 Rolls (4ft × 164ft) ---
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: matId,
      location_id: storeLocation.id,
      quantity: 3,
      unit_cost: 9840, // ৳9,840/roll (= ৳15/sft × 656 sft)
      purchase_unit: 'roll',
      width_ft: 4,
      length_ft: 164,
      performed_by_name: 'Store Keeper',
    })

    // --- STEP 2: Verify ---
    const matAfterReceive = await InventoryRepository.getMaterialById(matId, companyId)
    assert.ok(matAfterReceive)
    const expectedSft = 3 * 4 * 164 // 1968 sft
    assert.strictEqual(matAfterReceive.current_stock, expectedSft, `Should have ${expectedSft} sft after receiving 3 rolls`)

    // --- STEP 3: Issue 1 roll via issueMasterRollsBatch ---
    const issueRes = await InventoryService.issueMasterRollsBatch({
      company_id: companyId,
      material_id: matId,
      width_ft: 4,
      length_ft: 164,
      quantity_rolls: 1,
      destination: 'floor_staging',
      operator_name: 'Karim (Operator)',
      unit_cost: 15,
    })

    assert.ok(issueRes.roll, 'Roll should be created on floor')
    assert.strictEqual(issueRes.quantity_issued, 1)
    assert.strictEqual(issueRes.total_area_sft, 656) // 4 × 164 = 656 sft

    // --- STEP 4: Verify available stock ---
    const matAfterIssue = await InventoryRepository.getMaterialById(matId, companyId)
    assert.ok(matAfterIssue)
    const expectedAfterIssue = expectedSft - 656 // 1968 - 656 = 1312 sft
    assert.strictEqual(matAfterIssue.current_stock, expectedAfterIssue, `Should have ${expectedAfterIssue} sft remaining`)

    // Verify roll_sizes decremented
    const rollSizes = matAfterIssue.roll_sizes
    assert.ok(Array.isArray(rollSizes) && rollSizes.length > 0)
    const size4 = rollSizes.find((s: any) => Math.abs(Number(s.width_ft || s.width || s.nominal_width_ft || 0) - 4) < 0.1)
    assert.ok(size4)
    const size4Count = Number(size4.quantity ?? size4.roll_count ?? size4.stock ?? size4.stock_qty ?? 0)
    assert.strictEqual(size4Count, 2, 'Should have 2 rolls remaining in roll_sizes')

    // --- STEP 5: Verify Floor consumption ---
    const floorConsumptions = await InventoryRepository.getFloorConsumptions(companyId)
    const floorItem = floorConsumptions.find((f) => f.material_id === matId)
    assert.ok(floorItem, 'SAV Vinyl must appear in floor consumption tracking')
    assert.strictEqual(floorItem.issued_quantity, 656, 'Floor should show 656 sft issued')
    assert.strictEqual(floorItem.remaining_floor_balance, 656, 'Floor should show 656 sft remaining')
    assert.strictEqual(floorItem.status, 'on_floor')
  })

  // ============================================================
  // SCENARIO D: ACCESSORIES (Eyelets box → pcs) — full lifecycle
  // ============================================================
  await t.test('D. Accessories — Receive 5 boxes (1000 pcs/box = 5000 pcs), issue 1000 pcs, verify', async () => {
    const matId = `mat-eyelet-e2e-${Date.now()}`
    const eyeletMat: MaterialRecord = {
      id: matId,
      company_id: companyId,
      sku: 'MAT-EYELET-E2E',
      name: 'Brass Eyelets (E2E)',
      category: 'hardware_accessories',
      unit: 'pcs',
      purchase_unit: 'box',
      master_purchase_unit: 'box',
      current_stock: 0,
      average_cost: 0.5,
      last_purchase_price: 0.5,
      is_roll: false,
      material_config: { pack_quantity: 1000 } as any,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, eyeletMat, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, eyeletMat)

    // --- STEP 1: Receive 5000 pcs ---
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: matId,
      location_id: storeLocation.id,
      quantity: 5000,
      unit_cost: 0.5,
      performed_by_name: 'Store Keeper',
    })

    // --- STEP 2: Verify ---
    const matAfterReceive = await InventoryRepository.getMaterialById(matId, companyId)
    assert.ok(matAfterReceive)
    assert.strictEqual(matAfterReceive.current_stock, 5000)

    // --- STEP 3: Issue 1000 pcs ---
    const issueResult = await InventoryService.issueMaterial({
      company_id: companyId,
      source_location_id: storeLocation.id,
      destination_location_id: floorLocation.id,
      issued_by_name: 'Store Keeper',
      received_by_name: 'Finishing Lead',
      notes: 'For banner finishing',
      items: [{
        material_id: matId,
        issued_quantity: 1000,
        unit: 'pcs',
        unit_cost: 0.5,
      }],
    })

    assert.ok(issueResult.id)

    // --- STEP 4: Verify Stock ---
    const matAfterIssue = await InventoryRepository.getMaterialById(matId, companyId)
    assert.ok(matAfterIssue)
    assert.strictEqual(matAfterIssue.current_stock, 4000, 'Should have 4000 pcs remaining')

    // --- STEP 5: Floor Tracking ---
    const floorConsumptions = await InventoryRepository.getFloorConsumptions(companyId)
    const floorItem = floorConsumptions.find((f) => f.material_id === matId)
    assert.ok(floorItem, 'Eyelets must appear in floor consumption tracking')
    assert.strictEqual(floorItem.issued_quantity, 1000)
    assert.strictEqual(floorItem.remaining_floor_balance, 1000)
    assert.strictEqual(floorItem.status, 'on_floor')
  })

  // ============================================================
  // SCENARIO E: Log Consumption → Floor Balance Updates
  // ============================================================
  await t.test('E. Log Floor Consumption — consume 300 pcs from 1000 issued, verify floor balance updates to 700', async () => {
    const matId = `mat-bolt-e2e-${Date.now()}`
    const boltMat: MaterialRecord = {
      id: matId,
      company_id: companyId,
      sku: 'MAT-BOLT-E2E',
      name: 'Mounting Bolts (E2E)',
      category: 'hardware_accessories',
      unit: 'pcs',
      purchase_unit: 'pcs',
      current_stock: 0,
      average_cost: 5,
      last_purchase_price: 5,
      is_roll: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, boltMat, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, boltMat)

    // Receive 500
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: matId,
      location_id: storeLocation.id,
      quantity: 500,
      unit_cost: 5,
      performed_by_name: 'Store Keeper',
    })

    // Issue 200 to floor
    const issueResult = await InventoryService.issueMaterial({
      company_id: companyId,
      source_location_id: storeLocation.id,
      destination_location_id: floorLocation.id,
      issued_by_name: 'Store Keeper',
      received_by_name: 'Floor Worker',
      items: [{ material_id: matId, issued_quantity: 200, unit: 'pcs', unit_cost: 5 }],
    })

    assert.ok(issueResult.id)

    // Verify stock deducted
    const matAfterIssue = await InventoryRepository.getMaterialById(matId, companyId)
    assert.ok(matAfterIssue)
    assert.strictEqual(matAfterIssue.current_stock, 300, 'Warehouse should have 300 after issuing 200')

    // Log consumption of 80 pcs with 20 wastage
    const consumeResult = await InventoryRepository.logFloorConsumption({
      company_id: companyId,
      issue_id: issueResult.id,
      material_id: matId,
      consumed_quantity: 80,
      unit: 'pcs',
      wastage_quantity: 20,
      wastage_reason: 'Defective batch',
      machine_name: 'Assembly Line',
      operator_name: 'Karim',
    })

    assert.ok(consumeResult.success)
    assert.strictEqual(consumeResult.floorRecord.consumed_quantity, 80)
    assert.strictEqual(consumeResult.floorRecord.wastage_quantity, 20)
    assert.strictEqual(consumeResult.floorRecord.remaining_floor_balance, 100, '200 - 80 - 20 = 100 remaining')
    assert.strictEqual(consumeResult.floorRecord.status, 'partially_consumed')

    // Verify getFloorConsumptions reflects the updated balance
    const floorItems = await InventoryRepository.getFloorConsumptions(companyId)
    const floorRecord = floorItems.find((f) => f.material_id === matId && f.issue_id === issueResult.id)
    assert.ok(floorRecord, 'Floor record should exist')
    assert.strictEqual(floorRecord.remaining_floor_balance, 100, 'Floor balance should be 100 after consuming 80 + 20 wastage')
    assert.strictEqual(floorRecord.status, 'partially_consumed')
  })

  // ============================================================
  // SCENARIO F: Return Floor Stock → Warehouse Stock Restored
  // ============================================================
  await t.test('F. Return Floor Stock to Warehouse — return 50 unused pcs, verify warehouse stock increases', async () => {
    const matId = `mat-washer-e2e-${Date.now()}`
    const washerMat: MaterialRecord = {
      id: matId,
      company_id: companyId,
      sku: 'MAT-WASHER-E2E',
      name: 'Steel Washers (E2E)',
      category: 'hardware_accessories',
      unit: 'pcs',
      purchase_unit: 'pcs',
      current_stock: 0,
      average_cost: 2,
      last_purchase_price: 2,
      is_roll: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, washerMat, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, washerMat)

    // Receive 300
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: matId,
      location_id: storeLocation.id,
      quantity: 300,
      unit_cost: 2,
      performed_by_name: 'Store Keeper',
    })

    // Issue 100 to floor
    const issueResult = await InventoryService.issueMaterial({
      company_id: companyId,
      source_location_id: storeLocation.id,
      destination_location_id: floorLocation.id,
      issued_by_name: 'Store Keeper',
      received_by_name: 'Floor Worker',
      items: [{ material_id: matId, issued_quantity: 100, unit: 'pcs', unit_cost: 2 }],
    })

    assert.ok(issueResult.id)

    // Warehouse should be at 200
    const matAfterIssue = await InventoryRepository.getMaterialById(matId, companyId)
    assert.strictEqual(matAfterIssue!.current_stock, 200)

    // Return 50 unused pcs back to warehouse
    const returnResult = await InventoryRepository.returnFloorStockToStore({
      company_id: companyId,
      issue_id: issueResult.id,
      material_id: matId,
      quantity: 50,
      return_location_id: storeLocation.id,
      operator_name: 'Floor Worker',
      notes: 'Job completed, leftover returned',
    })

    assert.ok(returnResult.success)
    assert.strictEqual(returnResult.remainingFloorBalance, 50, 'Floor should have 50 remaining after returning 50')
    assert.strictEqual(returnResult.floorRecord.returned_quantity, 50)

    // Verify warehouse stock increased back
    const matAfterReturn = await InventoryRepository.getMaterialById(matId, companyId)
    assert.ok(matAfterReturn)
    assert.strictEqual(matAfterReturn.current_stock, 250, 'Warehouse stock should be 200 + 50 returned = 250')

    // Verify floor tracking shows reduced balance
    const floorItems = await InventoryRepository.getFloorConsumptions(companyId)
    const floorRecord = floorItems.find((f) => f.material_id === matId && f.issue_id === issueResult.id)
    assert.ok(floorRecord, 'Floor record should exist')
    assert.strictEqual(floorRecord.remaining_floor_balance, 50, 'Floor balance should show 50 remaining')
  })
})

