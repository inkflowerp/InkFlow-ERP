'use client'

// ==============================================================================
// PrintERP SaaS - Modern PageHeader Component
// Strictly implements the reference card styling from Quotations & Billing
// Featuring premium gradient background, subtle ambient glows, squircle icon gradient,
// bold typography, bilingual title & subtitle, optional badge, and responsive actions
// ==============================================================================

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
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
  iconColor,
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
        'bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-800/40 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden',
        className
      )}
    >
      {/* Subtle decorative glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-[280px] max-w-full lg:max-w-2xl xl:max-w-3xl shrink-0 lg:shrink flex-1">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0">
                {React.isValidElement(icon) ? (
                  icon
                ) : (
                  React.createElement(icon as any, {
                    className: cn('h-5 w-5', iconColor || 'text-white'),
                  })
                )}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span className="bangla-text">{title}</span>
                {badge}
              </h1>
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 bangla-text mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

