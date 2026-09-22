'use client'

// ==============================================================================
// PrintERP SaaS - Modern PageHeader Component
// Strictly implements bilingual rendering, icon container accents, and responsive layout
// ==============================================================================

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  titleEn: string
  titleBn: string
  descriptionEn?: string
  descriptionBn?: string
  icon?: LucideIcon | React.ReactNode
  iconColor?: string
  actions?: React.ReactNode
  badge?: React.ReactNode
  className?: string
}

export function PageHeader({
  titleEn,
  titleBn,
  descriptionEn,
  descriptionBn,
  icon,
  iconColor = 'text-blue-600 dark:text-blue-400',
  actions,
  badge,
  className,
}: PageHeaderProps) {
  const { tBilingual } = useI18n()

  const title = tBilingual(titleEn, titleBn)
  const description =
    descriptionEn && descriptionBn
      ? tBilingual(descriptionEn, descriptionBn)
      : descriptionEn || descriptionBn

  return (
    <div
      className={cn(
        'flex flex-col lg:flex-row lg:items-start xl:items-center justify-between gap-4 pb-1',
        className
      )}
    >
      <div className="space-y-1 min-w-[280px] max-w-full lg:max-w-xl xl:max-w-2xl shrink-0 lg:shrink flex-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          {icon && (
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 flex items-center justify-center shrink-0 shadow-xs">
              {React.isValidElement(icon) ? (
                icon
              ) : typeof icon === 'function' ? (
                React.createElement(icon as any, { className: cn('h-5 w-5', iconColor) })
              ) : null}
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white bangla-text">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 bangla-text leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto justify-start lg:justify-end shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
