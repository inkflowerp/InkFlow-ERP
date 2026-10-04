'use client'

import React, { useEffect } from 'react'
import { AlertOctagon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

interface InventoryErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function InventoryError({ error, reset }: InventoryErrorProps) {
  const { tBilingual } = useI18n()

  useEffect(() => {
    console.error('Inventory Hub Error Boundary:', error)
  }, [error])

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center my-6 max-w-xl mx-auto space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/20 text-destructive border border-destructive/30 shadow-xs">
        <AlertOctagon className="h-7 w-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-destructive bangla-text">
          {tBilingual('Inventory Feed Interrupted', 'ইনভেন্টরি ডেটা লোড করতে সমস্যা দেখা দিয়েছে')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed bangla-text">
          {tBilingual(
            error.message || 'Unable to load warehouse materials, rolls, and stock ledger. Please retry.',
            'ওয়্যারহাউস কাঁচামাল, রোল স্টক ও খতিয়ান লোড করার সময় সাময়িক ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন।'
          )}
        </p>
      </div>

      {error.digest && (
        <div className="px-3 py-1.5 rounded-lg bg-surface-inset border border-border text-xs font-mono text-muted-foreground select-all tabular-nums">
          Request ID: {error.digest}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          type="button"
          onClick={() => reset()}
          className="h-10 px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer min-h-11"
        >
          <RefreshCw className="h-4 w-4" />
          <span>{tBilingual('Retry Inventory', 'পুনরায় লোড')}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload()
            }
          }}
          className="h-10 px-4 border-input hover:bg-muted text-foreground font-semibold cursor-pointer min-h-11"
        >
          <span>{tBilingual('Hard Refresh', 'সম্পূর্ণ রিলোড')}</span>
        </Button>
      </div>
    </div>
  )
}
