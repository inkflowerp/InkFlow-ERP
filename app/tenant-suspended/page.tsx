'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ShieldAlert, ArrowLeft, Headphones, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

function TenantSuspendedContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-muted font-sans">
      <div className="max-w-lg w-full text-center space-y-6 bg-card p-6 sm:p-10 rounded-2xl border border-border shadow-xl">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-danger-surface bg-danger-surface/60 text-destructive text-destructive mx-auto shadow-sm ring-1 focus:ring-ring dark:focus:ring-ring/50">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-danger-surface bg-danger-surface text-destructive text-destructive tabular-nums">
            423 • WORKSPACE SUSPENDED
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground dark:text-white">
            Workspace Suspended
          </h1>
          <p className="text-sm font-medium text-foreground dark:text-muted-foreground">
            প্রতিষ্ঠানটির ওয়ার্কস্পেস সাময়িকভাবে স্থগিত করা হয়েছে
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto pt-1 leading-relaxed">
            {slug ? (
              <>
                The tenant workspace for <code className="px-1.5 py-0.5 rounded bg-muted tabular-nums text-xs text-destructive text-destructive font-bold">{slug}</code> is currently suspended due to billing, administrative review, or policy hold.
              </>
            ) : (
              'This workspace has been suspended. Please contact your organization administrator or PrintFlow platform support to reactivate your account.'
            )}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-destructive hover:bg-destructive text-white font-bold text-xs sm:text-sm shadow-md">
            <Link href="/contact">
              <Headphones className="mr-1.5 h-4 w-4" />
              <span>Contact Support / Billing</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-input text-xs sm:text-sm">
            <Link href="/">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              <span>Return Home</span>
            </Link>
          </Button>
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-muted-foreground dark:hover:text-muted-foreground transition-colors">
            Sign In with Different Account
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function TenantSuspendedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
      <TenantSuspendedContent />
    </Suspense>
  )
}
