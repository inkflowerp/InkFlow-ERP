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
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isPlatform ? 'bg-card text-foreground' : 'bg-muted text-foreground dark:text-foreground'}`}>
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-danger-surface bg-danger-surface/60 text-destructive text-destructive mx-auto shadow-xl ring-1 focus:ring-ring dark:focus:ring-ring">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="tabular-nums text-xs uppercase tracking-widest text-destructive text-destructive font-bold">
            403 Forbidden
          </span>
          <h1 className="text-2xl font-black tracking-tight">
            {isPlatform ? 'Platform Administrator Access Required' : "You Don't Have Permission"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {isPlatform
              ? 'This area is strictly restricted to authorized PrintERP platform administrators. Your current session does not possess root administrative clearance.'
              : "You don't have permission to access this page or tenant organization. Please contact your company business owner if you believe this is an error."}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          {isPlatform ? (
            <>
              <Button asChild className="bg-primary hover:bg-primary text-white font-bold text-xs">
                <Link href="/platform/login">
                  <LogIn className="mr-1.5 h-4 w-4" />
                  <span>Platform Console Sign In</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-border text-xs">
                <Link href="/login">
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  <span>Return to Tenant ERP</span>
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading access control...</div>}>
      <ForbiddenContent />
    </Suspense>
  )
}
