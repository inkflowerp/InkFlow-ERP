'use client'

import React, { useEffect } from 'react'
import { ShieldAlert, RefreshCw, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PlatformErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PlatformError({ error, reset }: PlatformErrorProps) {
  useEffect(() => {
    console.error('Platform Control Error:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center my-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 mb-4 shadow-lg shadow-red-950/50">
        <ShieldAlert className="h-7 w-7" />
      </div>

      <h2 className="text-lg font-bold text-white mb-1">
        Platform Service Exception
      </h2>

      <p className="max-w-md text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
        {error.message || 'An unexpected error occurred while loading platform metrics or administrative data.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => reset()}
          className="h-10 px-4 gap-2 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 font-semibold cursor-pointer min-h-[44px]"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry Operation</span>
        </Button>

        <Button
          asChild
          className="h-10 px-4 gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer min-h-[44px]"
        >
          <Link href="/platform">
            <LayoutDashboard className="h-4 w-4" />
            <span>Platform Home</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
