import React from 'react'

export default function DeliveryDetailLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 animate-pulse max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-muted rounded w-48" />
        <div className="h-9 bg-muted rounded-xl w-32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="h-44 bg-muted rounded-2xl" />
          <div className="h-72 bg-muted rounded-2xl" />
        </div>
        <div className="lg:col-span-4 space-y-6">
          <div className="h-48 bg-muted rounded-2xl" />
          <div className="h-56 bg-muted rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
