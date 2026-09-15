// ==============================================================================
// InkFlow ERP - Centralized Business Date & Bangladesh Timezone Helper (V9.1)
// Canonical timezone: Asia/Dhaka (UTC+6)
// Provides consistent business-day boundaries, relative dates, overdue calculations,
// and bilingual greetings for all business-sensitive operational calculations.
// ==============================================================================

export const BANGLADESH_TIMEZONE = 'Asia/Dhaka'

/**
 * Returns today's date string in Bangladesh timezone (YYYY-MM-DD)
 */
export function getBangladeshTodayDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGLADESH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

/**
 * Returns yesterday's date string in Bangladesh timezone (YYYY-MM-DD)
 */
export function getBangladeshYesterdayDateString(): string {
  const now = new Date()
  // Step back 24 hours
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGLADESH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(yesterday)
}

/**
 * Converts any date or ISO string into a Bangladesh timezone YYYY-MM-DD string
 */
export function toBangladeshDateString(dateInput?: string | Date | null): string {
  if (!dateInput) return getBangladeshTodayDateString()
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return getBangladeshTodayDateString()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: BANGLADESH_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(d)
  } catch {
    return getBangladeshTodayDateString()
  }
}

/**
 * Checks if a given timestamp or date string falls within Bangladesh "today"
 */
export function isBangladeshToday(dateInput?: string | Date | null): boolean {
  if (!dateInput) return false
  const targetDateStr = toBangladeshDateString(dateInput)
  return targetDateStr === getBangladeshTodayDateString()
}

/**
 * Checks if a given timestamp or date string falls within Bangladesh "yesterday"
 */
export function isBangladeshYesterday(dateInput?: string | Date | null): boolean {
  if (!dateInput) return false
  const targetDateStr = toBangladeshDateString(dateInput)
  return targetDateStr === getBangladeshYesterdayDateString()
}

/**
 * Formats a date for UI display in Bangladesh timezone
 */
export function formatBangladeshDate(
  dateInput?: string | Date | null,
  locale: 'en' | 'bn' = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '—'
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', {
      timeZone: BANGLADESH_TIMEZONE,
      weekday: options?.weekday ?? 'short',
      month: options?.month ?? 'short',
      day: options?.day ?? 'numeric',
      year: options?.year ?? 'numeric',
      ...options,
    })
  } catch {
    return '—'
  }
}

/**
 * Returns contextual time greeting based on current hour in Dhaka
 */
export function getBangladeshGreeting(locale: 'en' | 'bn' = 'en'): { en: string; bn: string } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: BANGLADESH_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    })
    const hour = parseInt(formatter.format(new Date()), 10)

    if (hour >= 5 && hour < 12) {
      return { en: 'Good morning', bn: 'শুভ সকাল' }
    } else if (hour >= 12 && hour < 17) {
      return { en: 'Good afternoon', bn: 'শুভ অপরাহ্ন' }
    } else if (hour >= 17 && hour < 21) {
      return { en: 'Good evening', bn: 'শুভ সন্ধ্যা' }
    } else {
      return { en: 'Good night', bn: 'শুভ রাত্রি' }
    }
  } catch {
    return { en: 'Welcome back', bn: 'স্বাগতম' }
  }
}

/**
 * Calculates days difference between two dates
 * Positive value indicates dateA is after dateB (or overdue if dateB is dueDate and dateA is today)
 */
export function calculateDaysOverdue(dueDateStr?: string | null, asOfDateStr?: string | null): number {
  if (!dueDateStr) return 0
  const todayStr = asOfDateStr || getBangladeshTodayDateString()
  try {
    const due = new Date(dueDateStr)
    const today = new Date(todayStr)
    const diffTime = today.getTime() - due.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  } catch {
    return 0
  }
}

/**
 * Returns an array of past N days as YYYY-MM-DD strings in Bangladesh timezone
 */
export function getBangladeshDateRange(daysCount: number = 7): Array<{ dateStr: string; labelEn: string; labelBn: string; dayOfWeek: string }> {
  const result: Array<{ dateStr: string; labelEn: string; labelBn: string; dayOfWeek: string }> = []
  const today = new Date()

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = toBangladeshDateString(d)
    const dayOfWeek = d.toLocaleDateString('en-US', { timeZone: BANGLADESH_TIMEZONE, weekday: 'short' })
    const labelEn = d.toLocaleDateString('en-US', { timeZone: BANGLADESH_TIMEZONE, month: 'short', day: 'numeric' })
    const labelBn = d.toLocaleDateString('bn-BD', { timeZone: BANGLADESH_TIMEZONE, month: 'short', day: 'numeric' })

    result.push({
      dateStr,
      labelEn,
      labelBn,
      dayOfWeek,
    })
  }

  return result
}

/**
 * Formats time for UI display in Bangladesh timezone (Asia/Dhaka)
 */
export function formatBangladeshTime(
  dateInput: Date = new Date(),
  locale: 'en' | 'bn' = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    return dateInput.toLocaleTimeString(locale === 'bn' ? 'bn-BD' : 'en-US', {
      timeZone: BANGLADESH_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...options,
    })
  } catch {
    return ''
  }
}
