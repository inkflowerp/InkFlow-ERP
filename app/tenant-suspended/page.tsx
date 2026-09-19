'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, CreditCard, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

function TenantSuspendedContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const reason = searchParams.get('reason') || 'subscription'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-lg w-full text-center space-y-6 bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto shadow-sm ring-1 ring-amber-300 dark:ring-amber-900">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono">
            STATUS • WORKSPACE SUSPENDED
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Workspace Suspended
          </h1>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 bangla-text">
            প্রতিষ্ঠানটির কার্যক্রম সাময়িকভাবে স্থগিত রয়েছে
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto pt-1 leading-relaxed">
            {slug ? (
              <>
                Access to the tenant workspace for <strong className="text-slate-900 dark:text-white font-semibold">{slug}</strong> has been suspended due to pending subscription renewal or administrative review.
              </>
            ) : (
              'This tenant workspace has been suspended. Please contact your organization administrator or billing manager.'
            )}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md">
            <Link href="/contact?subject=Subscription%20Renewal">
              <CreditCard className="mr-1.5 h-4 w-4" />
              <span>Renew Subscription / Billing</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-slate-300 dark:border-slate-700 text-xs sm:text-sm">
            <Link href="/login">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              <span>Sign In with Another Account</span>
            </Link>
          </Button>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-4 text-xs text-slate-400">
          <Link href="/contact" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors inline-flex items-center gap-1">
            <Mail className="h-3 w-3" /> Contact InkFlow Billing Support
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
