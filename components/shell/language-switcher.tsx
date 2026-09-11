'use client'

import React, { useState } from 'react'
import { Languages, Check } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { LOCALES } from '@/i18n/config'
import { LocaleMode } from '@/types/common.types'
import { useOutsideClick } from '@/hooks/use-outside-click'
import { cn } from '@/lib/utils'

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useOutsideClick<HTMLDivElement>(() => setIsOpen(false), isOpen)
  const { locale, setLocale } = useI18n()

  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0]

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
        title="Change Language"
      >
        <Languages className="h-3.5 w-3.5 text-blue-600 shrink-0" />
        <span className="font-semibold whitespace-nowrap bangla-text">{current.labelNative}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-0 zoom-in-95">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Language / ভাষা
          </div>

          <div className="space-y-0.5 my-1">
            {LOCALES.map((l) => {
              const isSelected = l.code === locale
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setLocale(l.code as LocaleMode)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer',
                    isSelected && 'bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 font-semibold'
                  )}
                >
                  <span>{l.labelNative} ({l.label})</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
