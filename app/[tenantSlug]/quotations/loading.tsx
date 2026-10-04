import React from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function QuotationsLoading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse w-full">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-36 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Canonical 4-KPI Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 border-border space-y-2.5 bg-card">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-36 rounded-lg" />
            <Skeleton className="h-3.5 w-24 rounded" />
          </Card>
        ))}
      </div>

      {/* Prioritized Attention Queue Skeleton */}
      <Card className="border-border p-4 sm:p-5 space-y-3 bg-card">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <Skeleton className="h-5 w-44 rounded" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="space-y-2.5">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted/60 border border-border p-3 flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>

      {/* Filter Bar Skeleton */}
      <Card className="p-3 border-border bg-card/80">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <Skeleton className="h-9 w-full md:w-72 rounded-xl" />
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>
      </Card>

      {/* Table Skeleton */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
