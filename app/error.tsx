'use client'

import React, { useEffect } from 'react'
import { ErrorState } from '@/components/shared/error-state'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('PrintERP Application Error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <ErrorState
          title="Application Error"
          message={error.message || 'An unexpected error occurred. Please try again.'}
          onRetry={() => reset()}
        />
      </div>
    </div>
  )
}
