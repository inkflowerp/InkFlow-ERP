import React from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse w-full">
      {/* Top Welcome & Quick Actions Bar Skeleton */}
      <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36 bg-muted rounded-md" />
          <Skeleton className="h-7 w-64 bg-muted rounded-lg" />
          <Skeleton className="h-4 w-80 bg-muted/70 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-28 rounded-xl bg-muted" />
          <Skeleton className="h-10 w-32 rounded-xl bg-muted" />
        </div>
      </div>

      {/* Row of 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 border-border space-y-2 bg-card">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-36 rounded-lg" />
            <Skeleton className="h-3.5 w-24 rounded" />
          </Card>
        ))}
      </div>

      {/* Prioritized Needs Attention Queue Skeleton */}
      <Card className="border-border p-4 sm:p-5 space-y-3 bg-card">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <Skeleton className="h-5 w-48 rounded" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted/60 border border-border p-3 flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-44 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>

      {/* Table & Chart Split Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 border-border p-4 sm:p-5 space-y-3 bg-card">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-5 border-border p-4 sm:p-5 space-y-3 bg-card">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <Skeleton className="h-60 w-full rounded-xl" />
        </Card>
      </div>
    </div>
  )
}
