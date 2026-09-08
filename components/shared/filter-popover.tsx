'use client'

import React, { useState } from 'react'
import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'

interface FilterPopoverProps {
  activeFilterCount?: number
  onReset?: () => void
  children: React.ReactNode
}

export function FilterPopover({ activeFilterCount = 0, onReset, children }: FilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useI18n()

  return (
    <div className="relative inline-block text-left">
      <Button
        variant="outline"
        size="default"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Filter className="h-4 w-4 text-slate-500" />
        <span>{t('common.filter')}</span>
        {activeFilterCount > 0 && (
          <Badge variant="default" className="h-5 px-1.5 text-xs bg-blue-600">
            {activeFilterCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl z-40 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 dark:border-slate-800">
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {t('common.filter')}
              </span>
              {activeFilterCount > 0 && onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t('common.reset')}
                </button>
              )}
            </div>
            <div className="space-y-4">{children}</div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end dark:border-slate-800">
              <Button size="sm" onClick={() => setIsOpen(false)}>
                {t('common.apply')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
