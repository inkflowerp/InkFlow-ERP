'use client'

import React from 'react'
import { PlatformHeader } from '@/components/platform/platform-header'
import { PlatformSidebar } from '@/components/platform/platform-sidebar'
import { usePathname } from 'next/navigation'

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const isAuthPage =
    pathname === '/platform/login' ||
    pathname === '/platform/forgot-password' ||
    pathname === '/platform/reset-password'

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="dark h-screen max-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Global Header */}
      <PlatformHeader />

      {/* Main Body with Sidebar + Content Area */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Navigation Sidebar */}
        <PlatformSidebar />

        {/* Page Content Container */}
        <main className="flex-1 min-h-0 min-w-0 p-3.5 sm:p-6 lg:p-8 overflow-y-auto max-w-[1700px] pb-16 sm:pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}

