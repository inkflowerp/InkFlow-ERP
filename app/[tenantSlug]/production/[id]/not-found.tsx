'use client'

import React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

export default function ProductionJobDetailNotFound() {
  const { tBilingual } = useI18n()
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || ''

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center my-6 max-w-lg mx-auto space-y-4 shadow-xs">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground border border-border">
        <AlertCircle className="h-7 w-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground bangla-text">
          {tBilingual('Production Job Not Found', 'প্রোডাকশন জব খুঁজে পাওয়া যায়নি')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed bangla-text">
          {tBilingual(
            'The requested production job order does not exist or has been completed and archived.',
            'আপনার কাঙ্ক্ষিত প্রোডাকশন জব অর্ডারটি পাওয়া যায়নি অথবা সম্পূর্ণ করে আর্কাইভে স্থানান্তর করা হয়েছে।'
          )}
        </p>
      </div>

      <div className="pt-2">
        <Button asChild className="h-10 px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold min-h-11">
          <Link href={`/${tenantSlug}/production`}>
            <ArrowLeft className="h-4 w-4" />
            <span>{tBilingual('Back to Production Floor', 'প্রোডাকশন ফ্লোরে ফিরুন')}</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
