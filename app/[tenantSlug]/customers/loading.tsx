import React from 'react'

export default function CustomersLoading() {
  return (
    <div className="space-y-6 pb-16 animate-pulse">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted rounded-xl" />
          <div className="h-4 w-96 bg-muted rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-24 bg-muted rounded-xl" />
          <div className="h-9 w-36 bg-muted rounded-xl" />
        </div>
      </div>

      {/* Canonical 4-KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-8 w-8 bg-muted rounded-xl" />
            </div>
            <div className="h-7 w-32 bg-muted rounded" />
            <div className="h-3 w-40 bg-muted rounded" />
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

      {/* Filter Bar Skeleton */}
      <div className="flex flex-col md:flex-row items-center gap-3 p-3.5 rounded-xl border border-border bg-card">
        <div className="h-9 flex-1 bg-muted rounded-xl w-full" />
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="h-9 w-28 bg-muted rounded-xl" />
          <div className="h-9 w-32 bg-muted rounded-xl" />
          <div className="h-9 w-36 bg-muted rounded-xl" />
          <div className="h-9 w-9 bg-muted rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="h-10 bg-muted border-b border-border" />
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 p-4 flex items-center justify-between gap-4">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-4 w-28 bg-muted rounded hidden sm:block" />
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-6 w-16 bg-muted rounded-full" />
              <div className="h-8 w-8 bg-muted rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
