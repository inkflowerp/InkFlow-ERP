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
    return `${symbol}\u00A0${toBengaliNumerals(formattedNumber)}`
  }

  return `${symbol}\u00A0${formattedNumber}`
}

export const APP_TIMEZONE = 'Asia/Dhaka'

/**
 * Formats a date localized to Bangladesh (English or Bengali) in Asia/Dhaka timezone
 */
export function formatDate(
  date: string | number | Date | null | undefined,
  locale: 'en' | 'bn' = 'en',
  options?: Intl.DateTimeFormatOptions,
  timeZone: string = APP_TIMEZONE
): string {
  if (date === null || date === undefined || date === '') return '—'
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone,
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
 * Formats a time localized to Bangladesh (12-hour AM/PM format) in Asia/Dhaka timezone
 */
export function formatTime(
  date: string | number | Date | null | undefined,
  locale: 'en' | 'bn' = 'en',
  options?: Intl.DateTimeFormatOptions,
  timeZone: string = APP_TIMEZONE
): string {
  if (date === null || date === undefined || date === '') return '—'
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  }

  if (locale === 'bn') {
    return new Intl.DateTimeFormat('bn-BD', defaultOptions).format(d)
  }

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(d)
}

/**
 * Formats full date and time localized to Bangladesh in Asia/Dhaka timezone
 */
export function formatDateTime(
  date: string | number | Date | null | undefined,
  locale: 'en' | 'bn' = 'en',
  options?: Intl.DateTimeFormatOptions,
  timeZone: string = APP_TIMEZONE
): string {
  if (date === null || date === undefined || date === '') return '—'
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  }

  if (locale === 'bn') {
    return new Intl.DateTimeFormat('bn-BD', defaultOptions).format(d)
  }

  return new Intl.DateTimeFormat('en-GB', defaultOptions).format(d)
}

/**
 * Resolves local calendar date (YYYY-MM-DD) in Bangladesh Standard Time (Asia/Dhaka) or custom timezone.
 */
export function getLocalDate(date: Date | string | number = new Date(), timeZone: string = APP_TIMEZONE): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(d)
  } catch {
    const offset = 6 * 60 * 60 * 1000 // UTC+6 for Bangladesh
    const bst = new Date(d.getTime() + offset)
    return bst.toISOString().split('T')[0]
  }
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

/**
 * Normalizes a Bangladeshi phone number into standard international format (+8801XXXXXXXXX)
 */
export function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('880')) return `+${digits}`
  if (digits.startsWith('01')) return `+88${digits}`
  return phone.trim()
}

/**
 * Calculates days overdue from a due date ISO string
 */
export function calculateDaysOverdue(dueDateStr: string): number {
  const dueDate = new Date(dueDateStr)
  const today = new Date()
  const diffTime = today.getTime() - dueDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

/**
 * Converts a numerical BDT currency amount into English words (e.g. "One Lakh Fifty Thousand Taka Only")
 */
export function numberToWordsBDT(amount: number): string {
  if (amount === 0) return 'Zero Taka Only'

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertBelowThousand = (n: number): string => {
    let str = ''
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred '
      n %= 100
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' '
      n %= 10
    }
    if (n > 0) {
      str += units[n] + ' '
    }
    return str.trim()
  }

  let amt = Math.floor(amount)
  const crore = Math.floor(amt / 10000000)
  amt %= 10000000
  const lakh = Math.floor(amt / 100000)
  amt %= 100000
  const thousand = Math.floor(amt / 1000)
  amt %= 1000
  const remainder = amt

  let res = ''
  if (crore > 0) res += convertBelowThousand(crore) + ' Crore '
  if (lakh > 0) res += convertBelowThousand(lakh) + ' Lakh '
  if (thousand > 0) res += convertBelowThousand(thousand) + ' Thousand '
  if (remainder > 0) res += convertBelowThousand(remainder) + ' '

  return (res.trim() + ' Taka Only').replace(/\s+/g, ' ')
}

/**
 * Checks if a graphic design file format can be previewed/rendered in-browser
 */
export function isRenderableFormat(format: string): boolean {
  return ['jpg', 'jpeg', 'png', 'svg', 'pdf', 'webp'].includes(format.toLowerCase())
}

/**
 * Returns Tailwind badge color classes for design format extensions
 */
export function getFormatBadgeColor(format: string): string {
  switch (format.toLowerCase()) {
    case 'ai':
      return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300'
    case 'psd':
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
    case 'cdr':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
    case 'pdf':
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300'
    case 'svg':
      return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
    case 'zip':
      return 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
    default:
      return 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300'
  }
}

/**
 * Returns Kanban columns for production departments
 */
export function getDepartmentColumns(department: string) {
  switch (department) {
    case 'printing':
      return [
        { id: 'queued', title: 'Queued (অপেক্ষারত)', titleBn: 'অপেক্ষারত', statusMatch: ['queued', 'paused'] },
        { id: 'printing', title: 'Printing (প্রিন্ট চলছে)', titleBn: 'প্রিন্ট চলছে', statusMatch: ['in_progress'] },
        { id: 'completed', title: 'Completed (সম্পন্ন)', titleBn: 'সম্পন্ন', statusMatch: ['completed'] },
      ]
    case 'finishing':
      return [
        { id: 'queued', title: 'Queued (ফিনিশিং কিউ)', titleBn: 'ফিনিশিং কিউ', statusMatch: ['queued'] },
        { id: 'in_finishing', title: 'In Finishing (কাটিং/লেমিনেশন)', titleBn: 'কাটিং ও লেমিনেশন', statusMatch: ['in_progress', 'paused'] },
        { id: 'qc', title: 'Quality Check (কিউসি)', titleBn: 'কিউসি পরীক্ষা', statusMatch: ['quality_check', 'rework'] },
        { id: 'completed', title: 'Completed (ডেলিভারি রেডি)', titleBn: 'ডেলিভারি রেডি', statusMatch: ['completed'] },
      ]
    case 'fabrication':
      return [
        { id: 'queued', title: 'Queued (ওয়ার্কশপ কিউ)', titleBn: 'ওয়ার্কশপ কিউ', statusMatch: ['queued'] },
        { id: 'in_fab', title: 'In Fabrication (ওয়েল্ডিং/লেটার)', titleBn: 'ওয়েল্ডিং ও লেটার তৈরি', statusMatch: ['in_progress', 'paused'] },
        { id: 'qc', title: 'Wiring & QC (এলইডি টেস্ট)', titleBn: 'এলইডি টেস্ট', statusMatch: ['quality_check', 'rework'] },
        { id: 'completed', title: 'Completed (ফিটিং রেডি)', titleBn: 'ফিটিং রেডি', statusMatch: ['completed'] },
      ]
    case 'installation':
      return [
        { id: 'scheduled', title: 'Scheduled (শিডিউল্ড)', titleBn: 'শিডিউল্ড', statusMatch: ['queued'] },
        { id: 'en_route', title: 'En Route / On Site', titleBn: 'সাইটে টিম রওয়ানা', statusMatch: ['in_progress', 'paused'] },
        { id: 'installing', title: 'Installing (ফিটিং চলছে)', titleBn: 'ফিটিং চলছে', statusMatch: ['quality_check'] },
        { id: 'completed', title: 'Completed (হস্তান্তরিত)', titleBn: 'হস্তান্তরিত', statusMatch: ['completed'] },
      ]
    default:
      return [
        { id: 'queued', title: 'Queued', titleBn: 'কিউ', statusMatch: ['queued'] },
        { id: 'in_progress', title: 'In Progress (চলছে)', titleBn: 'চলছে', statusMatch: ['in_progress'] },
        { id: 'quality_check', title: 'QC / Review', titleBn: 'কিউসি', statusMatch: ['quality_check', 'rework', 'paused'] },
        { id: 'completed', title: 'Completed', titleBn: 'সম্পন্ন', statusMatch: ['completed'] },
      ]
  }
}

