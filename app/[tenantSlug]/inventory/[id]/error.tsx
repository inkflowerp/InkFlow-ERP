'use client'

import React, { useEffect } from 'react'
import { AlertOctagon, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

interface MaterialErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function MaterialDetailError({ error, reset }: MaterialErrorProps) {
  const { tBilingual } = useI18n()

  useEffect(() => {
    console.error('Material Detail Error Boundary:', error)
  }, [error])

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center my-6 max-w-xl mx-auto space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/20 text-destructive border border-destructive/30 shadow-xs">
        <AlertOctagon className="h-7 w-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-destructive bangla-text">
          {tBilingual('Material Profile Unavailable', 'কাঁচামাল বিবরণ লোড করতে সমস্যা হয়েছে')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed bangla-text">
          {tBilingual(
            error.message || 'Unable to retrieve material stock balance and ledger. Please retry.',
            'কাঁচামালের বর্তমান স্টক এবং লেজার হিস্ট্রি লোড করা সম্ভব হয়নি। পুনরায় চেষ্টা করুন।'
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
          <span>{tBilingual('Retry', 'পুনরায় লোড')}</span>
        </Button>

        <Link href="../">
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4 gap-2 border-input hover:bg-muted text-foreground font-semibold cursor-pointer min-h-11"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{tBilingual('Back to Inventory', 'ইনভেন্টরিতে ফিরুন')}</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
