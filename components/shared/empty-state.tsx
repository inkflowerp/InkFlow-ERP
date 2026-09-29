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
        'flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 p-6 sm:p-8 text-center',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-3">
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="text-base font-bold text-foreground mb-1 bangla-text">
        {displayTitle}
      </h3>

      {displayDesc && (
        <p className="max-w-sm text-xs sm:text-sm text-muted-foreground mb-4 leading-relaxed bangla-text">
          {displayDesc}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {displayAction && onAction && (
          <Button onClick={onAction}>
            {displayAction}
          </Button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <Button onClick={onSecondaryAction} variant="secondary">
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
