'use client'

import React, { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Receipt, Loader2 } from 'lucide-react'

export default function InvoiceDetailRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = (params?.tenantSlug as string) || 'app'
  const id = (params?.id as string) || ''

  useEffect(() => {
    if (id) {
      router.replace(`/billing/${id}`)
    } else {
      router.replace('/billing?view=invoices')
    }
  }, [id, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
      <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
        <Receipt className="h-6 w-6 animate-pulse" />
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Loading Invoice...
        </h2>
        <p className="text-xs text-slate-500">
          Redirecting to invoice cockpit in Billing & Collections.
        </p>
      </div>
      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
    </div>
  )
}
