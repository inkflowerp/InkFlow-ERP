'use client'

import React, { useEffect } from 'react'
import { AlertOctagon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

interface DesignerErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DesignerError({ error, reset }: DesignerErrorProps) {
  const { tBilingual } = useI18n()

  useEffect(() => {
    console.error('Designer Workbench Error Boundary:', error)
  }, [error])

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center my-6 max-w-md mx-auto space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/20 text-destructive border border-destructive/30 shadow-xs">
        <AlertOctagon className="h-7 w-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-destructive bangla-text">
          {tBilingual('Designer Workbench Interrupted', 'ডিজাইনার টার্মিনালে সমস্যা দেখা দিয়েছে')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed bangla-text">
          {tBilingual(
            error.message || 'Unable to sync designer workbench tasks. Please retry.',
            'ডিজাইনার টার্মিনাল টাস্ক সিঙ্ক করতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।'
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
          className="h-11 px-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer min-h-11 text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          <span>{tBilingual('Retry Workbench', 'পুনরায় চেষ্টা')}</span>
        </Button>
      </div>
    </div>
  )
}
