import React from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function InvoiceDetailLoading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse w-full max-w-5xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-44 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-60 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Invoice Sheet Skeleton */}
      <Card className="p-6 border-border bg-card space-y-4">
        <div className="flex justify-between items-start pb-4 border-b border-border">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-4 w-64 rounded" />
            <Skeleton className="h-4 w-40 rounded" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-5 w-32 rounded ml-auto" />
            <Skeleton className="h-4 w-28 rounded ml-auto" />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between py-2 border-b border-border/50">
              <Skeleton className="h-4 w-48 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <div className="w-64 space-y-2">
            <div className="flex justify-between"><Skeleton className="h-4 w-20 rounded" /><Skeleton className="h-4 w-24 rounded" /></div>
            <div className="flex justify-between"><Skeleton className="h-4 w-16 rounded" /><Skeleton className="h-4 w-20 rounded" /></div>
            <div className="flex justify-between pt-2 border-t border-border"><Skeleton className="h-5 w-24 rounded" /><Skeleton className="h-6 w-28 rounded" /></div>
          </div>
        </div>
      </Card>
    </div>
  )
}
