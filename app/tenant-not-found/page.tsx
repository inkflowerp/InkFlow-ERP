'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Building2, ArrowLeft, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

function TenantNotFoundContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  // Dynamically resolve root domain (defaults to production printflow.bd, adapts to localhost in development)
  const [rootOrigin, setRootOrigin] = React.useState('https://printflow.bd')

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase()
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        const port = window.location.port ? `:${window.location.port}` : ''
        setRootOrigin(`http://localhost${port}`)
      } else {
        setRootOrigin('https://printflow.bd')
      }
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-muted font-sans">
      <div className="max-w-lg w-full text-center space-y-6 bg-card p-6 sm:p-10 rounded-2xl border border-border shadow-xs">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-warning-surface/60 text-warning mx-auto shadow-xs border border-warning/20">
          <Building2 className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-warning-surface text-warning tabular-nums border border-warning/20">
            404 • WORKSPACE NOT FOUND
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Workspace Not Found
          </h1>
          <p className="text-sm font-medium text-foreground bangla-text">
            প্রতিষ্ঠানটির ওয়ার্কস্পেস পাওয়া যায়নি
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto pt-1 leading-relaxed">
            {slug ? (
              <>
                The tenant subdomain <code className="px-1.5 py-0.5 rounded bg-muted tabular-nums text-xs text-primary font-bold">{slug}</code> is not registered, has been deleted, or may contain a typo.
              </>
            ) : (
              'The workspace subdomain you are trying to access does not exist or may have been moved.'
            )}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-xs">
            <Link href={`${rootOrigin}/register`}>
              <PlusCircle className="mr-1.5 h-4 w-4" />
              <span>Register New Organization</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted text-xs sm:text-sm shadow-xs">
            <Link href={`${rootOrigin}/`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              <span>Return to PrintFlow Home</span>
            </Link>
          </Button>
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href={`${rootOrigin}/login`} className="hover:text-foreground transition-colors">
            Sign In
          </Link>
          <span>•</span>
          <Link href={`${rootOrigin}/contact`} className="hover:text-foreground transition-colors">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function TenantNotFoundPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
      <TenantNotFoundContent />
    </Suspense>
  )
}
