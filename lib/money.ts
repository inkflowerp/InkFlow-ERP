// ==============================================================================
// PrintFlow - Authoritative Monetary Calculation Engine (lib/money.ts)
// Eliminates IEEE-754 floating-point errors by operating on exact integer Paisa
// 1 Bangladeshi Taka (BDT) = 100 Paisa.
// Supports: Standard Commercial Half-Up and Banker's Half-Even Rounding.
// ==============================================================================

export type RoundingMode = 'half-up' | 'half-even'

/**
 * Converts a Taka decimal amount (number or string) into exact integer Paisa.
 * E.g. 150.25 -> 15025, 0.1 + 0.2 -> 30 (not 30.000000000000004).
 */
export function toPaisa(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined || amount === '') return 0
  if (typeof amount === 'string') {
    const cleaned = amount.replace(/,/g, '').trim()
    const parsed = Number(cleaned)
    if (Number.isNaN(parsed)) return 0
    amount = parsed
  }
  return Math.round(amount * 100)
}

/**
 * Converts exact integer Paisa back to Taka decimal.
 * E.g. 15025 -> 150.25
 */
export function toTaka(paisa: number): number {
  return Math.round(paisa) / 100
}

/**
 * Commercial Half-Up Rounding on decimal values:
 * 2.555 -> 2.56, -2.555 -> -2.56
 */
export function roundHalfUp(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals)
  const sign = value < 0 ? -1 : 1
  return (sign * Math.round(Math.abs(value) * factor)) / factor
}

/**
 * Banker's Rounding (Half-Even):
 * Rounds to the nearest even number when equidistant.
 * Reduces cumulative statistical bias in large financial batches.
 */
export function roundHalfEven(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals)
  const scaled = value * factor
  const integer = Math.floor(scaled)
  const fraction = scaled - integer

  if (Math.abs(fraction - 0.5) < 1e-9) {
    return (integer % 2 === 0 ? integer : integer + 1) / factor
  }
  return Math.round(scaled) / factor
}

/**
 * Rounds a paisa calculation to an integer paisa based on the chosen mode.
 */
export function roundPaisa(paisaWithFractions: number, mode: RoundingMode = 'half-up'): number {
  if (mode === 'half-even') {
    return Math.round(roundHalfEven(paisaWithFractions, 0))
  }
  return Math.round(paisaWithFractions)
}

/**
 * Safe Addition: a + b (in Taka, calculated in Paisa)
 */
export function moneyAdd(a: number | string, b: number | string): number {
  return toTaka(toPaisa(a) + toPaisa(b))
}

/**
 * Safe Subtraction: a - b (in Taka, calculated in Paisa)
 */
export function moneySub(a: number | string, b: number | string): number {
  return toTaka(toPaisa(a) - toPaisa(b))
}

/**
 * Safe Multiplication: a * multiplier (e.g. quantity * unit_price)
 */
export function moneyMul(
  amount: number | string,
  multiplier: number,
  mode: RoundingMode = 'half-up'
): number {
  const p = toPaisa(amount) * multiplier
  return toTaka(roundPaisa(p, mode))
}

/**
 * Safe Division: a / divisor
 */
export function moneyDiv(
  amount: number | string,
  divisor: number,
  mode: RoundingMode = 'half-up'
): number {
  if (divisor === 0) return 0
  const p = toPaisa(amount) / divisor
  return toTaka(roundPaisa(p, mode))
}

/**
 * Safe Percentage Calculation: e.g. VAT at 5%, 7.5%, 10%, 15%
 * percent(1000, 15) -> 150.00
 * percent(105.50, 7.5) -> 7.91
 */
export function moneyPercent(
  amount: number | string,
  percentage: number,
  mode: RoundingMode = 'half-up'
): number {
  if (!percentage || percentage <= 0) return 0
  const p = (toPaisa(amount) * percentage) / 100
  return toTaka(roundPaisa(p, mode))
}

/**
 * Sum an array of monetary values safely without floating-point error.
 */
export function moneySum(amounts: (number | string | null | undefined)[]): number {
  let totalPaisa = 0
  for (const amt of amounts) {
    totalPaisa += toPaisa(amt)
  }
  return toTaka(totalPaisa)
}

/**
 * Distribute an amount across ratios without losing or gaining a single Paisa.
 * E.g. allocating 100 Taka equally across 3 accounts -> [33.34, 33.33, 33.33].
 * Remainder is distributed sequentially to ensure sum(result) === original total.
 */
export function moneyAllocate(totalAmount: number | string, ratios: number[]): number[] {
  const totalPaisa = toPaisa(totalAmount)
  const sumRatios = ratios.reduce((acc, r) => acc + r, 0)
  if (sumRatios <= 0) return ratios.map(() => 0)

  let remainder = totalPaisa
  const results: number[] = []

  for (let i = 0; i < ratios.length; i++) {
    const share = Math.floor((totalPaisa * ratios[i]) / sumRatios)
    results.push(share)
    remainder -= share
  }

  // Distribute remainder 1 paisa at a time to maintain zero drift
  for (let i = 0; i < remainder; i++) {
    results[i % results.length] += 1
  }

  return results.map(toTaka)
}

/**
 * Safe comparison utilities
 */
export function moneyEquals(a: number | string, b: number | string): boolean {
  return toPaisa(a) === toPaisa(b)
}

export function moneyGreaterThan(a: number | string, b: number | string): boolean {
  return toPaisa(a) > toPaisa(b)
}

export function moneyGreaterThanOrEqual(a: number | string, b: number | string): boolean {
  return toPaisa(a) >= toPaisa(b)
}

export function moneyLessThan(a: number | string, b: number | string): boolean {
  return toPaisa(a) < toPaisa(b)
}

export function moneyLessThanOrEqual(a: number | string, b: number | string): boolean {
  return toPaisa(a) <= toPaisa(b)
}

/**
 * Formats Taka amounts with comma separators and currency symbols.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  options: {
    locale?: 'en' | 'bn'
    showSymbol?: boolean
    decimals?: number
  } = {}
): string {
  const taka = toTaka(toPaisa(amount))
  const { locale = 'en', showSymbol = true, decimals = 2 } = options

  const formatted = taka.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  if (!showSymbol) return formatted
  return locale === 'bn' ? `৳ ${formatted}` : `৳${formatted}`
}

/**
 * Convenience helper to format Taka as a standard numeric string without symbol.
 */
export function formatTaka(
  amount: number | string | null | undefined,
  locale: 'en' | 'bn' = 'en'
): string {
  return formatMoney(amount, { locale, showSymbol: false })
}

