'use client'

import React, { useEffect, useState } from 'react'
import { PlatformHeader } from '@/components/platform/platform-header'
import { PlatformSidebar } from '@/components/platform/platform-sidebar'
import { usePathname, useRouter } from 'next/navigation'
import { getPlatformSessionUserAction } from '@/actions/platform-auth.actions'

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)

  const isAuthPage =
    pathname === '/platform/login' ||
    pathname === '/platform/forgot-password' ||
    pathname === '/platform/reset-password'

  useEffect(() => {
    if (isAuthPage) {
      setCheckingAuth(false)
      return
    }

    getPlatformSessionUserAction().then((user) => {
      if (!user || !user.is_active) {
        router.push(`/platform/login?redirectTo=${encodeURIComponent(pathname)}`)
      } else {
        setCheckingAuth(false)
      }
    })
  }, [pathname, isAuthPage, router])

  if (isAuthPage) {
    return <>{children}</>
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-indigo-300">Verifying Platform Authorization...</span>
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
