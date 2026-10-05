'use client'

import React, { useEffect } from 'react'
import { AlertOctagon, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Fatal Global Application Error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 sm:p-8 text-center shadow-lg space-y-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              System Recovery Mode
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              PrintFlow encountered an unhandled system exception. You can attempt an in-memory reset or return to the landing page.
            </p>
          </div>

          {error.digest && (
            <div className="p-2.5 rounded-lg bg-surface-inset border border-border text-xs font-mono text-muted-foreground select-all tabular-nums">
              Digest: {error.digest}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Operation</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/'
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Go to Home</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
