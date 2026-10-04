'use client'

import * as React from 'react'
import { Calendar } from 'lucide-react'
import { Input, type InputProps } from './input'
import { cn } from '@/lib/utils'

export type DatePickerProps = Omit<InputProps, 'type'>

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="date"
        icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        className={cn('tabular-nums font-medium', className)}
        {...props}
      />
    )
  }
)
DatePicker.displayName = 'DatePicker'
