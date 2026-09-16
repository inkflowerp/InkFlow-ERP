'use client'

import React from 'react'
import { formatBDT } from '@/lib/formatters'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

interface CurrencyDisplayProps {
  amount: number
  showDecimals?: boolean
  useBengaliNumerals?: boolean
  className?: string
  colorVariant?: 'default' | 'success' | 'danger' | 'warning' | 'muted'
}

export function CurrencyDisplay({
  amount,
  showDecimals = true,
  useBengaliNumerals,
  className,
  colorVariant = 'default',
}: CurrencyDisplayProps) {
  const { locale } = useI18n()

  const shouldBengaliNumerals =
    useBengaliNumerals !== undefined ? useBengaliNumerals : locale === 'bn'

  const formatted = formatBDT(amount, {
    useBengaliNumerals: shouldBengaliNumerals,
    showDecimals,
  })

  const colorClasses = {
    default: 'text-inherit',
    success: 'text-emerald-600 dark:text-emerald-400 font-semibold',
    danger: 'text-rose-600 dark:text-rose-400 font-semibold',
    warning: 'text-amber-600 dark:text-amber-400 font-semibold',
    muted: 'text-slate-500 dark:text-slate-400',
  }

  return (
    <span className={cn('font-numeric tabular-nums font-semibold inline-block whitespace-nowrap text-inherit', colorClasses[colorVariant], className)}>
      {formatted}
    </span>
  )
}
