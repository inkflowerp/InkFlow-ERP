import React from 'react'

export default function DesignDetailLoading() {
  return (
    <div className="space-y-6 mx-auto pb-16 animate-pulse p-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="h-5 w-40 bg-muted rounded" />
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-muted rounded-xl" />
          <div className="h-9 w-32 bg-muted rounded-xl" />
        </div>
      </div>

      {/* Main Canvas / Proof Skeleton */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-muted rounded-lg" />
            <div className="h-4 w-40 bg-muted rounded" />
          </div>
          <div className="h-7 w-28 bg-muted rounded-full" />
        </div>

        {/* Big Preview Area */}
        <div className="h-80 bg-muted/40 rounded-xl border border-border flex items-center justify-center" />

        {/* Specs & Preflight Check */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/30 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
