'use client'

import React from 'react'
import { formatDate, formatTime, formatDateTime, APP_TIMEZONE } from '@/lib/formatters'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

export interface DateDisplayProps {
  date: string | Date | null | undefined
  className?: string
  options?: Intl.DateTimeFormatOptions
  timeZone?: string
  fallback?: string
}

export function DateDisplay({
  date,
  className,
  options,
  timeZone = APP_TIMEZONE,
  fallback = '—',
}: DateDisplayProps) {
  const { locale } = useI18n()

  if (!date) {
    return <span className="text-slate-400">{fallback}</span>
  }

  const formatted = formatDate(date, locale, options, timeZone)

  return (
    <span
      suppressHydrationWarning
      className={cn('text-sm text-slate-700 dark:text-slate-300 font-numeric', className)}
    >
      {formatted}
    </span>
  )
}

export function TimeDisplay({
  date,
  className,
  options,
  timeZone = APP_TIMEZONE,
  fallback = '—',
}: DateDisplayProps) {
  const { locale } = useI18n()

  if (!date) {
    return <span className="text-slate-400">{fallback}</span>
  }

  const formatted = formatTime(date, locale, options, timeZone)

  return (
    <span
      suppressHydrationWarning
      className={cn('text-sm text-slate-700 dark:text-slate-300 font-mono', className)}
    >
      {formatted}
    </span>
  )
}

export function DateTimeDisplay({
  date,
  className,
  options,
  timeZone = APP_TIMEZONE,
  fallback = '—',
}: DateDisplayProps) {
  const { locale } = useI18n()

  if (!date) {
    return <span className="text-slate-400">{fallback}</span>
  }

  const formatted = formatDateTime(date, locale, options, timeZone)

  return (
    <span
      suppressHydrationWarning
      className={cn('text-sm text-slate-700 dark:text-slate-300 font-numeric', className)}
    >
      {formatted}
    </span>
  )
}
