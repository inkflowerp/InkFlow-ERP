'use client'

import React from 'react'
import Link from 'next/link'
import { LayoutDashboard, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

export default function DashboardNotFound() {
  const { tBilingual } = useI18n()

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground border border-border">
        <LayoutDashboard className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground bangla-text">
          {tBilingual('Dashboard View Not Found', 'ড্যাশবোর্ড ভিউ খুঁজে পাওয়া যায়নি')}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed bangla-text">
          {tBilingual(
            'The requested dashboard or role workspace does not exist or has been relocated.',
            'অনুরোধকৃত ড্যাশবোর্ড বা রোল প্যানেলটি খুঁজে পাওয়া যায়নি।'
          )}
        </p>
      </div>

      <Button asChild className="h-10 px-4 gap-2 bg-primary text-primary-foreground min-h-[44px]">
        <Link href="/">
          <ArrowLeft className="w-4 h-4" />
          <span>{tBilingual('Return to Overview', 'মূল পাতায় ফিরে যান')}</span>
        </Link>
      </Button>
    </div>
  )
}
