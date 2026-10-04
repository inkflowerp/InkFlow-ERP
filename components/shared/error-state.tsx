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
        'flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-danger-border/80 bg-danger-surface/50 p-6 sm:p-8 text-center border-danger-border/40 bg-danger-surface',
 className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive bg-destructive/20 text-destructive mb-3">
        <AlertOctagon className="h-6 w-6"/>
      </div>

      <h3 className="text-base font-bold text-destructive text-destructive mb-1 bangla-text">
        {displayTitle}
      </h3>

      <p className="max-w-md text-xs sm:text-sm text-destructive text-destructive mb-2 leading-relaxed bangla-text">
        {displayMessage}
      </p>

      {errorCode && (
        <span className="tabular-nums text-xs px-2 py-0.5 rounded bg-destructive/60 bg-destructive/60 text-destructive text-destructive mb-4">
 ERROR CODE: {errorCode}
        </span>
      )}

      {onRetry && (
        <Button
 variant="secondary"onClick={onRetry}
 className="border-danger-border border-danger-border text-destructive text-destructive hover:bg-danger-surface dark:hover:bg-destructive/30">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5"/>
          <span>{tBilingual('Retry Operation', 'পুনরায় চেষ্টা করুন')}</span>
        </Button>
      )}
    </div>
  )
}
