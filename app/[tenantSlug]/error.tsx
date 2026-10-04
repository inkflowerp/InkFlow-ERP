'use client'

import React, { useEffect } from 'react'
import { AlertOctagon, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useI18n } from '@/i18n/context'

interface ErrorProps {
 error: Error & { digest?: string }
 reset: () => void
}

export default function TenantError({ error, reset }: ErrorProps) {
 const { tBilingual } = useI18n()

 useEffect(() => {
 console.error('Tenant Route Error:', error)
  }, [error])

 return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-danger-border/80 bg-danger-surface/40 p-8 text-center border-danger-border/50 bg-danger-surface my-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10 text-destructive bg-destructive/20 border border-danger-border/30 mb-4 shadow-xs">
        <AlertOctagon className="h-7 w-7"/>
      </div>

      <h2 className="text-lg font-bold text-destructive text-destructive mb-1 bangla-text">
        {tBilingual('Operational View Encountered an Error', 'পেজ লোড করতে সমস্যা দেখা দিয়েছে')}
      </h2>

      <p className="max-w-md text-xs sm:text-sm text-destructive text-destructive mb-2 leading-relaxed bangla-text">
        {tBilingual(
 error.message || 'An unexpected error occurred while processing this operational view.',
          'তথ্য লোড করার সময় অপ্রত্যাশিত ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন।'
        )}
      </p>

      {error.digest && (
        <p className="text-xs tabular-nums text-destructive/80 text-destructive/80 mb-5">
 Error Digest: {error.digest}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
 variant="outline"onClick={() => reset()}
 className="h-10 px-4 gap-2 bg-card border-danger-border border-danger-border text-destructive text-destructive font-semibold cursor-pointer min-h-[44px]">
          <RefreshCw className="h-4 w-4"/>
          <span>{tBilingual('Retry Operation', 'পুনরায় চেষ্টা করুন')}</span>
        </Button>

        <Button
 onClick={() => {
 if (typeof window !== 'undefined') {
 window.location.href = '/dashboard'
            }
          }}
 className="h-10 px-4 gap-2 bg-surface-inset hover:bg-card-elevated text-foreground font-semibold cursor-pointer min-h-[44px]">
          <Home className="h-4 w-4"/>
          <span>{tBilingual('Return to Dashboard', 'ড্যাশবোর্ডে ফিরে যান')}</span>
        </Button>
      </div>
    </div>
  )
}
