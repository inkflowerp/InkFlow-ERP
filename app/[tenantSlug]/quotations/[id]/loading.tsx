import React from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function QuotationDetailLoading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse w-full max-w-5xl mx-auto">
      {/* Detail Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-44 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-60 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Status Timeline Bar Skeleton */}
      <Card className="p-4 border-border bg-card">
        <div className="flex items-center justify-between gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </Card>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 p-5 border-border bg-card space-y-4">
          <Skeleton className="h-5 w-36 rounded" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/60 border border-border p-3 flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-4 p-5 border-border bg-card space-y-4">
          <Skeleton className="h-5 w-28 rounded" />
          <div className="space-y-2.5">
            <div className="flex justify-between py-1 border-b border-border/50">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <div className="flex justify-between py-2 border-t border-border">
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-6 w-28 rounded" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
