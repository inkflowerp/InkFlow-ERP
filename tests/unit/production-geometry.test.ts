import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  calculateProductionDimensions,
  calculateOrderedArea,
  calculateProductionArea,
  convertDimensionToFeet,
  formatDimensionWithInches,
} from '../../lib/domain/production-geometry.ts'

describe('Production Geometry Engine', () => {
  test('correctly adds 1-inch allowance per side (2 inches total) to customer dimensions', () => {
    // Customer: 4ft x 12ft
    const result = calculateProductionDimensions(4, 12, {
      dimension_unit: 'ft',
      allowance_per_side_in: 1.0,
    })

    // 4ft + 2 inches = 4.1667 ft (4ft 2in)
    // 12ft + 2 inches = 12.1667 ft (12ft 2in)
    assert.strictEqual(result.ordered_width_ft, 4)
    assert.strictEqual(result.ordered_length_ft, 12)
    assert.ok(Math.abs(result.production_width_ft - (4 + 2 / 12)) < 0.001)
    assert.ok(Math.abs(result.production_length_ft - (12 + 2 / 12)) < 0.001)
    assert.strictEqual(result.total_width_allowance_in, 2)
    assert.strictEqual(result.total_length_allowance_in, 2)
    assert.strictEqual(result.formatted_production_spec, '4ft 2in × 12ft 2in')
  })

  test('correctly handles fractional foot inputs with bleed allowance', () => {
    // Customer: 3.5ft x 5.5ft
    const result = calculateProductionDimensions(3.5, 5.5, {
      dimension_unit: 'ft',
      allowance_per_side_in: 1.0,
    })

    assert.strictEqual(result.ordered_width_ft, 3.5)
    assert.strictEqual(result.ordered_length_ft, 5.5)
    assert.ok(Math.abs(result.production_width_ft - (3.5 + 2 / 12)) < 0.001)
    assert.ok(Math.abs(result.production_length_ft - (5.5 + 2 / 12)) < 0.001)
    assert.strictEqual(result.formatted_production_spec, '3ft 8in × 5ft 8in')
  })

  test('correctly calculates customer area vs production area without double counting', () => {
    const orderedArea = calculateOrderedArea(4, 12, 'ft')
    assert.strictEqual(orderedArea, 48) // 4 * 12 = 48 sqft

    const geom = calculateProductionDimensions(4, 12, {
      dimension_unit: 'ft',
      allowance_per_side_in: 1.0,
    })

    const prodArea = calculateProductionArea(geom)
    // (4 + 2/12) * (12 + 2/12) = 4.16667 * 12.16667 = 50.694 sqft
    assert.ok(Math.abs(prodArea - 50.69) < 0.1)
    assert.ok(prodArea > orderedArea)
  })

  test('converts inches, centimeters, and millimeters to feet accurately', () => {
    assert.strictEqual(convertDimensionToFeet(48, 'inch'), 4)
    assert.strictEqual(convertDimensionToFeet(144, 'inch'), 12)
    assert.ok(Math.abs(convertDimensionToFeet(100, 'cm') - 3.28084) < 0.01)
    assert.ok(Math.abs(convertDimensionToFeet(1000, 'mm') - 3.28084) < 0.01)
  })

  test('formats dimensions with inches cleanly for workshop floor operators', () => {
    assert.strictEqual(formatDimensionWithInches(4 + 2 / 12), '4ft 2in')
    assert.strictEqual(formatDimensionWithInches(12 + 2 / 12), '12ft 2in')
    assert.strictEqual(formatDimensionWithInches(5), '5ft 0in')
    assert.strictEqual(formatDimensionWithInches(3.25), '3ft 3in')
    assert.strictEqual(formatDimensionWithInches(4.25), '4ft 3in')
  })
})
