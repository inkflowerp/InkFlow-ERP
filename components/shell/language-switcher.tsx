'use client'

import React from 'react'
import { Globe2 } from 'lucide-react'
import { useI18n } from '@/i18n/context'
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
  size = 'md',
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n()

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'bn' : 'en')
  }

  const isBn = locale === 'bn'

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      title={isBn ? 'Switch to English (1-click)' : 'বাংলায় পরিবর্তন করুন (১-ক্লিক)'}
      aria-label={isBn ? 'Switch to English' : 'Switch to Bangla'}
      className={cn(
        'group inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-100/80 hover:border-slate-300 text-slate-900',
        'dark:border-slate-800 dark:bg-slate-900/90 dark:hover:bg-slate-800 dark:hover:border-slate-700 dark:text-white',
        'shadow-2xs cursor-pointer select-none transition-all active:scale-95 shrink-0 whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-1 min-h-[30px] text-xs' : 'px-3 py-1.5 min-h-[36px] text-xs sm:text-sm',
        className
      )}
    >
      {showIcon && (
        <Globe2 className="h-4 w-4 text-cyan-500 dark:text-cyan-400 shrink-0 transition-transform group-hover:rotate-12 duration-200" />
      )}
      <span className={cn('font-bold tracking-tight', isBn && 'bangla-text text-xs sm:text-sm')}>
        {isBn ? 'বাং' : 'EN'}
      </span>
    </button>
  )
}



