'use client'

import React, { useEffect } from 'react'
import { AlertOctagon, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

interface DashboardErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  const { tBilingual } = useI18n()

  useEffect(() => {
    console.error('Dashboard Route Error Boundary:', error)
  }, [error])

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center my-6 max-w-xl mx-auto space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/20 text-destructive border border-destructive/30 shadow-xs">
        <AlertOctagon className="h-7 w-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-destructive bangla-text">
          {tBilingual('Dashboard Feed Interrupted', 'ড্যাশবোর্ড লোড করতে সমস্যা দেখা দিয়েছে')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed bangla-text">
          {tBilingual(
            error.message || 'Real-time live operational snapshot was temporarily interrupted. You can retry the feed or check connection.',
            'লাইভ ড্যাশবোর্ড ডেটা লোড করার সময় সাময়িক ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন।'
          )}
        </p>
      </div>

      {error.digest && (
        <div className="px-3 py-1.5 rounded-lg bg-surface-inset border border-border text-xs font-mono text-muted-foreground select-all tabular-nums">
          Request ID / Digest: {error.digest}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          type="button"
          onClick={() => reset()}
          className="h-10 px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer min-h-[44px]"
        >
          <RefreshCw className="h-4 w-4" />
          <span>{tBilingual('Retry Feed', 'পুনরায় লোড করুন')}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload()
            }
          }}
          className="h-10 px-4 gap-2 bg-card border-border hover:bg-card-elevated text-foreground font-semibold cursor-pointer min-h-[44px]"
        >
          <Home className="h-4 w-4" />
          <span>{tBilingual('Reload System', 'রিলোড করুন')}</span>
        </Button>
      </div>
    </div>
  )
}
