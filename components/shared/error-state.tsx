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
        'flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/50 p-6 sm:p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20',
 className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 mb-3">
        <AlertOctagon className="h-6 w-6"/>
      </div>

      <h3 className="text-base font-bold text-rose-900 dark:text-rose-200 mb-1 bangla-text">
        {displayTitle}
      </h3>

      <p className="max-w-md text-xs sm:text-sm text-rose-700 dark:text-rose-400 mb-2 leading-relaxed bangla-text">
        {displayMessage}
      </p>

      {errorCode && (
        <span className="tabular-nums text-2xs px-2 py-0.5 rounded bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 mb-4">
 ERROR CODE: {errorCode}
        </span>
      )}

      {onRetry && (
        <Button
 variant="secondary"onClick={onRetry}
 className="border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5"/>
          <span>{tBilingual('Retry Operation', 'পুনরায় চেষ্টা করুন')}</span>
        </Button>
      )}
    </div>
  )
}
