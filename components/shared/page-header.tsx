'use client'

// ==============================================================================
// PrintERP SaaS - PageHeader Component
// Strictly implements:
// - If English ('en') => All English
// - If Bangla ('bn')  => All Bangla
// ==============================================================================

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { useI18n } from '@/i18n/context'

interface PageHeaderProps {
  titleEn: string
  titleBn: string
  descriptionEn?: string
  descriptionBn?: string
  icon?: LucideIcon
  iconColor?: string
  actions?: React.ReactNode
  badge?: React.ReactNode
}

export function PageHeader({
  titleEn,
  titleBn,
  descriptionEn,
  descriptionBn,
  icon: Icon,
  iconColor = 'text-blue-600',
  actions,
  badge,
}: PageHeaderProps) {
  const { tBilingual } = useI18n()

  const title = tBilingual(titleEn, titleBn)
  const description = descriptionEn && descriptionBn
    ? tBilingual(descriptionEn, descriptionBn)
    : (descriptionEn || descriptionBn)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5 bangla-text">
          {Icon && <Icon className={`h-6 w-6 ${iconColor}`} />}
          <span>{title}</span>
        </h1>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl bangla-text leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {(actions || badge) && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-start sm:justify-end shrink-0">
          {badge}
          {actions}
        </div>
      )}
    </div>
  )
}
