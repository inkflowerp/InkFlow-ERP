import React from 'react'

export default function CustomerDetailLoading() {
  return (
    <div className="space-y-6 mx-auto pb-16 animate-pulse">
      {/* Back button & date skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-4 w-36 bg-muted rounded" />
      </div>

      {/* Profile Header Card Skeleton */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-48 bg-muted rounded-lg" />
              <div className="h-5 w-20 bg-muted rounded-md" />
              <div className="h-5 w-16 bg-muted rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 bg-muted rounded-xl" />
            <div className="h-9 w-24 bg-muted rounded-xl" />
            <div className="h-9 w-32 bg-muted rounded-xl" />
          </div>
        </div>
      </div>

      {/* Financial Summary Cards Skeleton (4 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-6 w-28 bg-muted rounded" />
            <div className="h-3 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Tabs Bar Skeleton */}
      <div className="h-10 bg-muted/60 rounded-xl w-full max-w-xl" />

      {/* Tab Content Table Skeleton */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="h-6 w-40 bg-muted rounded" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/40 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
