import React from 'react'

export default function DesignLoading() {
  return (
    <div className="space-y-6 pb-16 animate-pulse p-2 sm:p-4">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted rounded-xl" />
          <div className="h-4 w-96 bg-muted rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-28 bg-muted rounded-xl" />
          <div className="h-9 w-9 bg-muted rounded-xl" />
          <div className="h-9 w-36 bg-muted rounded-xl" />
        </div>
      </div>

      {/* Canonical 4-KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-8 w-8 bg-muted rounded-xl" />
            </div>
            <div className="h-7 w-20 bg-muted rounded" />
            <div className="h-3 w-36 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Attention Queue Skeleton */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="h-5 w-16 bg-muted rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-border bg-muted/40 p-3 space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-6 w-full bg-muted rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs & Toolbar Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-32 bg-muted rounded-full shrink-0" />
        ))}
      </div>

      {/* Main Studio Cards Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-44 rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-48 bg-muted rounded" />
              <div className="h-5 w-24 bg-muted rounded-full" />
            </div>
            <div className="h-16 bg-muted/40 rounded-lg" />
            <div className="flex justify-end gap-2 pt-1">
              <div className="h-8 w-24 bg-muted rounded-lg" />
              <div className="h-8 w-32 bg-muted rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
