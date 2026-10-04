'use client'

import * as React from 'react'
import { Phone } from 'lucide-react'
import { Input, type InputProps } from './input'
import { cn } from '@/lib/utils'

export interface PhoneInputProps extends Omit<InputProps, 'type'> {
  countryCode?: string
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ countryCode = '+880', className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="tel"
        icon={<Phone className="h-4 w-4 text-muted-foreground" />}
        className={cn('tabular-nums font-medium', className)}
        placeholder="1712-345678"
        {...props}
      />
    )
  }
)
PhoneInput.displayName = 'PhoneInput'
