'use client'

import React from 'react'
import { FolderOpen, LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  titleBn?: string
  description?: string
  descriptionBn?: string
  actionLabel?: string
  actionLabelBn?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  titleBn,
  description,
  descriptionBn,
  actionLabel,
  actionLabelBn,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  const { locale, tBilingual } = useI18n()

  const displayTitle = tBilingual(title, titleBn)
  const displayDesc = description ? tBilingual(description, descriptionBn) : undefined
  const displayAction = actionLabel ? tBilingual(actionLabel, actionLabelBn) : undefined

  return (
    <div
      className={cn(
        'flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/80 bg-white/70 p-8 text-center dark:border-slate-800/80 dark:bg-slate-900/40 backdrop-blur-xs',
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/15 border border-indigo-500/20 mb-4 shadow-xs">
        <Icon className="h-8 w-8" />
      </div>

      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 bangla-text">
        {displayTitle}
      </h3>

      {displayDesc && (
        <p className="max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed bangla-text">
          {displayDesc}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {displayAction && onAction && (
          <Button
            onClick={onAction}
            size="default"
            className="h-10 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
          >
            {displayAction}
          </Button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <Button
            onClick={onSecondaryAction}
            variant="outline"
            size="default"
            className="h-10 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
          >
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
