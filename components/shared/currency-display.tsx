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

 const shouldBengaliNumerals = Boolean(useBengaliNumerals)

 const formatted = formatBDT(amount, {
 useBengaliNumerals: shouldBengaliNumerals,
 showDecimals,
  })

 const colorClasses = {
 default: 'text-inherit',
 success: 'text-success text-success font-semibold',
 danger: 'text-destructive text-destructive font-semibold',
 warning: 'text-warning text-warning font-semibold',
 muted: 'text-muted-foreground ',
  }

 return (
    <span className={cn('font-numeric tabular-nums font-semibold inline-block whitespace-nowrap text-inherit', colorClasses[colorVariant], className)}>
      {formatted}
    </span>
  )
}
