import React from 'react'

export default function DesignerLoading() {
  return (
    <div className="space-y-6 pb-16 animate-pulse p-4 max-w-5xl mx-auto">
      {/* Workbench Header Skeleton */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="space-y-1">
          <div className="h-6 w-48 bg-muted rounded-lg" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <div className="h-8 w-28 bg-muted rounded-xl" />
      </div>

      {/* Hero Task Stopwatch Skeleton */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-36 bg-muted rounded" />
          <div className="h-6 w-24 bg-muted rounded-full" />
        </div>
        <div className="h-14 w-48 bg-muted rounded-xl mx-auto" />
        <div className="flex justify-center gap-3">
          <div className="h-10 w-32 bg-muted rounded-xl" />
          <div className="h-10 w-32 bg-muted rounded-xl" />
        </div>
      </div>

      {/* Task Queue Skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-40 bg-muted rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-card p-4" />
        ))}
      </div>
    </div>
  )
}
