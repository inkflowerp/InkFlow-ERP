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
  size?: 'sm' | 'md'
}

export function LanguageSwitcher({
  className,
  showIcon = true,
  compact = false,
  size = 'md',
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n()

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'bn' : 'en')
  }

  return (
    <div
      role="radiogroup"
      aria-label="Language switch / ভাষা পরিবর্তন"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl border border-slate-200/90 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/80 shadow-2xs shrink-0 select-none backdrop-blur-xs',
        size === 'sm' ? 'p-0.5' : 'p-0.5 sm:p-1',
        className
      )}
    >
      {showIcon && (
        <button
          type="button"
          onClick={toggleLanguage}
          title={locale === 'en' ? 'Switch to বাংলা (1-click)' : 'Switch to English (1-click)'}
          className="flex items-center justify-center pl-1 sm:pl-1.5 pr-0.5 text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 cursor-pointer transition-colors"
          aria-label="Toggle language"
        >
          <Languages className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        </button>
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
              'relative flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap',
              size === 'sm'
                ? 'px-2 py-0.5 min-h-[24px]'
                : 'px-2 sm:px-2.5 py-1 min-h-[26px] sm:min-h-[28px]',
              isActive
                ? 'bg-white text-blue-600 font-bold shadow-xs border border-slate-200/80 dark:border-slate-700/80 dark:bg-slate-800 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
            )}
            title={l.label}
          >
            <span className={l.code === 'bn' ? 'bangla-text' : ''}>
              {compact ? (
                l.code === 'bn' ? 'বাং' : 'EN'
              ) : (
                <>
                  <span className="inline sm:hidden">{l.code === 'bn' ? 'বাং' : 'EN'}</span>
                  <span className="hidden sm:inline">{l.labelNative}</span>
                </>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}


