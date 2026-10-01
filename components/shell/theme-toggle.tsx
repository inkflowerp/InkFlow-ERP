'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Laptop, Check } from 'lucide-react'
import { useTheme, ThemeMode } from '@/components/providers/theme-provider'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  showDropdown?: boolean
  variant?: 'button' | 'switch'
  size?: 'sm' | 'md'
}

export function ThemeToggle({
  className,
  showDropdown = false,
  variant = 'button',
  size = 'md',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
  const { tBilingual } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Direct pill switch with sliding thumb & Sun/Moon icons (no dropdown)
  if (variant === 'switch') {
    const isDark = mounted ? resolvedTheme === 'dark' : false
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={toggleTheme}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full border border-border bg-muted transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          size === 'sm' ? 'h-7 w-12 p-0.5' : 'h-8 w-14 p-1',
          className
        )}
        title={
          !mounted
            ? tBilingual('Toggle dark/light mode', 'ডার্ক/লাইট মোড পরিবর্তন')
            : isDark
            ? tBilingual('Switch to Light Mode', 'লাইট মোডে পরিবর্তন করুন')
            : tBilingual('Switch to Dark Mode', 'ডার্ক মোডে পরিবর্তন করুন')
        }
        aria-label={tBilingual('Toggle dark/light mode', 'ডার্ক/লাইট মোড পরিবর্তন')}
      >
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-card shadow-xs transition-transform duration-200 ease-in-out',
            size === 'sm' ? 'h-5.5 w-5.5' : 'h-6 w-6',
            isDark ? (size === 'sm' ? 'translate-x-5' : 'translate-x-6') : 'translate-x-0'
          )}
        >
          {!mounted ? (
            <span className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          ) : isDark ? (
            <Moon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5', 'text-blue-400')} />
          ) : (
            <Sun className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5', 'text-amber-500')} />
          )}
        </span>
      </button>
    )
  }

  if (!showDropdown) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'relative rounded-lg border border-border bg-card p-2 text-foreground hover:bg-muted hover:text-foreground cursor-pointer shadow-2xs transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 shrink-0',
          size === 'sm' ? 'h-8 w-8 p-1.5' : 'h-9 w-9',
          className
        )}
        title={
          !mounted
            ? tBilingual('Toggle Theme', 'থিম পরিবর্তন')
            : resolvedTheme === 'dark'
            ? tBilingual('Switch to Light Mode', 'লাইট মোডে পরিবর্তন করুন')
            : tBilingual('Switch to Dark Mode', 'ডার্ক মোডে পরিবর্তন করুন')
        }
        aria-label={tBilingual('Toggle Theme', 'থিম পরিবর্তন')}
      >
        {!mounted ? (
          <span className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', 'inline-block')} />
        ) : resolvedTheme === 'dark' ? (
          <Sun className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', 'text-amber-400 transition-opacity duration-150')} />
        ) : (
          <Moon className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', 'text-foreground transition-opacity duration-150')} />
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
          'relative flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground hover:bg-muted hover:text-foreground cursor-pointer shadow-2xs transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 shrink-0',
          size === 'sm' ? 'h-8 w-8 p-1.5' : 'h-9 w-9',
          className
        )}
        title={tBilingual('Select Theme', 'থিম নির্বাচন করুন')}
        aria-label={tBilingual('Theme menu', 'থিম মেনু')}
      >
        {!mounted ? (
          <span className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', 'inline-block')} />
        ) : resolvedTheme === 'dark' ? (
          <Sun className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', 'text-amber-400')} />
        ) : (
          <Moon className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', 'text-foreground')} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 rounded-xl border border-border bg-popover text-popover-foreground p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
          <div className="px-2 py-1 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
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
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tBilingual(opt.labelEn, opt.labelBn)}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
