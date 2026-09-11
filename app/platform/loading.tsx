import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function PlatformLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48 bg-slate-800 rounded" />
          <Skeleton className="h-8 w-64 bg-slate-800 rounded-lg" />
          <Skeleton className="h-4 w-80 bg-slate-800/60 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 bg-slate-800 rounded-xl" />
          <Skeleton className="h-9 w-24 bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-28 bg-slate-800 rounded" />
              <Skeleton className="h-8 w-8 bg-slate-800 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-36 bg-slate-800 rounded-md" />
            <Skeleton className="h-3 w-20 bg-slate-800/60 rounded" />
          </div>
        ))}
      </div>

      {/* Table / Details Skeleton */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <Skeleton className="h-6 w-48 bg-slate-800 rounded" />
          <Skeleton className="h-8 w-28 bg-slate-800 rounded-xl" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-slate-800/60 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
