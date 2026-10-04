'use client'

import React from 'react'
import { PlatformHeader } from './platform-header'
import { PlatformSidebar } from './platform-sidebar'
import { PlatformMobileBottomNav } from './platform-mobile-bottom-nav'
import { RealtimeNotificationPopup } from '@/components/shell/realtime-notification-popup'
import { ToastProvider } from '@/components/shared/toast-feedback'
import type { PlatformUserRecord } from '@/lib/auth/types'

interface PlatformShellProps {
  user: PlatformUserRecord
  children: React.ReactNode
}

export function PlatformShell({ user, children }: PlatformShellProps) {
  return (
    <ToastProvider>
      <div className="h-screen max-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground overflow-hidden print:h-auto print:max-h-none print:overflow-visible print:bg-white print:text-foreground">
        {/* Global Header */}
        <div className="print:hidden">
          <PlatformHeader initialUser={user} />
        </div>

        {/* Main Body with Sidebar + Content Area */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden print:overflow-visible print:h-auto print:min-h-0 print:block">
          {/* Navigation Sidebar */}
          <div className="print:hidden">
            <PlatformSidebar />
          </div>

          {/* Page Content Container */}
          <main className="flex-1 min-h-0 min-w-0 p-3 sm:p-5 lg:p-6 overflow-y-auto max-w-7xl pb-24 lg:pb-8 print:p-0 print:m-0 print:overflow-visible print:h-auto print:max-w-none">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="print:hidden">
          <PlatformMobileBottomNav />
          {/* Top-tier Realtime Notification Popups */}
          <RealtimeNotificationPopup />
        </div>
      </div>
    </ToastProvider>
  )
}
