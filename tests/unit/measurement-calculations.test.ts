import { test, describe } from 'node:test'
import assert from 'node:assert'

export function inchesToSft(widthInches: number, heightInches: number): number {
  return Number(((widthInches * heightInches) / 144).toFixed(4))
}

export function compoundDimensionsToSft(
  wFt: number,
  wIn: number,
  hFt: number,
  hIn: number
): number {
  const totalW = wFt + wIn / 12
  const totalH = hFt + hIn / 12
  return Number((totalW * totalH).toFixed(4))
}

export function calculatePerimeterRft(widthFt: number, heightFt: number): number {
  return 2 * (widthFt + heightFt)
}

export function calculatePaperWeightKg(
  lengthMm: number,
  widthMm: number,
  gsm: number,
  sheets: number
): number {
  const areaSqMeters = (lengthMm / 1000) * (widthMm / 1000)
  const totalWeightGrams = areaSqMeters * gsm * sheets
  return Number((totalWeightGrams / 1000).toFixed(3))
}

export function calculateRollNestingYield(
  rollWidthFt: number,
  printWidthFt: number,
  printHeightFt: number,
  quantity: number
) {
  const itemsAcross = Math.floor(rollWidthFt / printWidthFt)
  if (itemsAcross === 0) {
    throw new Error('Print width exceeds master roll width')
  }
  const rowsNeeded = Math.ceil(quantity / itemsAcross)
  const linearFtUsed = rowsNeeded * printHeightFt
  const totalSftUsed = linearFtUsed * rollWidthFt
  const netPrintedSft = printWidthFt * printHeightFt * quantity
  const scrapSft = totalSftUsed - netPrintedSft
  const scrapPercentage = Number(((scrapSft / totalSftUsed) * 100).toFixed(2))

  return {
    itemsAcross,
    rowsNeeded,
    linearFtUsed,
    totalSftUsed,
    netPrintedSft,
    scrapSft,
    scrapPercentage,
  }
}

describe('Measurement Calculations Unit Tests', () => {
  test('Inches to SFT: 36in x 48in (Poster) = 12 SFT', () => {
    const sft = inchesToSft(36, 48)
    assert.strictEqual(sft, 12)
  })

  test('Inches to SFT: 24in x 30in (Table-top signage) = 5 SFT', () => {
    const sft = inchesToSft(24, 30)
    assert.strictEqual(sft, 5)
  })

  test('Compound feet and inches: 8ft 6in by 4ft 3in', () => {
    // 8.5 ft * 4.25 ft = 36.125 SFT
    const sft = compoundDimensionsToSft(8, 6, 4, 3)
    assert.strictEqual(sft, 36.125)
  })

  test('Running Feet (RFT) Perimeter for billboard framing: 20ft x 10ft = 60 RFT', () => {
    const rft = calculatePerimeterRft(20, 10)
    assert.strictEqual(rft, 60)
  })

  test('Paper Sheet Weight in kg: 1000 sheets of A4 (210mm x 297mm) 80 GSM paper', () => {
    // Area of A4 = 0.06237 m2. 0.06237 * 80 * 1000 / 1000 = 4.990 kg
    const weight = calculatePaperWeightKg(297, 210, 80, 1000)
    assert.strictEqual(weight, 4.99)
  })

  test('Roll Nesting Yield: 4 pcs of 2.5ft x 5ft prints on a 10ft wide flex roll', () => {
    // 10ft roll fits 4 items across (10 / 2.5 = 4).
    // 1 row needed of height 5ft.
    // Linear ft used: 5ft.
    // Total SFT used: 5 * 10 = 50 SFT.
    // Net printed SFT: 2.5 * 5 * 4 = 50 SFT.
    // Scrap = 0%.
    const yieldResult = calculateRollNestingYield(10, 2.5, 5, 4)
    assert.strictEqual(yieldResult.itemsAcross, 4)
    assert.strictEqual(yieldResult.rowsNeeded, 1)
    assert.strictEqual(yieldResult.linearFtUsed, 5)
    assert.strictEqual(yieldResult.totalSftUsed, 50)
    assert.strictEqual(yieldResult.scrapPercentage, 0)
  })

  test('Roll Nesting Scrap: 3 pcs of 3ft x 6ft prints on a 10ft wide roll', () => {
    // 10ft roll fits 3 items across (10 / 3 = 3 with 1ft offcut).
    // Net printed SFT = 3 * 6 * 3 = 54 SFT.
    // Total SFT = 6 * 10 = 60 SFT.
    // Scrap = 6 SFT (10%).
    const yieldResult = calculateRollNestingYield(10, 3, 6, 3)
    assert.strictEqual(yieldResult.itemsAcross, 3)
    assert.strictEqual(yieldResult.scrapSft, 6)
    assert.strictEqual(yieldResult.scrapPercentage, 10)
  })
})
