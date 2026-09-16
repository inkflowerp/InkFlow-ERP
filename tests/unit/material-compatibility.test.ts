import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  evaluateMaterialCompatibility,
  checkRemnantFit,
} from '../../lib/domain/material-compatibility.ts'
import { calculateProductionDimensions } from '../../lib/domain/production-geometry.ts'
import type { InventoryRollRecord, InventoryRemnantRecord } from '../../types/inventory.types.ts'

describe('Material Compatibility Engine', () => {
  test('identifies compatible roll widths for 4ft x 12ft customer UV Vinyl (4ft 2in production width)', () => {
    const geometry = calculateProductionDimensions(4, 12, {
      dimension_unit: 'ft',
      allowance_per_side_in: 1.0,
    })

    // Available Vinyl rolls: 3ft, 4ft, 5ft
    const availableWidths = [3, 4, 5]

    const evalResult = evaluateMaterialCompatibility({
      required_material_name: 'Vinyl Sticker',
      geometry,
      available_roll_widths_ft: availableWidths,
      standard_roll_length_ft: 164,
    })

    assert.strictEqual(evalResult.is_compatible, true)
    assert.strictEqual(evalResult.selected_roll_width_ft, 5) // 4ft 2in exceeds 4ft, so must fit on 5ft roll
    assert.strictEqual(evalResult.warning_message, undefined)
    assert.ok(Math.abs((evalResult.waste_strip_width_in || 0) - 10) < 0.5) // 5ft (60in) - 4ft 2in (50in) = 10 inches offcut strip
  })

  test('CRITICAL: Rejects 6ft customer PVC Banner when available rolls are only 3.25ft, 4.25ft, 5.25ft', () => {
    const geometry = calculateProductionDimensions(6, 10, {
      dimension_unit: 'ft',
      allowance_per_side_in: 1.0,
    })

    // 6ft + 2in = 6ft 2in production width
    const availablePvcWidths = [3.25, 4.25, 5.25]

    const evalResult = evaluateMaterialCompatibility({
      required_material_name: 'PVC',
      geometry,
      available_roll_widths_ft: availablePvcWidths,
      standard_roll_length_ft: 164,
    })

    assert.strictEqual(evalResult.is_compatible, false)
    assert.strictEqual(evalResult.selected_roll_width_ft, null)
    assert.strictEqual(evalResult.error_code, 'NO_COMPATIBLE_WIDTH')
    assert.ok(evalResult.warning_message?.includes('No compatible PVC material width configured'))
    assert.ok(evalResult.warning_message?.includes('6ft 2in'))
  })

  test('selects the tightest fitting compatible roll width to minimize trim scrap', () => {
    const geometry = calculateProductionDimensions(3, 10, {
      dimension_unit: 'ft',
      allowance_per_side_in: 1.0,
    })
    // 3ft + 2in = 3ft 2in (38 inches)
    // Available rolls: 3.25ft (39 inches), 4.25ft (51 inches), 5.25ft (63 inches)
    const availablePvcWidths = [3.25, 4.25, 5.25]

    const evalResult = evaluateMaterialCompatibility({
      required_material_name: 'PVC',
      geometry,
      available_roll_widths_ft: availablePvcWidths,
    })

    assert.strictEqual(evalResult.is_compatible, true)
    assert.strictEqual(evalResult.selected_roll_width_ft, 3.25) // 3.25ft (39 in) fits 38 in with only 1 in scrap!
  })

  test('checks active physical roll inventory for available linear length', () => {
    const geometry = calculateProductionDimensions(4, 12, {
      dimension_unit: 'ft',
      allowance_per_side_in: 1.0,
    })

    const physicalRolls: InventoryRollRecord[] = [
      {
        id: 'roll-1',
        company_id: 'c-01',
        material_id: 'mat-vinyl',
        roll_code: 'ROLL-VINYL-001',
        roll_tag: 'ROLL-VINYL-001',
        width_ft: 5,
        initial_length_ft: 164,
        current_length_ft: 10, // Only 10ft left! Need 12ft 2in
        initial_area_sft: 820,
        consumed_area_sft: 770,
        remaining_area_sft: 50,
        status: 'available',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'roll-2',
        company_id: 'c-01',
        material_id: 'mat-vinyl',
        roll_code: 'ROLL-VINYL-002',
        roll_tag: 'ROLL-VINYL-002',
        width_ft: 5,
        initial_length_ft: 164,
        current_length_ft: 150, // 150ft left, plenty!
        initial_area_sft: 820,
        consumed_area_sft: 70,
        remaining_area_sft: 750,
        status: 'available',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const evalResult = evaluateMaterialCompatibility({
      required_material_name: 'Vinyl Sticker',
      geometry,
      available_roll_widths_ft: [3, 4, 5],
      active_physical_rolls: physicalRolls,
    })

    assert.strictEqual(evalResult.is_compatible, true)
    assert.strictEqual(evalResult.compatible_physical_rolls?.length, 1)
    assert.strictEqual(evalResult.compatible_physical_rolls?.[0].roll_code, 'ROLL-VINYL-002')
  })

  test('checks remnant geometry compatibility with rotation support', () => {
    // Required: 3ft 2in x 8ft
    const remnant1: Partial<InventoryRemnantRecord> = {
      id: 'rem-1',
      width: 4,
      length: 10,
      status: 'available',
    }
    const remnant2: Partial<InventoryRemnantRecord> = {
      id: 'rem-2',
      width: 3,
      length: 20, // Width 3ft is too narrow for 3ft 2in piece
      status: 'available',
    }

    assert.strictEqual(checkRemnantFit(remnant1 as any, 3 + 2 / 12, 8).is_fit, true)
    assert.strictEqual(checkRemnantFit(remnant2 as any, 3 + 2 / 12, 8).is_fit, false)
  })
})
