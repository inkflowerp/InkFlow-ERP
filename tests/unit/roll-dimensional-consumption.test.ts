import test from 'node:test'
import assert from 'node:assert/strict'
import { RollConsumptionEngine } from '../../lib/domain/roll-consumption-engine.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

test('Roll Dimensional Consumption Engine - User Specific Scenarios', async (t) => {
  const companyId = 'tenant-test-roll-corp'

  // Reset datastore for clean tests
  PrintERPDataStore.set(STORAGE_KEYS.MOUNTED_ROLLS, [], true, companyId)
  PrintERPDataStore.set(STORAGE_KEYS.STOCK_LEDGER, [], true, companyId)
  PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [
    {
      id: 'mat-pvc-banner',
      company_id: companyId,
      sku: 'PVC-BAN-100',
      name: 'Heavy Duty PVC Banner Substrate',
      unit: 'sft',
      current_stock: 5000,
      unit_cost: 15,
      average_cost: 15,
    },
  ], true, companyId)

  await t.test('Scenario 1: 3ft width roll -> print size 3x5 (1 Pcs) -> deduct 5ft + 3in bleed -> 158.75ft left', async () => {
    // 1. Issue a brand new 3ft x 164ft roll
    const roll3ft = await InventoryRepository.createPhysicalRoll({
      company_id: companyId,
      material_id: 'mat-pvc-banner',
      roll_code: 'ROL-PVC-3FT-001',
      width_ft: 3,
      initial_length_ft: 164,
      unit_cost: 15,
    })

    assert.equal(roll3ft.width_ft, 3)
    assert.equal(roll3ft.current_length_ft, 164)
    assert.equal(roll3ft.initial_area_sft, 492)

    // 2. Calculate linear feed: Job 3ft x 5ft, Qty 1, Bleed 3 inches (0.25 ft), Normal orientation
    const calc = RollConsumptionEngine.calculateRollLinearFeed({
      roll_width_ft: roll3ft.width_ft,
      roll_current_length_ft: roll3ft.current_length_ft,
      job_width_ft: 3,
      job_length_ft: 5,
      quantity: 1,
      orientation: 'normal',
      bleed_allowance_in: 3,
    })

    assert.equal(calc.is_fit_across_width, true)
    assert.equal(calc.linear_feed_per_unit_ft, 5)
    assert.equal(calc.linear_feed_ft, 5)
    assert.equal(calc.bleed_allowance_ft, 0.25)
    assert.equal(calc.total_linear_deduction_ft, 5.25)
    assert.equal(calc.new_remaining_length_ft, 158.75)
    assert.equal(calc.is_shortage, false)

    // 3. Execute consumption in repository
    const result = await InventoryRepository.consumeFromPhysicalRoll({
      company_id: companyId,
      roll_id: roll3ft.id,
      linear_length_consumed_ft: calc.linear_feed_ft,
      bleed_allowance_ft: calc.bleed_allowance_ft,
      operator_name: 'Shamim Press Operator',
      notes: 'Job 3x5 Banner Run',
    })

    assert.equal(result.totalDeductedFt, 5.25)
    assert.equal(result.roll.current_length_ft, 158.75)
    assert.equal(result.roll.remaining_area_sft, 158.75 * 3) // 476.25 SFT
  })

  await t.test('Scenario 2: 5ft width roll -> print size 3x5 (1 Pcs) rotated -> deduct 3ft + 3in bleed -> 160.75ft left', async () => {
    // 1. Issue a brand new 5ft x 164ft roll
    const roll5ft = await InventoryRepository.createPhysicalRoll({
      company_id: companyId,
      material_id: 'mat-pvc-banner',
      roll_code: 'ROL-PVC-5FT-001',
      width_ft: 5,
      initial_length_ft: 164,
      unit_cost: 15,
    })

    assert.equal(roll5ft.width_ft, 5)
    assert.equal(roll5ft.current_length_ft, 164)
    assert.equal(roll5ft.initial_area_sft, 820)

    // 2. Calculate linear feed: Job 3ft x 5ft, Qty 1, Bleed 3 inches (0.25 ft), Rotated orientation
    const calc = RollConsumptionEngine.calculateRollLinearFeed({
      roll_width_ft: roll5ft.width_ft,
      roll_current_length_ft: roll5ft.current_length_ft,
      job_width_ft: 3,
      job_length_ft: 5,
      quantity: 1,
      orientation: 'rotated', // 5ft aligns with 5ft roll width -> feed is 3ft
      bleed_allowance_in: 3,
    })

    assert.equal(calc.is_fit_across_width, true)
    assert.equal(calc.linear_feed_per_unit_ft, 3)
    assert.equal(calc.linear_feed_ft, 3)
    assert.equal(calc.bleed_allowance_ft, 0.25)
    assert.equal(calc.total_linear_deduction_ft, 3.25)
    assert.equal(calc.new_remaining_length_ft, 160.75)
    assert.equal(calc.is_shortage, false)

    // 3. Execute consumption in repository
    const result = await InventoryRepository.consumeFromPhysicalRoll({
      company_id: companyId,
      roll_id: roll5ft.id,
      linear_length_consumed_ft: calc.linear_feed_ft,
      bleed_allowance_ft: calc.bleed_allowance_ft,
      operator_name: 'Shamim Press Operator',
      notes: 'Job 3x5 Rotated Run',
    })

    assert.equal(result.totalDeductedFt, 3.25)
    assert.equal(result.roll.current_length_ft, 160.75)
    assert.equal(result.roll.remaining_area_sft, 160.75 * 5) // 803.75 SFT
  })

  await t.test('Scenario 3: Wastage scrap field with reason in print job modal', async () => {
    const roll3ft = await InventoryRepository.createPhysicalRoll({
      company_id: companyId,
      material_id: 'mat-pvc-banner',
      roll_code: 'ROL-PVC-3FT-WST',
      width_ft: 3,
      initial_length_ft: 100,
      unit_cost: 15,
    })

    // Operator logs 5ft good run + 3in bleed (0.25ft) + 2.5ft scrap wastage due to head banding
    const calc = RollConsumptionEngine.calculateRollLinearFeed({
      roll_width_ft: roll3ft.width_ft,
      roll_current_length_ft: 100,
      job_width_ft: 3,
      job_length_ft: 5,
      quantity: 1,
      orientation: 'normal',
      bleed_allowance_in: 3,
      wastage_length_ft: 2.5,
      wastage_reason: 'banding',
    })

    assert.equal(calc.linear_feed_ft, 5)
    assert.equal(calc.bleed_allowance_ft, 0.25)
    assert.equal(calc.wastage_length_ft, 2.5)
    assert.equal(calc.total_linear_deduction_ft, 7.75)
    assert.equal(calc.new_remaining_length_ft, 92.25)

    const result = await InventoryRepository.consumeFromPhysicalRoll({
      company_id: companyId,
      roll_id: roll3ft.id,
      linear_length_consumed_ft: calc.linear_feed_ft,
      bleed_allowance_ft: calc.bleed_allowance_ft,
      wastage_length_ft: calc.wastage_length_ft,
      wastage_reason: 'banding',
      operator_name: 'Shamim Operator',
    })

    assert.equal(result.totalDeductedFt, 7.75)
    assert.equal(result.roll.current_length_ft, 92.25)

    // Check stock ledger contains both CONSUMPTION and WASTAGE entries
    const ledger = await InventoryRepository.getStockLedger(companyId, 'mat-pvc-banner')
    const wastageEntries = ledger.filter((l) => l.transaction_type === 'WASTAGE')
    assert.ok(wastageEntries.length > 0, 'Should have recorded a WASTAGE ledger entry')
  })

  await t.test('Scenario 4: Shortage detection -> Job 3x20ft with 18ft roll available -> Request new 3ft roll -> Both rolls exist on floor (18ft & 143.75ft)', async () => {
    // 1. Floor currently has an existing Roll A with only 18ft remaining
    const rollA = await InventoryRepository.createPhysicalRoll({
      company_id: companyId,
      material_id: 'mat-pvc-banner',
      roll_code: 'ROL-PVC-3FT-ROLL-A',
      width_ft: 3,
      initial_length_ft: 18,
      unit_cost: 15,
    })

    assert.equal(rollA.current_length_ft, 18)

    // 2. Job 3ft x 20ft -> requires 20ft + 0.25ft (3" bleed) = 20.25ft
    const calc = RollConsumptionEngine.calculateRollLinearFeed({
      roll_width_ft: rollA.width_ft,
      roll_current_length_ft: rollA.current_length_ft,
      job_width_ft: 3,
      job_length_ft: 20,
      quantity: 1,
      orientation: 'normal',
      bleed_allowance_in: 3,
    })

    // Shortage detected on Roll A!
    assert.equal(calc.is_shortage, true)
    assert.equal(calc.total_linear_deduction_ft, 20.25)
    assert.equal(calc.shortage_amount_ft, 2.25)

    // 3. Operator requests new 3ft roll issued to floor (Roll B: 164ft)
    const rollB = await InventoryRepository.requestAndIssueNewRollToFloor({
      company_id: companyId,
      material_id: 'mat-pvc-banner',
      width_ft: 3,
      length_ft: 164,
      machine_name: 'Roland Eco-Solvent',
      operator_name: 'Shamim Operator',
    })

    assert.equal(rollB.width_ft, 3)
    assert.equal(rollB.current_length_ft, 164)

    // 4. Job is executed on Roll B (20ft + 0.25ft bleed = 20.25ft deduction)
    const calcB = RollConsumptionEngine.calculateRollLinearFeed({
      roll_width_ft: rollB.width_ft,
      roll_current_length_ft: rollB.current_length_ft,
      job_width_ft: 3,
      job_length_ft: 20,
      quantity: 1,
      orientation: 'normal',
      bleed_allowance_in: 3,
    })

    assert.equal(calcB.is_shortage, false)
    assert.equal(calcB.new_remaining_length_ft, 143.75)

    const consumeResult = await InventoryRepository.consumeFromPhysicalRoll({
      company_id: companyId,
      roll_id: rollB.id,
      linear_length_consumed_ft: calcB.linear_feed_ft,
      bleed_allowance_ft: calcB.bleed_allowance_ft,
      operator_name: 'Shamim Operator',
    })

    assert.equal(consumeResult.roll.current_length_ft, 143.75)

    // 5. Verify Print Floor now has both rolls available independently:
    // Roll A: 3ft x 18ft (1 Pcs)
    // Roll B: 3ft x 143.75ft (1 Pcs)
    const floorRolls = await InventoryRepository.getInventoryRolls(companyId)
    const foundRollA = floorRolls.find((r) => r.id === rollA.id)
    const foundRollB = floorRolls.find((r) => r.id === rollB.id)

    assert.ok(foundRollA, 'Roll A must be in inventory')
    assert.ok(foundRollB, 'Roll B must be in inventory')
    assert.equal(foundRollA?.current_length_ft, 18, 'Roll A must still have 18ft intact')
    assert.equal(foundRollB?.current_length_ft, 143.75, 'Roll B must have 143.75ft left')
  })

  await t.test('Scenario 5: Multi-roll batch issuance (2 rolls of 5ft x 164ft) with store deduction and sequential roll tags', async () => {
    const storeMatBefore = await InventoryRepository.getMaterialById('mat-pvc-banner', companyId)
    const stockBefore = Number(storeMatBefore?.current_stock || 0)

    // Issue batch: 2 rolls of 5ft x 164ft = 820 SFT x 2 = 1,640 SFT total
    const batchResult = await InventoryRepository.issueMasterRollsBatch({
      company_id: companyId,
      material_id: 'mat-pvc-banner',
      width_ft: 5,
      length_ft: 164,
      quantity_rolls: 2,
      lot_number: 'BATCH-2026',
      machine_name: 'Mimaki UV Flatbed 2513',
      operator_name: 'Lead Print Tech',
    })

    assert.equal(batchResult.quantity_issued, 2)
    assert.equal(batchResult.total_area_sft, 1640)
    assert.equal(batchResult.rolls.length, 2)

    const roll1 = batchResult.rolls[0]
    const roll2 = batchResult.rolls[1]

    assert.match(roll1.roll_code || roll1.roll_tag, /-01$/)
    assert.match(roll2.roll_code || roll2.roll_tag, /-02$/)
    assert.equal(roll1.width_ft, 5)
    assert.equal(roll2.width_ft, 5)
    assert.equal(roll1.current_length_ft, 164)
    assert.equal(roll2.current_length_ft, 164)

    // Verify stock ledger entry deducted 1,640 SFT from raw materials store
    const storeMatAfter = await InventoryRepository.getMaterialById('mat-pvc-banner', companyId)
    assert.equal(Number(storeMatAfter?.current_stock), stockBefore - 1640)
  })
})

