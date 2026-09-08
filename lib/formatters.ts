/**
 * Converts English digits (0-9) to Bengali digits (০-৯)
 */
export function toBengaliNumerals(input: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return String(input).replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)])
}

/**
 * Formats a number with South Asian (Lakh / Crore) comma separation
 * Example: 1500000 -> 15,00,000.00
 */
export function formatLakhCrore(amount: number, showDecimals = true): string {
  const parts = amount.toFixed(showDecimals ? 2 : 0).split('.')
  let integerPart = parts[0]
  const decimalPart = parts[1]

  const isNegative = integerPart.startsWith('-')
  if (isNegative) {
    integerPart = integerPart.substring(1)
  }

  // If 3 digits or fewer, no additional grouping needed
  if (integerPart.length <= 3) {
    return (isNegative ? '-' : '') + integerPart + (decimalPart ? '.' + decimalPart : '')
  }

  // Last 3 digits
  const lastThree = integerPart.substring(integerPart.length - 3)
  const otherDigits = integerPart.substring(0, integerPart.length - 3)
  // Group the rest by 2
  const formattedOther = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',')

  const result = `${formattedOther},${lastThree}${decimalPart ? '.' + decimalPart : ''}`
  return isNegative ? `-${result}` : result
}

/**
 * Formats an amount to Bangladeshi Taka (৳ BDT)
 * Supports English digits or Bengali digits
 */
export function formatBDT(
  amount: number,
  options?: {
    useBengaliNumerals?: boolean
    showDecimals?: boolean
    symbol?: string
  }
): string {
  const {
    useBengaliNumerals = false,
    showDecimals = true,
    symbol = '৳',
  } = options || {}

  const formattedNumber = formatLakhCrore(amount, showDecimals)

  if (useBengaliNumerals) {
    return `${symbol} ${toBengaliNumerals(formattedNumber)}`
  }

  return `${symbol} ${formattedNumber}`
}

/**
 * Formats a date localized to Bangladesh (English or Bengali)
 */
export function formatDate(
  date: string | Date,
  locale: 'en' | 'bn' = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }

  if (locale === 'bn') {
    return new Intl.DateTimeFormat('bn-BD', defaultOptions).format(d)
  }

  return new Intl.DateTimeFormat('en-GB', defaultOptions).format(d)
}

/**
 * Formats dimension calculations for printing (e.g., "10 ft × 4 ft = 40.00 sq.ft")
 */
export function formatDimensions(
  width: number,
  height: number,
  unit: string = 'ft',
  locale: 'en' | 'bn' = 'en'
): string {
  const area = width * height
  if (locale === 'bn') {
    return `${toBengaliNumerals(width)} ${unit === 'ft' ? 'ফুট' : unit} × ${toBengaliNumerals(height)} ${unit === 'ft' ? 'ফুট' : unit} = ${toBengaliNumerals(area.toFixed(2))} বর্গফুট`
  }
  return `${width} ${unit} × ${height} ${unit} = ${area.toFixed(2)} sq.ft`
}
