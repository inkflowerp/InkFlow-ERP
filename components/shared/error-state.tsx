'use client'

import React from 'react'
import { AlertOctagon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  titleBn?: string
  message: string
  messageBn?: string
  errorCode?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  titleBn = 'একটি সমস্যা দেখা দিয়েছে',
  message,
  messageBn,
  errorCode,
  onRetry,
  className,
}: ErrorStateProps) {
  const { tBilingual } = useI18n()

  const displayTitle = tBilingual(title, titleBn)
  const displayMessage = tBilingual(message, messageBn)

  return (
    <div
      className={cn(
        'flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-rose-200/80 bg-rose-50/40 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/20 backdrop-blur-xs',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 border border-rose-500/30 mb-3 shadow-xs">
        <AlertOctagon className="h-7 w-7" />
      </div>

      <h3 className="text-base font-bold text-rose-900 dark:text-rose-200 mb-1 bangla-text">
        {displayTitle}
      </h3>

      <p className="max-w-md text-xs sm:text-sm text-rose-700 dark:text-rose-400 mb-2 leading-relaxed bangla-text">
        {displayMessage}
      </p>

      {errorCode && (
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 mb-5">
          ERROR CODE: {errorCode}
        </span>
      )}

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="h-9 gap-2 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-800 dark:text-rose-200 rounded-xl font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{tBilingual('Retry Operation', 'পুনরায় চেষ্টা করুন')}</span>
        </Button>
      )}
    </div>
  )
}
