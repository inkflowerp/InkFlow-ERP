'use client'

import React, { useEffect } from 'react'
import { ShieldAlert, RefreshCw, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

interface PlatformErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PlatformError({ error, reset }: PlatformErrorProps) {
  const { tBilingual } = useI18n()

  useEffect(() => {
    console.error('Platform Control Error:', error)
  }, [error])

  return (
    <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center my-8 shadow-xs">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/30 mb-4 shadow-xs">
        <ShieldAlert className="h-7 w-7" />
      </div>

      <h2 className="text-lg font-bold text-foreground mb-1">
        {tBilingual('Something Went Wrong', 'কিছু ভুল হয়েছে')}
      </h2>

      <p className="max-w-md text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
        {error.message || tBilingual('An unexpected problem occurred. Please try again.', 'একটি সমস্যা দেখা দিয়েছে। আবার চেষ্টা করুন।')}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => reset()}
          className="h-10 px-4 gap-2 bg-card border-border text-foreground hover:bg-muted font-semibold cursor-pointer min-h-10 text-xs"
        >
          <RefreshCw className="h-4 w-4" />
          <span>{tBilingual('Try Again', 'আবার চেষ্টা')}</span>
        </Button>

        <Button
          asChild
          className="h-10 px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer min-h-10 text-xs shadow-xs"
        >
          <Link href="/platform">
            <LayoutDashboard className="h-4 w-4" />
            <span>{tBilingual('Home', 'হোম')}</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
