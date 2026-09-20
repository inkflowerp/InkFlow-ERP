'use client'

import React, { Suspense } from 'react'
import { DesignPanel } from '@/components/design/design-panel'
import { Palette } from 'lucide-react'

function DesignPanelLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
      <div className="h-10 w-10 rounded-xl bg-pink-600 text-white flex items-center justify-center animate-pulse">
        <Palette className="h-5 w-5 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-slate-500">Loading Design Panel...</p>
    </div>
  )
}

export default function DesignPage() {
  return (
    <Suspense fallback={<DesignPanelLoading />}>
      <DesignPanel defaultTab="all" />
    </Suspense>
  )
}
