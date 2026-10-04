'use client'

import React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Palette, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

export default function DesignNotFound() {
  const { tBilingual } = useI18n()
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || ''

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center my-6 max-w-lg mx-auto space-y-4 shadow-xs">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground border border-border">
        <Palette className="h-7 w-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground bangla-text">
          {tBilingual('Design Workspace Not Found', 'ডিজাইন ওয়ার্কস্পেস পাওয়া যায়নি')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed bangla-text">
          {tBilingual(
            'The requested design workspace, artwork proof, or filter queue does not exist.',
            'আপনার কাঙ্ক্ষিত ডিজাইন ওয়ার্কস্পেস বা আর্টওয়ার্ক প্রুফটি খুঁজে পাওয়া যায়নি।'
          )}
        </p>
      </div>

      <div className="pt-2">
        <Button asChild className="h-10 px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold min-h-11">
          <Link href={`/${tenantSlug}/design`}>
            <ArrowLeft className="h-4 w-4" />
            <span>{tBilingual('Back to Design Studio', 'ডিজাইন স্টুডিওতে ফিরুন')}</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
