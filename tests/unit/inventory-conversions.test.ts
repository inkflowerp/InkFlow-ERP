import { test, describe } from 'node:test'
import assert from 'node:assert'

export function convertMasterRollToSft(widthFt: number, lengthFt: number): number {
  return widthFt * lengthFt
}

export function deductRollConsumption(
  currentRollSft: number,
  consumedSft: number,
  wasteAllowancePercent: number = 5
) {
  const totalDeduction = consumedSft * (1 + wasteAllowancePercent / 100)
  if (totalDeduction > currentRollSft) {
    throw new Error('Insufficient roll media balance for this print job')
  }
  return {
    netConsumedSft: consumedSft,
    wasteSft: Number((consumedSft * (wasteAllowancePercent / 100)).toFixed(2)),
    totalDeduction: Number(totalDeduction.toFixed(2)),
    remainingRollSft: Number((currentRollSft - totalDeduction).toFixed(2)),
  }
}

export function calculateInkUsage(
  printedSft: number,
  mlPerSftRate: number = 0.8,
  inkBalanceLiters: number = 1.0
) {
  const mlConsumed = printedSft * mlPerSftRate
  const litersConsumed = mlConsumed / 1000
  if (litersConsumed > inkBalanceLiters) {
    throw new Error('Ink level insufficient for job queue')
  }
  return {
    printedSft,
    mlConsumed: Number(mlConsumed.toFixed(2)),
    litersConsumed: Number(litersConsumed.toFixed(4)),
    remainingInkLiters: Number((inkBalanceLiters - litersConsumed).toFixed(4)),
  }
}

describe('Inventory Conversion Unit Tests', () => {
  test('Master roll area conversion: 10ft x 164ft Star Flex Roll = 1,640 SFT', () => {
    const sft = convertMasterRollToSft(10, 164)
    assert.strictEqual(sft, 1640)
  })

  test('Roll media deduction with 5% operator loading wastage', () => {
    // 1640 SFT roll - 1000 SFT print with 5% waste (50 SFT) = 1050 SFT total deduction.
    // Remaining = 1640 - 1050 = 590 SFT.
    const res = deductRollConsumption(1640, 1000, 5)
    assert.strictEqual(res.netConsumedSft, 1000)
    assert.strictEqual(res.wasteSft, 50)
    assert.strictEqual(res.totalDeduction, 1050)
    assert.strictEqual(res.remainingRollSft, 590)
  })

  test('Roll media shortage throws exception: cannot consume 2000 SFT from 1640 SFT roll', () => {
    assert.throws(
      () => deductRollConsumption(1640, 2000, 5),
      /Insufficient roll media balance/
    )
  })

  test('Solvent Ink Consumption: 1500 SFT at 0.8 ml/SFT = 1.2 Liters', () => {
    // 1500 SFT * 0.8 ml = 1200 ml = 1.2 Liters from a 5 Liter drum.
    // Remaining = 3.8 Liters.
    const res = calculateInkUsage(1500, 0.8, 5.0)
    assert.strictEqual(res.mlConsumed, 1200)
    assert.strictEqual(res.litersConsumed, 1.2)
    assert.strictEqual(res.remainingInkLiters, 3.8)
  })

  test('Ink shortage error: 2000 SFT job requires 1.6L but only 1.0L available', () => {
    assert.throws(
      () => calculateInkUsage(2000, 0.8, 1.0),
      /Ink level insufficient/
    )
  })
})
