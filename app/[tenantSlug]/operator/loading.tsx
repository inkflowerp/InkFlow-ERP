import React from 'react'

export default function OperatorLoading() {
  return (
    <div className="space-y-4 pb-20 mx-auto max-w-lg p-3 sm:p-4 animate-pulse">
      {/* Operator Header Skeleton */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="h-6 w-36 bg-muted rounded-lg" />
        <div className="h-7 w-20 bg-muted rounded-full" />
      </div>

      {/* Machine Selector Skeleton */}
      <div className="h-12 bg-muted rounded-xl w-full" />

      {/* Active Task Hero Card Skeleton */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-6 w-20 bg-muted rounded-md" />
        </div>
        <div className="h-7 w-48 bg-muted rounded-lg" />
        <div className="h-12 bg-muted/60 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="h-12 bg-muted rounded-xl" />
          <div className="h-12 bg-muted rounded-xl" />
        </div>
      </div>

      {/* Queue List Skeleton */}
      <div className="space-y-2 pt-2">
        <div className="h-4 w-32 bg-muted rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl border border-border bg-card p-3" />
        ))}
      </div>
    </div>
  )
}
