'use client'

import React, { useEffect, useState } from 'react'
import { PlatformHeader } from '@/components/platform/platform-header'
import { PlatformSidebar } from '@/components/platform/platform-sidebar'
import { usePathname } from 'next/navigation'
import { getPlatformSessionUserAction } from '@/actions/platform-auth.actions'

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  const isAuthPage =
    pathname === '/platform/login' ||
    pathname === '/platform/forgot-password' ||
    pathname === '/platform/reset-password'

  useEffect(() => {
    if (isAuthPage) {
      setIsChecking(false)
      return
    }

    let isMounted = true
    getPlatformSessionUserAction()
      .then((user) => {
        if (!isMounted) return
        if (!user || !user.is_active) {
          window.location.href = `/platform/login?error=unauthorized&redirectTo=${encodeURIComponent(pathname)}`
        } else {
          setIsAuthorized(true)
          setIsChecking(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          window.location.href = '/platform/login?error=unauthorized'
        }
      })

    return () => {
      isMounted = false
    }
  }, [pathname, isAuthPage])

  if (isAuthPage) {
    return <>{children}</>
  }

  if (isChecking) {
    return (
      <div className="dark h-screen max-h-screen bg-slate-950 text-slate-400 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
            Verifying Platform Clearance...
          </span>
        </div>
      </div>
    )
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


