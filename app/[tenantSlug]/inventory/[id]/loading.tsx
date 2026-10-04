import React from 'react'

export default function MaterialDetailLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 animate-pulse max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 bg-muted rounded-lg" />
        <div className="space-y-1.5 flex-1">
          <div className="h-6 w-1/3 bg-muted rounded" />
          <div className="h-4 w-1/4 bg-muted rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-xl" />
      <div className="h-48 bg-muted rounded-xl" />
    </div>
  )
}
