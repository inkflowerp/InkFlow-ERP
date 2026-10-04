'use client'

import * as React from 'react'
import { Input, type InputProps } from './input'
import { cn } from '@/lib/utils'

export interface MoneyInputProps extends Omit<InputProps, 'type'> {
  currencySymbol?: string
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ currencySymbol = '৳', className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="number"
        step="any"
        icon={<span className="text-base font-semibold text-muted-foreground select-none">{currencySymbol}</span>}
        className={cn('tabular-nums font-medium', className)}
        {...props}
      />
    )
  }
)
MoneyInput.displayName = 'MoneyInput'
