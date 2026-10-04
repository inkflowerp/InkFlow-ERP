import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

interface TableSkeletonProps {
  title?: string
  rows?: number
  kpiCards?: number
}

export function TablePageSkeleton({ title, rows = 6, kpiCards = 4 }: TableSkeletonProps) {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          {title ? (
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
          ) : (
            <Skeleton className="h-7 w-48 rounded-lg" />
          )}
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards */}
      {kpiCards > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: kpiCards }).map((_, i) => (
            <Card key={i} className="p-4 border-border space-y-2">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-7 w-32 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </Card>
          ))}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Main Table */}
      <Card className="border-border">
        <CardHeader className="p-4 border-b border-border flex flex-row justify-between items-center">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-4 w-44 rounded" />
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded-full shrink-0" />
              <Skeleton className="h-5 w-24 rounded shrink-0" />
              <Skeleton className="h-8 w-8 rounded shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
