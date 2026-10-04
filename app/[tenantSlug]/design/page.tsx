'use client'

import React, { Suspense } from 'react'
import { DesignPanel } from '@/components/design/design-panel'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { Palette } from 'lucide-react'

function DesignPanelLoading() {
 return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
      <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center animate-pulse">
        <Palette className="h-5 w-5 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-muted-foreground">Loading Design Panel...</p>
    </div>
  )
}

export default function DesignPage() {
 return (
    <PanelAccessGuard
 module="design"action="view"panelTitle="Design Panel"panelTitleBn="ডিজাইন প্যানেল">
      <Suspense fallback={<DesignPanelLoading />}>
        <DesignPanel defaultTab="new_tasks"/>
      </Suspense>
    </PanelAccessGuard>
  )
}
