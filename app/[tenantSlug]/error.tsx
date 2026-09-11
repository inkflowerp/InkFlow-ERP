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
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-rose-200/80 bg-rose-50/40 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/20 my-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 border border-rose-500/30 mb-4 shadow-xs">
        <AlertOctagon className="h-7 w-7" />
      </div>

      <h2 className="text-lg font-bold text-rose-950 dark:text-rose-100 mb-1 bangla-text">
        {tBilingual('Operational View Encountered an Error', 'পেজ লোড করতে সমস্যা দেখা দিয়েছে')}
      </h2>

      <p className="max-w-md text-xs sm:text-sm text-rose-700 dark:text-rose-300 mb-6 leading-relaxed bangla-text">
        {tBilingual(
          error.message || 'An unexpected error occurred while processing this operational view.',
          'তথ্য লোড করার সময় অপ্রত্যাশিত ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন।'
        )}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => reset()}
          className="h-10 px-4 gap-2 bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-semibold cursor-pointer min-h-[44px]"
        >
          <RefreshCw className="h-4 w-4" />
          <span>{tBilingual('Retry Operation', 'পুনরায় চেষ্টা করুন')}</span>
        </Button>

        <Button
          asChild
          className="h-10 px-4 gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer min-h-[44px]"
        >
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            <span>{tBilingual('Return to Dashboard', 'ড্যাশবোর্ডে ফিরে যান')}</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
