import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { MaterialRecord, InventoryLocationRecord } from '../../types/inventory.types.ts'

describe('Material Requisition & Factory Floor Consumption Workflow Tests', () => {
  const companyId = `comp-req-test-${Date.now()}`

  const mockLocation: InventoryLocationRecord = {
    id: `loc-main-${Date.now()}`,
    company_id: companyId,
    location_name: 'Central Raw Material Store',
    location_code: 'MAIN-STORE',
    location_type: 'raw_material_store',
    is_active: true,
    created_at: new Date().toISOString(),
  }

  const mockMat: MaterialRecord = {
    id: `mat-pvc-${Date.now()}`,
    company_id: companyId,
    sku: 'PVC-STAR-10',
    name: 'Star PVC Banner 10oz',
    category: 'roll_media',
    unit: 'sft',
    purchase_unit: 'roll',
    conversion_factor: 369,
    current_stock: 3690, // 10 rolls of 2.25ft x 164ft = 3690 SFT
    average_cost: 7.58,
    last_purchase_price: 2798,
    is_roll: true,
    roll_width_ft: 2.25,
    standard_roll_length_ft: 164,
    production_width_allowance: 0.25,
    roll_sizes: [
      {
        key: 'size-2.25',
        width_ft: 2.25,
        length_ft: 164,
        allowance_ft: 0.25,
        purchase_price: 2798,
        roll_count: 10,
        total_sft: 3690,
      },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  test('1. Material received into warehouse store does NOT appear in Factory Floor Consumption', async () => {
    // Save location and material to store warehouse
    PrintERPDataStore.addItem(STORAGE_KEYS.LOCATIONS, mockLocation, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, mockMat, companyId)

    // Also register 10 available warehouse rolls in physical_rolls (stored in warehouse, not issued)
    for (let i = 1; i <= 10; i++) {
      PrintERPDataStore.addItem(
        STORAGE_KEYS.MOUNTED_ROLLS,
        {
          id: `roll-wh-${mockMat.id}-${i}`,
          company_id: companyId,
          material_id: mockMat.id,
          roll_code: `ROL-STAR-${i}`,
          roll_tag: `ROL-STAR-${i}`,
          width_ft: 2.25,
          initial_length_ft: 164,
          current_length_ft: 164,
          initial_area_sft: 369,
          remaining_area_sft: 369,
          consumed_area_sft: 0,
          status: 'available', // available in warehouse store
          location_name: 'Main Store Warehouse',
          mounted_machine_id: null,
          unit_cost: 7.58,
          total_cost: 2798,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        companyId
      )
    }

    // Check Factory Floor Consumptions
    const floorConsumptions = await InventoryRepository.getFloorConsumptions(companyId)
    assert.strictEqual(floorConsumptions.length, 0, 'Floor consumption should have 0 records for un-issued warehouse stock')

    // Check floor-filtered rolls
    const allRolls = await InventoryRepository.getInventoryRolls(companyId, undefined, [mockMat])
    const activeFloorRolls = allRolls.filter(
      (r) =>
        r.status === 'mounted' ||
        r.status === 'in_use' ||
        r.status === 'on_floor' ||
        r.location_name === 'Print Floor' ||
        Boolean(r.mounted_machine_id)
    )
    assert.strictEqual(activeFloorRolls.length, 0, 'No un-issued warehouse rolls should be counted as active floor rolls')
  })

  test('2. Printing Operator creates Material Request -> Warehouse stock remains intact & 0 floor items', async () => {
    const request = await InventoryRepository.createRequest({
      company_id: companyId,
      source_location_id: mockLocation.id,
      requested_by_id: 'op-1',
      requested_by_name: 'Printing Operator Shakil',
      priority: 'high',
      notes: 'Need 2 rolls of 2.25ft Star PVC for Billboard Order #JOB-102',
      items: [
        {
          material_id: mockMat.id,
          requested_quantity: 2,
          unit: 'roll',
        },
      ],
    })

    assert.ok(request.id, 'Material request should be created with an ID')
    assert.strictEqual(request.status, 'requested', 'Status should be requested')

    // Verify warehouse stock is unchanged
    const matBefore = await InventoryRepository.getMaterialById(mockMat.id, companyId)
    assert.strictEqual(matBefore?.current_stock, 3690, 'Warehouse stock should remain 3690 SFT until issued')

    // Verify floor consumption still has 0 items
    const floorConsumptions = await InventoryRepository.getFloorConsumptions(companyId)
    assert.strictEqual(floorConsumptions.length, 0, 'Floor consumption should still be 0 before request acceptance')
  })

  test('3. Inventory & Warehouse Operations accepts & issues request -> Reduces warehouse stock & moves to Factory Floor', async () => {
    const requests = await InventoryRepository.getRequests(companyId)
    const pendingReq = requests.find((r) => r.status === 'requested')
    assert.ok(pendingReq, 'Should find pending request')

    // Warehouse manager accepts & issues 2 rolls of 2.25ft PVC against this request
    const issueResult = await InventoryRepository.issueMasterRollsBatch({
      company_id: companyId,
      material_id: mockMat.id,
      width_ft: 2.25,
      length_ft: 164,
      quantity_rolls: 2,
      destination: 'machine',
      machine_id: 'roland',
      machine_name: 'Roland Eco-Solvent (64")',
      operator_name: 'Floor Operator Shakil',
      request_id: pendingReq.id,
      notes: `Issued against Requisition ${pendingReq.request_number}`,
      unit_cost: 7.58,
    })

    assert.ok(issueResult.roll, 'Should return primary issued roll')
    assert.strictEqual(issueResult.quantity_issued, 2, 'Should issue 2 rolls')
    assert.strictEqual(issueResult.total_area_sft, 738, 'Should issue 738 SFT (2 * 369)')

    // 1. Verify request status transitioned to fulfilled
    const updatedReq = await InventoryRepository.getRequestById(pendingReq.id, companyId)
    assert.strictEqual(updatedReq?.status, 'fulfilled', 'Request should be marked fulfilled')

    // 2. Verify material stock reduced in warehouse
    const matAfter = await InventoryRepository.getMaterialById(mockMat.id, companyId)
    assert.strictEqual(matAfter?.current_stock, 2952, 'Stock should be reduced from 3690 to 2952 SFT (3690 - 738)')
    const sizeConfig = matAfter?.roll_sizes?.[0]
    assert.strictEqual(sizeConfig?.roll_count, 8, 'Configured roll count should be reduced from 10 to 8')

    // 3. Verify stock ledger recorded ISSUE transaction
    const ledger = await InventoryRepository.getStockLedger(companyId)
    const issueEntry = ledger.find((l) => l.transaction_type === 'ISSUE' && l.material_id === mockMat.id)
    assert.ok(issueEntry, 'Stock ledger should have an ISSUE entry')
    assert.strictEqual(issueEntry.quantity_change, -738, 'Stock ledger quantity change should be -738')

    // 4. Verify Factory Floor Consumption now has the issued material
    const floorConsumptions = await InventoryRepository.getFloorConsumptions(companyId)
    assert.ok(floorConsumptions.length > 0, 'Floor consumption should now display the issued material')
    const floorItem = floorConsumptions.find((fc) => fc.material_id === mockMat.id)
    assert.ok(floorItem, 'Floor consumption item must exist for the issued material')
    assert.strictEqual(floorItem?.machine_name, 'Roland Eco-Solvent (64")', 'Machine name should match')
    assert.strictEqual(floorItem?.remaining_floor_balance, 369, 'Floor balance should be tracked on floor')
  })

  test('4. Direct Issue from Inventory & Warehouse Operations immediately dispatches to Factory Floor', async () => {
    // Direct issue of 1 roll (369 SFT) to Floor Staging
    const directResult = await InventoryRepository.issueMasterRollsBatch({
      company_id: companyId,
      material_id: mockMat.id,
      width_ft: 2.25,
      length_ft: 164,
      quantity_rolls: 1,
      destination: 'floor_staging',
      operator_name: 'Store Keeper Mizan',
      notes: 'Direct Floor Buffer Issue',
      unit_cost: 7.58,
    })

    assert.strictEqual(directResult.quantity_issued, 1, 'Should issue 1 roll')
    assert.strictEqual(directResult.total_area_sft, 369, 'Should issue 369 SFT')

    // Verify warehouse stock decreased by another 369 SFT
    const matAfterDirect = await InventoryRepository.getMaterialById(mockMat.id, companyId)
    assert.strictEqual(matAfterDirect?.current_stock, 2583, 'Warehouse stock should be 2952 - 369 = 2583 SFT (7 rolls)')
    assert.strictEqual(matAfterDirect?.roll_sizes?.[0]?.roll_count, 7, 'Roll count should be 7')

    // Verify Factory Floor has the direct issue roll with status on_floor and location_name Print Floor
    const allRolls = await InventoryRepository.getInventoryRolls(companyId, undefined, [mockMat])
    const floorRolls = allRolls.filter(
      (r) =>
        r.status === 'mounted' ||
        r.status === 'in_use' ||
        r.status === 'on_floor' ||
        r.location_name === 'Print Floor' ||
        Boolean(r.mounted_machine_id)
    )
    assert.ok(floorRolls.length >= 2, 'Should have both the mounted roll and staging roll on floor')
  })
})
