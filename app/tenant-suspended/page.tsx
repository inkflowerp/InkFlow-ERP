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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-lg w-full text-center space-y-6 bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto shadow-sm ring-1 ring-rose-200 dark:ring-rose-900/50">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-mono">
            423 • WORKSPACE SUSPENDED
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Workspace Suspended
          </h1>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            প্রতিষ্ঠানটির ওয়ার্কস্পেস সাময়িকভাবে স্থগিত করা হয়েছে
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto pt-1 leading-relaxed">
            {slug ? (
              <>
                The tenant workspace for <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs text-rose-600 dark:text-rose-400 font-bold">{slug}</code> is currently suspended due to billing, administrative review, or policy hold.
              </>
            ) : (
              'This workspace has been suspended. Please contact your organization administrator or PrintERP platform support to reactivate your account.'
            )}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md">
            <Link href="/contact">
              <Headphones className="mr-1.5 h-4 w-4" />
              <span>Contact Support / Billing</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-slate-300 dark:border-slate-700 text-xs sm:text-sm">
            <Link href="/">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              <span>Return Home</span>
            </Link>
          </Button>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-4 text-xs text-slate-400">
          <Link href="/login" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Sign In with Different Account
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function TenantSuspendedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading...</div>}>
      <TenantSuspendedContent />
    </Suspense>
  )
}
