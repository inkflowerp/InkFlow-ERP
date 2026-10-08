'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { CompanySelector } from './company-selector'
import { Breadcrumbs } from './breadcrumbs'
import { NotificationsDropdown } from './notifications-dropdown'
import { UserMenu } from './user-menu'
import { MobileNav } from './mobile-nav'
import { ThemeToggle } from './theme-toggle'
import { Search, QrCode } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { useRealtime } from '@/components/providers/realtime-provider'
import { AttendancePunchModal } from '@/components/mobile/attendance-punch-modal'

export function TopNav() {
 const router = useRouter()
 const pathname = usePathname()
 const { t, tBilingual } = useI18n()
 const { company } = useTenant()
 const { isLive, status, reconnect } = useRealtime()
 const [isAttendanceOpen, setIsAttendanceOpen] = useState(false)

  // Listen for global attendance punch triggers across components
 useEffect(() => {
 const handleOpen = () => setIsAttendanceOpen(true)
 const handleClose = () => setIsAttendanceOpen(false)
 const handleToggle = () => setIsAttendanceOpen((prev) => !prev)

 window.addEventListener('printflow_open_attendance_modal', handleOpen)
 window.addEventListener('printflow_open_attendance_punch', handleOpen)
 window.addEventListener('printflow_close_attendance_modal', handleClose)
 window.addEventListener('printflow_toggle_attendance_modal', handleToggle)

 return () => {
 window.removeEventListener('printflow_open_attendance_modal', handleOpen)
 window.removeEventListener('printflow_open_attendance_punch', handleOpen)
 window.removeEventListener('printflow_close_attendance_modal', handleClose)
 window.removeEventListener('printflow_toggle_attendance_modal', handleToggle)
    }
  }, [])

 const pathSlug = pathname ? pathname.split('/')[1] : null
 const slug = (pathSlug && pathSlug !== 'platform-admin' && pathSlug !== 'login' && pathSlug !== 'onboarding' ? pathSlug : company?.slug) || 'app'

 return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card/95 px-2.5 sm:px-6 backdrop-blur-md gap-2 sm:gap-4 relative">
      {/* Signature Printing Industry CMYK Micro Accent */}
      <div className="absolute top-0 inset-x-0 h-0.5 cmyk-rainbow-bar opacity-85"/>

      {/* LEFT: Mobile Nav Drawer + Company Selector + Breadcrumbs */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
        <React.Suspense fallback={<div className="h-10 w-10 shrink-0"/>}>
          <MobileNav />
        </React.Suspense>
        <CompanySelector />
        <div className="hidden 2xl:block pl-3 border-l border-border shrink-0">
          <Breadcrumbs />
        </div>
      </div>

      {/* RIGHT: Live Status + Flexible Search + Attendance/Punch + Notifications + User Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
        {/* Realtime Live Sync Health Indicator */}
        <div className="flex items-center mr-0.5 shrink-0" suppressHydrationWarning>
          {status === 'connected' ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-surface text-success border border-success/30 shadow-2xs"
              title="Realtime Connected: Instant live updates across all screens"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse shrink-0" />
              <span className="hidden sm:inline font-mono text-xs uppercase tracking-wider font-semibold">Online</span>
              <span className="sm:hidden text-xs font-semibold">Live</span>
            </span>
          ) : status === 'connecting' || status === 'reconnecting' ? (
            <button
              type="button"
              onClick={reconnect}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-surface text-warning border border-warning/30 hover:bg-warning-surface/80 cursor-pointer transition-colors shadow-2xs"
              title="Reconnecting to realtime database... Click to retry now"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse shrink-0" />
              <span className="hidden sm:inline font-mono text-xs uppercase tracking-wider font-semibold">Reconnecting</span>
              <span className="sm:hidden text-xs font-semibold">Sync</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={reconnect}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 cursor-pointer transition-colors shadow-2xs"
              title="Realtime Offline. Slow polling (60s) active. Click to reconnect now"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
              <span className="hidden sm:inline font-mono text-xs uppercase tracking-wider font-semibold">Offline</span>
              <span className="sm:hidden text-xs font-semibold">Off</span>
            </button>
          )}
        </div>

        {/* Global Search Bar - Responsive Width */}
        <button
 type="button"onClick={() => window.dispatchEvent(new Event('printflow_open_search'))}
 className="hidden sm:flex items-center justify-between gap-2 sm:gap-3 w-36 md:w-52 lg:w-64 xl:w-80 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground cursor-pointer shrink transition-colors min-h-[38px] shadow-2xs"title="Global Search (⌘K or /)">
          <div className="flex items-center gap-2 min-w-0">
            <Search className="h-4 w-4 text-muted-foreground shrink-0"/>
            <span className="truncate bangla-text font-medium text-muted-foreground">{t('common.search')}</span>
          </div>
          <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-bold text-muted-foreground tabular-nums shrink-0 shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Quick Search Icon Button (Mobile under 640px) */}
        <button
 type="button"onClick={() => window.dispatchEvent(new Event('printflow_open_search'))}
 className="sm:hidden flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70 cursor-pointer shrink-0 min-h-[36px] min-w-[36px] transition-colors"title="Global Search (/)"aria-label="Search">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground"/>
        </button>

        {/* Dedicated Attendance & Shift Punch Action */}
        <button
          type="button"
          onClick={() => setIsAttendanceOpen(true)}
          className="relative rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-primary cursor-pointer shadow-2xs transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shrink-0"
          title={tBilingual('Attendance & Shift Punch', 'উপস্থিতি ও শিফট পাঞ্চ')}
          aria-label={tBilingual('Attendance & Shift Punch', 'উপস্থিতি ও শিফট পাঞ্চ')}
        >
          <QrCode className="h-4 w-4"/>
        </button>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Notifications Dropdown */}
        <NotificationsDropdown />

        <div className="h-5 w-px bg-muted mx-0.5 shrink-0"/>

        {/* User Profile Menu */}
        <UserMenu />
      </div>

      {/* Direct Attendance Punch Modal */}
      {isAttendanceOpen && (
        <AttendancePunchModal
 open={isAttendanceOpen}
 onClose={() => setIsAttendanceOpen(false)}
 tenantSlug={slug}
        />
      )}
    </header>
  )
}
