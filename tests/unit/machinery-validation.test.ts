import { test, describe } from 'node:test'
import assert from 'node:assert'
import type {
  Machinery,
  CreateMachineryInput,
  MachineryType,
  MachineryCategory,
  MachineryStatus,
} from '../../types/machinery.types'

/**
 * Pure Machinery Validation Helper for unit testing
 */
export function validateMachineryPayload(input: Partial<CreateMachineryInput>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!input.name || input.name.trim().length === 0) {
    errors.push('Machine name is required')
  }

  if (!input.code || input.code.trim().length === 0) {
    errors.push('Machine code is required')
  } else if (!/^[A-Za-z0-9_-]+$/.test(input.code.trim())) {
    errors.push('Machine code contains invalid characters')
  }

  if (!input.machine_type) {
    errors.push('Machine type is required')
  }

  if (input.max_width !== undefined && input.max_width !== null && input.max_width < 0) {
    errors.push('Maximum width cannot be negative')
  }

  if (input.max_height !== undefined && input.max_height !== null && input.max_height < 0) {
    errors.push('Maximum height cannot be negative')
  }

  if (input.production_capacity !== undefined && input.production_capacity !== null && input.production_capacity < 0) {
    errors.push('Production capacity cannot be negative')
  }

  if (input.purchase_cost !== undefined && input.purchase_cost !== null && input.purchase_cost < 0) {
    errors.push('Purchase cost cannot be negative')
  }

  if (input.hourly_machine_cost !== undefined && input.hourly_machine_cost !== null && input.hourly_machine_cost < 0) {
    errors.push('Hourly machine cost cannot be negative')
  }

  if (input.electricity_cost_per_hour !== undefined && input.electricity_cost_per_hour !== null && input.electricity_cost_per_hour < 0) {
    errors.push('Electricity cost cannot be negative')
  }

  if (input.maintenance_cost_per_hour !== undefined && input.maintenance_cost_per_hour !== null && input.maintenance_cost_per_hour < 0) {
    errors.push('Maintenance cost cannot be negative')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

describe('Machinery Input Validation & Normalization Unit Tests', () => {
  test('Valid machinery payload with all required and optional specs passes validation', () => {
    const validPayload: CreateMachineryInput = {
      name: 'Flora XTRA 3300L Solvent Printer',
      code: 'PRN-FLORA-01',
      machine_type: 'large_format_printing',
      category: 'printing',
      department: 'printing',
      brand: 'Flora',
      model: 'XTRA 3300L',
      serial_number: 'FL-2024-889',
      max_width: 126,
      max_height: 0,
      dimension_unit: 'inch',
      production_capacity: 450,
      capacity_unit: 'sft/hour',
      estimated_speed: 450,
      speed_unit: 'sft/hour',
      setup_time_mins: 15,
      changeover_time_mins: 10,
      operators_required_count: 1,
      purchase_cost: 1850000,
      hourly_machine_cost: 650,
      per_unit_machine_cost: 1.45,
      electricity_cost_per_hour: 120,
      maintenance_cost_per_hour: 80,
      other_operating_cost_per_hour: 40,
      supported_materials: ['Panaflex 440gsm', 'Star Flex 280gsm', 'PVC Vinyl', 'One Way Vision'],
      supported_production_types: ['large_format_banner', 'vinyl_sticker', 'backlit_signage'],
    }

    const validation = validateMachineryPayload(validPayload)
    assert.strictEqual(validation.valid, true)
    assert.strictEqual(validation.errors.length, 0)
  })

  test('Missing required name and code fails validation', () => {
    const invalidPayload: Partial<CreateMachineryInput> = {
      name: '',
      code: '',
      machine_type: 'cnc_router',
    }

    const validation = validateMachineryPayload(invalidPayload)
    assert.strictEqual(validation.valid, false)
    assert.ok(validation.errors.includes('Machine name is required'))
    assert.ok(validation.errors.includes('Machine code is required'))
  })

  test('Invalid machine code format fails validation', () => {
    const invalidCodePayload: Partial<CreateMachineryInput> = {
      name: 'Mimaki UV Flatbed',
      code: 'PRN FLORA 01!', // spaces and exclamation not allowed in code
      machine_type: 'uv_flatbed',
    }

    const validation = validateMachineryPayload(invalidCodePayload)
    assert.strictEqual(validation.valid, false)
    assert.ok(validation.errors.includes('Machine code contains invalid characters'))
  })

  test('Negative numeric rates and capacities fail validation', () => {
    const negativePayload: Partial<CreateMachineryInput> = {
      name: 'Laser Cutter 1390',
      code: 'LSR-1390',
      machine_type: 'laser_cutting',
      hourly_machine_cost: -50,
      purchase_cost: -10000,
      production_capacity: -100,
      max_width: -20,
    }

    const validation = validateMachineryPayload(negativePayload)
    assert.strictEqual(validation.valid, false)
    assert.ok(validation.errors.includes('Hourly machine cost cannot be negative'))
    assert.ok(validation.errors.includes('Purchase cost cannot be negative'))
    assert.ok(validation.errors.includes('Production capacity cannot be negative'))
    assert.ok(validation.errors.includes('Maximum width cannot be negative'))
  })
})
