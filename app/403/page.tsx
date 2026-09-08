'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ForbiddenContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get('type') // 'platform' | 'tenant'

  const isPlatform = type === 'platform'

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isPlatform ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100'}`}>
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto shadow-xl ring-1 ring-red-300 dark:ring-red-900">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-widest text-red-600 dark:text-red-400 font-bold">
            403 Forbidden
          </span>
          <h1 className="text-2xl font-black tracking-tight">
            {isPlatform ? 'Platform Administrator Access Required' : "You Don't Have Permission"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            {isPlatform
              ? 'This area is strictly restricted to authorized PrintERP platform administrators. Your current session does not possess root administrative clearance.'
              : "You don't have permission to access this page or tenant organization. Please contact your company business owner if you believe this is an error."}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          {isPlatform ? (
            <>
              <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
                <Link href="/platform/login">
                  <LogIn className="mr-1.5 h-4 w-4" />
                  <span>Platform Console Sign In</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-slate-800 text-xs">
                <Link href="/login">
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  <span>Return to Tenant ERP</span>
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                <Link href="/login">
                  <LogIn className="mr-1.5 h-4 w-4" />
                  <span>Sign In with Authorized Account</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="text-xs">
                <Link href="/">
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  <span>Return to Homepage</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ForbiddenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading access control...</div>}>
      <ForbiddenContent />
    </Suspense>
  )
}
