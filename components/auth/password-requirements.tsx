'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toBengaliNumerals } from '@/lib/formatters'

export interface PasswordRequirementsProps {
  password?: string
  locale?: string
  className?: string
}

export function PasswordRequirements({
  password = '',
  locale = 'en',
  className,
}: PasswordRequirementsProps) {
  const hasMinLength = password.length >= 8
  const hasSmallLetter = /[a-z]/.test(password)
  const hasCapitalLetter = /[A-Z]/.test(password)
  const hasNumberOrSymbol = /[0-9]|[^A-Za-z0-9]/.test(password)

  const rules = [
    {
      id: 'length',
      label: locale === 'bn' ? 'কমপক্ষে ৮টি অক্ষর' : 'At least 8 characters',
      met: hasMinLength,
    },
    {
      id: 'small',
      label: locale === 'bn' ? 'কমপক্ষে একটি ছোট হাতের অক্ষর' : 'At least one small letter',
      met: hasSmallLetter,
    },
    {
      id: 'capital',
      label: locale === 'bn' ? 'কমপক্ষে একটি বড় হাতের অক্ষর' : 'At least one capital letter',
      met: hasCapitalLetter,
    },
    {
      id: 'number_symbol',
      label: locale === 'bn' ? 'কমপক্ষে একটি সংখ্যা বা প্রতীক' : 'At least one number or symbol',
      met: hasNumberOrSymbol,
    },
  ]

  const metCount = rules.filter((r) => r.met).length
  const strengthPercent = password.length === 0 ? 0 : Math.round((metCount / rules.length) * 100)

  // Color classes conforming strictly to AGENTS.md design tokens
  let barColorClass = 'bg-destructive'

  if (strengthPercent <= 25) {
    barColorClass = 'bg-destructive'
  } else if (strengthPercent <= 75) {
    barColorClass = 'bg-warning'
  } else {
    barColorClass = 'bg-success'
  }

  const formattedPercent = locale === 'bn' ? toBengaliNumerals(strengthPercent) : strengthPercent

  return (
    <div className={cn('pt-1 space-y-2 select-none', className)}>
      {/* Password Strength Label & Progress Meter */}
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">
          <span>
            {locale === 'bn'
              ? `পাসওয়ার্ডের শক্তি: ${formattedPercent}%`
              : `Password strength: ${formattedPercent}%`}
          </span>
        </div>
        <div className="h-0.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', barColorClass)}
            style={{ width: strengthPercent === 0 ? '1.5%' : `${strengthPercent}%` }}
          />
        </div>
      </div>

      {/* 4 Requirements Checklist */}
      <div className="space-y-1 pt-0.5">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors duration-150',
              rule.met ? 'text-success font-medium' : 'text-foreground'
            )}
          >
            <Check
              className={cn(
                'h-3.5 w-3.5 shrink-0 transition-colors duration-150',
                rule.met
                  ? 'text-success stroke-[3]'
                  : 'text-foreground stroke-[2.5]'
              )}
            />
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
