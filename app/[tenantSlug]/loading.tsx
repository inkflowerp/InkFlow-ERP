import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function TenantLoading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="rounded-2xl bg-slate-800/60 p-6 space-y-3">
        <Skeleton className="h-5 w-40 bg-slate-700/80 rounded-full" />
        <Skeleton className="h-8 w-72 bg-slate-700/80 rounded-lg" />
        <Skeleton className="h-4 w-96 bg-slate-700/60 rounded" />
      </div>

      {/* Quick Actions Bar Skeleton */}
      <Card className="p-4 border-slate-200/80 dark:border-slate-800 space-y-3">
        <Skeleton className="h-4 w-32 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-xl" />
          ))}
        </div>
      </Card>

      {/* Metrics Row Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-36 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 border-slate-200/80 dark:border-slate-800 space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-8 w-28 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </Card>
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <Skeleton className="h-5 w-48 rounded" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    </div>
  )
}
