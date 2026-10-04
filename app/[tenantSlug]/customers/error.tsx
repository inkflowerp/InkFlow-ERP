'use client'

import React, { useEffect } from 'react'
import { AlertOctagon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

interface CustomersErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function CustomersError({ error, reset }: CustomersErrorProps) {
  const { tBilingual } = useI18n()

  useEffect(() => {
    console.error('Customers Route Error Boundary:', error)
  }, [error])

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center my-6 max-w-xl mx-auto space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/20 text-destructive border border-destructive/30 shadow-xs">
        <AlertOctagon className="h-7 w-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-destructive bangla-text">
          {tBilingual('Customer Directory Feed Interrupted', 'গ্রাহক তালিকা ও হিসাব তথ্য লোড করতে সমস্যা দেখা দিয়েছে')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed bangla-text">
          {tBilingual(
            error.message || 'Unable to load customer directory and ledger balances. Please retry.',
            'গ্রাহক ডিরেক্টরি ও খতিয়ান ব্যালেন্স লোড করার সময় সাময়িক ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন।'
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
          <span>{tBilingual('Retry Directory Feed', 'পুনরায় লোড')}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload()
            }
          }}
          className="h-10 px-4 border-border text-foreground hover:bg-muted font-medium cursor-pointer min-h-11"
        >
          <span>{tBilingual('Full Refresh', 'সম্পূর্ণ রিফ্রেশ')}</span>
        </Button>
      </div>
    </div>
  )
}
