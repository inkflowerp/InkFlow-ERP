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
 variant?: 'subtle' | 'gradient'
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
 variant = 'subtle',
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
        'bg-card text-card-foreground p-5 sm:p-6 rounded-xl border border-border shadow-xs relative',
 className
      )}
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-[280px] max-w-full lg:max-w-2xl xl:max-w-3xl shrink-0 lg:shrink flex-1">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div
 className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center shrink-0">
                {React.isValidElement(icon) ? (
 icon
                ) : (
 React.createElement(icon as React.ComponentType<{ className?: string }>, {
 className: cn('h-5 w-5', iconColor || 'text-blue-600 dark:text-blue-400'),
                  })
                )}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 flex-wrap">
                <span className="bangla-text">{title}</span>
                {badge}
              </h1>
              {description && (
                <p className="text-xs sm:text-sm text-muted-foreground bangla-text mt-0.5">
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

