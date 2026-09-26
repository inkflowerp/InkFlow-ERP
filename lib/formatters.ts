/**
 * Converts English digits (0-9) to Bengali digits (০-৯)
 */
export function toBengaliNumerals(input: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return String(input).replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)])
}

/**
 * Formats a number with South Asian (Lakh / Crore) comma separation
 * Example: 1500000 -> 15,00,000 (suppresses unnecessary .00)
 * Example: 1500000.50 -> 15,00,000.50 (preserves meaningful decimals)
 */
export function formatLakhCrore(
  amount: number,
  showDecimals: boolean | 'auto' | 'always' = 'auto'
): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0
  const isNegative = num < 0
  const absNum = Math.abs(num)

  // Standardize to 2 decimal places to check fraction
  const fixed2 = absNum.toFixed(2)
  const [intStr, decStr] = fixed2.split('.')
  const hasFraction = decStr !== '00'

  let includeDecimals = false
  if (showDecimals === 'always') {
    includeDecimals = true
  } else if (showDecimals === false) {
    includeDecimals = false
  } else {
    // 'auto' or true (default): show decimals only when meaningful
    includeDecimals = hasFraction
  }

  const decimalPart = includeDecimals ? `.${decStr}` : ''

  // If 3 digits or fewer, no additional grouping needed
  if (intStr.length <= 3) {
    const res = intStr + decimalPart
    return isNegative ? `-${res}` : res
  }

  // Last 3 digits
  const lastThree = intStr.substring(intStr.length - 3)
  const otherDigits = intStr.substring(0, intStr.length - 3)
  // Group the rest by 2
  const formattedOther = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',')

  const result = `${formattedOther},${lastThree}${decimalPart}`
  return isNegative ? `-${result}` : result
}

/**
 * Formats an amount to Bangladeshi Taka (৳ BDT)
 * Supports English digits or Bengali digits
 * Adheres to Global BDT Decimal Display Rule: suppresses trailing .00
 */
export function formatBDT(
  amount: number,
  options?: {
    useBengaliNumerals?: boolean
    showDecimals?: boolean | 'auto' | 'always'
    symbol?: string
  }
): string {
  const {
    useBengaliNumerals = false,
    showDecimals = 'auto',
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

  // If caller passes dateStyle or timeStyle, mixing it with individual fields (year/month/day)
  // triggers ECMA-402 "TypeError: Invalid option" in Intl.DateTimeFormat.
  const hasStyle = Boolean(options && (options.dateStyle || options.timeStyle))

  const finalOptions: Intl.DateTimeFormatOptions = hasStyle
    ? {
        timeZone,
        ...options,
      }
    : {
        timeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
      }

  try {
    if (locale === 'bn') {
      return new Intl.DateTimeFormat('bn-BD', finalOptions).format(d)
    }
    return new Intl.DateTimeFormat('en-GB', finalOptions).format(d)
  } catch {
    try {
      return d.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB')
    } catch {
      return '—'
    }
  }
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

  const hasStyle = Boolean(options && (options.dateStyle || options.timeStyle))

  const finalOptions: Intl.DateTimeFormatOptions = hasStyle
    ? {
        timeZone,
        ...options,
      }
    : {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        ...options,
      }

  try {
    if (locale === 'bn') {
      return new Intl.DateTimeFormat('bn-BD', finalOptions).format(d)
    }
    return new Intl.DateTimeFormat('en-US', finalOptions).format(d)
  } catch {
    try {
      return d.toLocaleTimeString(locale === 'bn' ? 'bn-BD' : 'en-US')
    } catch {
      return '—'
    }
  }
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

  const hasStyle = Boolean(options && (options.dateStyle || options.timeStyle))

  const finalOptions: Intl.DateTimeFormatOptions = hasStyle
    ? {
        timeZone,
        ...options,
      }
    : {
        timeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        ...options,
      }

  try {
    if (locale === 'bn') {
      return new Intl.DateTimeFormat('bn-BD', finalOptions).format(d)
    }
    return new Intl.DateTimeFormat('en-GB', finalOptions).format(d)
  } catch {
    try {
      return d.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB')
    } catch {
      return '—'
    }
  }
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
  if (!dueDateStr) return 0
  const cleanDue = dueDateStr.split('T')[0]
  const [dYear, dMonth, dDay] = cleanDue.split('-').map(Number)
  if (!dYear || !dMonth || !dDay) return 0

  const now = new Date()
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1
  const nowDay = now.getDate()

  const dueUtc = Date.UTC(dYear, dMonth - 1, dDay)
  const nowUtc = Date.UTC(nowYear, nowMonth - 1, nowDay)

  const diffTime = nowUtc - dueUtc
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

/**
 * Converts a numerical BDT currency amount into English words (e.g. "One Lakh Fifty Thousand Taka Only", "Five Thousand Taka and Fifty Paisa Only")
 */
export function numberToWordsBDT(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return 'Zero Taka Only'

  const absAmount = Math.abs(amount)
  if (absAmount === 0) return 'Zero Taka Only'

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

  let taka = Math.floor(absAmount)
  const paisa = Math.round((absAmount - taka) * 100)

  const crore = Math.floor(taka / 10000000)
  taka %= 10000000
  const lakh = Math.floor(taka / 100000)
  taka %= 100000
  const thousand = Math.floor(taka / 1000)
  taka %= 1000
  const remainder = taka

  let takaWords = ''
  if (crore > 0) takaWords += convertBelowThousand(crore) + ' Crore '
  if (lakh > 0) takaWords += convertBelowThousand(lakh) + ' Lakh '
  if (thousand > 0) takaWords += convertBelowThousand(thousand) + ' Thousand '
  if (remainder > 0) takaWords += convertBelowThousand(remainder) + ' '
  takaWords = takaWords.trim()

  const paisaWords = paisa > 0 ? convertBelowThousand(paisa) : ''

  if (!takaWords && !paisaWords) {
    return 'Zero Taka Only'
  }

  if (takaWords && !paisaWords) {
    return `${takaWords} Taka Only`.replace(/\s+/g, ' ')
  }

  if (takaWords && paisaWords) {
    return `${takaWords} Taka and ${paisaWords} Paisa Only`.replace(/\s+/g, ' ')
  }

  return `${paisaWords} Paisa Only`.replace(/\s+/g, ' ')
}

const BN_NUMS_0_TO_99 = [
  '', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ',
  'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ',
  'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আটাশ', 'ঊনত্রিশ', 'ত্রিশ',
  'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ', 'চল্লিশ',
  'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ', 'পঞ্চাশ',
  'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট', 'ষাট',
  'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর', 'সত্তর',
  'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি', 'আশি',
  'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'ঊননব্বই', 'নব্বই',
  'একানব্বই', 'বানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই',
]

/**
 * Converts a numerical BDT currency amount into Bangla words (e.g. "এক লক্ষ পঞ্চাশ হাজার টাকা মাত্র", "পাঁচ হাজার টাকা এবং পঞ্চাশ পয়সা মাত্র")
 */
export function numberToWordsBangla(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return 'শূন্য টাকা মাত্র'

  const absAmount = Math.abs(amount)
  if (absAmount === 0) return 'শূন্য টাকা মাত্র'

  const convertBelowThousand = (n: number): string => {
    let str = ''
    if (n >= 100) {
      const h = Math.floor(n / 100)
      str += (BN_NUMS_0_TO_99[h] || '') + ' শত '
      n %= 100
    }
    if (n > 0) {
      str += (BN_NUMS_0_TO_99[n] || '') + ' '
    }
    return str.trim()
  }

  let taka = Math.floor(absAmount)
  const paisa = Math.round((absAmount - taka) * 100)

  const crore = Math.floor(taka / 10000000)
  taka %= 10000000
  const lakh = Math.floor(taka / 100000)
  taka %= 100000
  const thousand = Math.floor(taka / 1000)
  taka %= 1000
  const remainder = taka

  let takaWords = ''
  if (crore > 0) takaWords += convertBelowThousand(crore) + ' কোটি '
  if (lakh > 0) takaWords += convertBelowThousand(lakh) + ' লক্ষ '
  if (thousand > 0) takaWords += convertBelowThousand(thousand) + ' হাজার '
  if (remainder > 0) takaWords += convertBelowThousand(remainder) + ' '
  takaWords = takaWords.trim()

  const paisaWords = paisa > 0 ? (BN_NUMS_0_TO_99[paisa] || convertBelowThousand(paisa)) : ''

  if (!takaWords && !paisaWords) {
    return 'শূন্য টাকা মাত্র'
  }

  if (takaWords && !paisaWords) {
    return `${takaWords} টাকা মাত্র`.replace(/\s+/g, ' ')
  }

  if (takaWords && paisaWords) {
    return `${takaWords} টাকা এবং ${paisaWords} পয়সা মাত্র`.replace(/\s+/g, ' ')
  }

  return `${paisaWords} পয়সা মাত্র`.replace(/\s+/g, ' ')
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
    case 'png':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
    case 'jpg':
    case 'jpeg':
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
    case 'ai':
      return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300'
    case 'psd':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300'
    case 'cdr':
      return 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300'
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
        { id: 'queued', title: 'Queued', titleBn: 'অপেক্ষারত', statusMatch: ['queued', 'paused'] },
        { id: 'printing', title: 'Printing', titleBn: 'প্রিন্ট চলছে', statusMatch: ['in_progress'] },
        { id: 'completed', title: 'Completed', titleBn: 'সম্পন্ন', statusMatch: ['completed'] },
      ]
    case 'finishing':
      return [
        { id: 'queued', title: 'Queued', titleBn: 'ফিনিশিং তালিকা', statusMatch: ['queued'] },
        { id: 'in_finishing', title: 'In Finishing', titleBn: 'কাটিং ও লেমিনেশন', statusMatch: ['in_progress', 'paused'] },
        { id: 'qc', title: 'Quality Check', titleBn: 'গুণমান পরীক্ষা', statusMatch: ['quality_check', 'rework'] },
        { id: 'completed', title: 'Completed', titleBn: 'ডেলিভারি প্রস্তুত', statusMatch: ['completed'] },
      ]
    case 'fabrication':
      return [
        { id: 'queued', title: 'Queued', titleBn: 'তৈরির তালিকা', statusMatch: ['queued'] },
        { id: 'in_fab', title: 'In Fabrication', titleBn: 'তৈরি ও ফিটিং', statusMatch: ['in_progress', 'paused'] },
        { id: 'qc', title: 'Testing and QC', titleBn: 'পরীক্ষা ও যাচাই', statusMatch: ['quality_check', 'rework'] },
        { id: 'completed', title: 'Completed', titleBn: 'সম্পন্ন', statusMatch: ['completed'] },
      ]
    case 'installation':
      return [
        { id: 'scheduled', title: 'Scheduled', titleBn: 'নির্ধারিত', statusMatch: ['queued'] },
        { id: 'en_route', title: 'En Route', titleBn: 'সাইটে রওয়ানা', statusMatch: ['in_progress', 'paused'] },
        { id: 'installing', title: 'Installing', titleBn: 'ফিটিং চলছে', statusMatch: ['quality_check'] },
        { id: 'completed', title: 'Completed', titleBn: 'হস্তান্তর সম্পন্ন', statusMatch: ['completed'] },
      ]
    default:
      return [
        { id: 'queued', title: 'Queued', titleBn: 'অপেক্ষারত', statusMatch: ['queued'] },
        { id: 'in_progress', title: 'In Progress', titleBn: 'চলমান', statusMatch: ['in_progress'] },
        { id: 'quality_check', title: 'Quality Check', titleBn: 'গুণমান যাচাই', statusMatch: ['quality_check', 'rework', 'paused'] },
        { id: 'completed', title: 'Completed', titleBn: 'সম্পন্ন', statusMatch: ['completed'] },
      ]
  }
}

/**
 * Fallback bilingual text helper based on localStorage
 */
export function tBilingual(enText: string, bnText?: string | null): string {
  if (!bnText) return enText
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('printerp_locale')
    if (saved === 'bn') return bnText
    return enText
  }
  return enText
}

/**
 * Canonical Customer ID Formatter across PrintERP
 * Ensures deterministic, professional, non-garbled customer IDs across Directory, Customer 360, CSV, and Modals.
 */
export function formatCustomerIdNo(
  c?: {
    id?: string | null
    customer_id_no?: string | null
    customer_code?: string | null
    [key: string]: any
  } | null,
  index?: number
): string {
  if (!c) {
    return `CUST-${String((index !== undefined ? index + 1 : 1)).padStart(3, '0')}`
  }

  if (c.customer_id_no && typeof c.customer_id_no === 'string' && c.customer_id_no.trim()) {
    return c.customer_id_no.trim()
  }
  if (c.customer_code && typeof c.customer_code === 'string' && c.customer_code.trim()) {
    return c.customer_code.trim()
  }

  if (c.id && typeof c.id === 'string') {
    const idTrimmed = c.id.trim()

    // If prefixed with cust- or cust_ or c- (e.g. cust-01, cust-1, cust-101, c-5, cust-beximco)
    if (/^(?:cust|c)[-_]/i.test(idTrimmed)) {
      const stripped = idTrimmed.replace(/^(?:cust|c)[-_]/i, '')
      if (/^\d+$/.test(stripped)) {
        return `CUST-${stripped.padStart(3, '0')}`
      }
      // Text after prefix (e.g. cust-beximco -> CUST-BEXIMCO)
      const sanitized = stripped.toUpperCase()
      if (sanitized.length <= 15) {
        return `CUST-${sanitized}`
      }
    }

    // Purely numeric string ID (e.g. "1", "42")
    if (/^\d+$/.test(idTrimmed)) {
      return `CUST-${idTrimmed.padStart(3, '0')}`
    }

    // Standard UUID (e.g. 90cd8139-e000-471f-85b3-5bdd07a7a609)
    const uuidClean = idTrimmed.replace(/-/g, '').toUpperCase()
    if (uuidClean.length === 32) {
      return `CUST-${uuidClean.slice(0, 6)}`
    }
  }

  return `CUST-${String((index !== undefined ? index + 1 : 1)).padStart(3, '0')}`
}

