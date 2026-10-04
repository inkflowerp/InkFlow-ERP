import React from 'react'

export default function SupplierDetailLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 animate-pulse max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-64 bg-muted rounded" />
            <div className="h-4 w-40 bg-muted rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-muted rounded" />
          <div className="h-9 w-36 bg-muted rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="h-96 bg-muted rounded-xl" />
    </div>
  )
}
