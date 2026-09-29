'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  variant?: 'spinner' | 'table' | 'cards' | 'stats' | 'form'
  text?: string
  textBn?: string
  rows?: number
  className?: string
}

export function LoadingState({
  variant = 'spinner',
  text = 'Loading...',
  textBn = 'লোড হচ্ছে...',
  rows = 5,
  className,
}: LoadingStateProps) {
  const { tBilingual } = useI18n()
  const displayText = tBilingual(text, textBn)

  if (variant === 'stats') {
    return (
      <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-2', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-card text-card-foreground border border-border space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div
        className={cn(
          'w-full space-y-3 p-4 rounded-xl bg-card text-card-foreground border border-border shadow-xs',
          className
        )}
      >
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'form') {
    return (
      <div
        className={cn(
          'w-full space-y-4 p-6 rounded-xl bg-card text-card-foreground border border-border shadow-xs max-w-2xl',
          className
        )}
      >
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
        <div className="space-y-3 pt-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    )
  }

  if (variant === 'cards') {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-xl bg-card text-card-foreground border border-border space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48 rounded" />
            <div className="pt-2 flex items-center justify-between border-t border-border">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center space-y-3 p-6 text-muted-foreground',
        className
      )}
    >
      <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
      <span className="text-sm font-medium text-muted-foreground bangla-text">
        {displayText}
      </span>
    </div>
  )
}
