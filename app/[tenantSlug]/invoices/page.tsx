'use client'

import React, { useEffect } from 'react'
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Receipt, Loader2 } from 'lucide-react'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

function InvoicesRedirectContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const tenantSlug = (params?.tenantSlug as string) || 'app'

  useEffect(() => {
    // Preserve existing query params and ensure view=invoices is set
    const currentQuery = searchParams ? new URLSearchParams(searchParams.toString()) : new URLSearchParams()
    if (!currentQuery.has('view')) {
      currentQuery.set('view', 'invoices')
    }
    const targetUrl = getTenantNavHref(`/billing?${currentQuery.toString()}`, pathname, tenantSlug)
    router.replace(targetUrl)
  }, [searchParams, router, pathname, tenantSlug])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
      <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
        <Receipt className="h-6 w-6 animate-pulse" />
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Redirecting to Billing & Collections...
        </h2>
        <p className="text-xs text-slate-500">
          Invoices are now consolidated in the unified financial workspace.
        </p>
      </div>
      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
    </div>
  )
}

export default function InvoicesRedirectPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Receipt className="h-6 w-6 animate-pulse" />
          </div>
          <p className="text-xs text-slate-500">Redirecting to Billing...</p>
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        </div>
      }
    >
      <InvoicesRedirectContent />
    </React.Suspense>
  )
}

