'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Laptop, Check } from 'lucide-react'
import { useTheme, ThemeMode } from '@/components/providers/theme-provider'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  showDropdown?: boolean
  size?: 'sm' | 'md'
}

export function ThemeToggle({ className, showDropdown = false, size = 'md' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
  const { tBilingual } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle outside click for dropdown
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const themeOptions: Array<{ mode: ThemeMode; labelEn: string; labelBn: string; icon: React.ElementType }> = [
    { mode: 'light', labelEn: 'Light', labelBn: 'লাইট', icon: Sun },
    { mode: 'dark', labelEn: 'Dark', labelBn: 'ডার্ক', icon: Moon },
    { mode: 'system', labelEn: 'System', labelBn: 'সিস্টেম', icon: Laptop },
  ]

  if (!showDropdown) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400 cursor-pointer shadow-2xs transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500/40 active:scale-95 shrink-0',
          size === 'sm' ? 'h-8 w-8 p-1.5' : 'h-9 w-9',
          className
        )}
        title={
          resolvedTheme === 'dark'
            ? tBilingual('Switch to Light Mode', 'লাইট মোডে পরিবর্তন করুন')
            : tBilingual('Switch to Dark Mode', 'ডার্ক মোডে পরিবর্তন করুন')
        }
        aria-label={tBilingual('Toggle Theme', 'থিম পরিবর্তন')}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', 'text-amber-400 transition-transform duration-200 hover:rotate-45')} />
        ) : (
          <Moon className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', 'text-slate-600 dark:text-slate-300 transition-transform duration-200 hover:-rotate-12')} />
        )}
      </button>
    )
  }

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400 cursor-pointer shadow-2xs transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500/40 active:scale-95 shrink-0',
          size === 'sm' ? 'h-8 w-8 p-1.5' : 'h-9 w-9',
          className
        )}
        title={tBilingual('Select Theme', 'থিম নির্বাচন করুন')}
        aria-label={tBilingual('Theme menu', 'থিম মেনু')}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', 'text-amber-400')} />
        ) : (
          <Moon className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', 'text-slate-600 dark:text-slate-300')} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-0 zoom-in-95">
          <div className="px-2 py-1 text-2xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {tBilingual('Theme', 'থিম')}
          </div>
          <div className="space-y-0.5">
            {themeOptions.map((opt) => {
              const Icon = opt.icon
              const isSelected = theme === opt.mode
              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => {
                    setTheme(opt.mode)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tBilingual(opt.labelEn, opt.labelBn)}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
