import React from 'react'
import { formatDate } from '@/lib/formatters'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

interface DateDisplayProps {
  date: string | Date | null | undefined
  className?: string
  options?: Intl.DateTimeFormatOptions
}

export function DateDisplay({ date, className, options }: DateDisplayProps) {
  const { locale } = useI18n()

  if (!date) {
    return <span className="text-slate-400">-</span>
  }

  const formatted = formatDate(date, locale, options)

  return (
    <span className={cn('text-sm text-slate-700 dark:text-slate-300', className)}>
      {formatted}
    </span>
  )
}
