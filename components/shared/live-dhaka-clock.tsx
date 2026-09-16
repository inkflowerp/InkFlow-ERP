'use client'

import React, { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { toBengaliNumerals } from '@/lib/formatters'

export interface LiveDhakaClockProps {
  className?: string
  timeClassName?: string
  iconClassName?: string
  showSeconds?: boolean
  showIcon?: boolean
}

/**
 * Hydration-safe live clock operating strictly in Asia/Dhaka (UTC+6)
 */
export function LiveDhakaClock({
  className = 'inline-flex items-center gap-1.5 font-numeric tabular-nums text-xs font-semibold text-slate-600 dark:text-slate-300',
  timeClassName,
  iconClassName = 'h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0',
  showSeconds = true,
  showIcon = true,
}: LiveDhakaClockProps) {
  const { locale } = useI18n()
  const [timeString, setTimeString] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const updateTime = () => {
      try {
        const now = new Date()
        const formatted = now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Dhaka',
          hour: '2-digit',
          minute: '2-digit',
          ...(showSeconds ? { second: '2-digit' } : {}),
          hour12: true,
        })
        setTimeString(formatted)
      } catch {
        // Fallback gracefully
      }
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [locale, showSeconds])

  return (
    <span className={className} suppressHydrationWarning>
      {showIcon && <Clock className={iconClassName} />}
      <span className={timeClassName} suppressHydrationWarning>
        {mounted && timeString ? timeString : '--:--:-- --'}
      </span>
    </span>
  )
}
