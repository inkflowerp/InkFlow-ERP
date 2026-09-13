'use client'

import React from 'react'
import { Languages } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { LOCALES } from '@/i18n/config'
import { LocaleMode } from '@/types/common.types'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  className?: string
  showIcon?: boolean
  compact?: boolean
}

export function LanguageSwitcher({
  className,
  showIcon = true,
  compact = false,
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n()

  return (
    <div
      role="radiogroup"
      aria-label="Language switch / ভাষা পরিবর্তন"
      className={cn(
        'inline-flex items-center gap-0.5 p-1 rounded-xl border border-slate-200/90 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/80 shadow-2xs shrink-0 select-none backdrop-blur-xs',
        className
      )}
    >
      {showIcon && (
        <div className="flex items-center justify-center pl-1.5 pr-1 text-slate-400 dark:text-slate-500">
          <Languages className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        </div>
      )}
      {LOCALES.map((l) => {
        const isActive = locale === l.code
        return (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setLocale(l.code as LocaleMode)}
            className={cn(
              'relative flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[28px]',
              isActive
                ? 'bg-white text-blue-600 font-bold shadow-xs border border-slate-200/80 dark:border-slate-700/80 dark:bg-slate-800 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
            )}
            title={l.label}
          >
            <span className={l.code === 'bn' ? 'bangla-text' : ''}>
              {compact ? (l.code === 'bn' ? 'বাং' : 'EN') : l.labelNative}
            </span>
          </button>
        )
      })}
    </div>
  )
}

