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
  const { isLive, status } = useRealtime()
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false)

  // Listen for global attendance punch triggers across components
  useEffect(() => {
    const handleOpen = () => setIsAttendanceOpen(true)
    const handleClose = () => setIsAttendanceOpen(false)
    const handleToggle = () => setIsAttendanceOpen((prev) => !prev)

    window.addEventListener('printerp_open_attendance_modal', handleOpen)
    window.addEventListener('printerp_open_attendance_punch', handleOpen)
    window.addEventListener('printerp_close_attendance_modal', handleClose)
    window.addEventListener('printerp_toggle_attendance_modal', handleToggle)
    window.addEventListener('inkflow_open_attendance_punch', handleOpen)

    return () => {
      window.removeEventListener('printerp_open_attendance_modal', handleOpen)
      window.removeEventListener('printerp_open_attendance_punch', handleOpen)
      window.removeEventListener('printerp_close_attendance_modal', handleClose)
      window.removeEventListener('printerp_toggle_attendance_modal', handleToggle)
      window.removeEventListener('inkflow_open_attendance_punch', handleOpen)
    }
  }, [])

  const pathSlug = pathname ? pathname.split('/')[1] : null
  const slug = (pathSlug && pathSlug !== 'platform-admin' && pathSlug !== 'login' && pathSlug !== 'onboarding' ? pathSlug : company?.slug) || 'app'

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-2.5 sm:px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 gap-2 sm:gap-4">
      {/* LEFT: Mobile Nav Drawer + Company Selector + Breadcrumbs */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
        <MobileNav />
        <CompanySelector />
        <div className="hidden 2xl:block pl-3 border-l border-slate-200 dark:border-slate-800 shrink-0">
          <Breadcrumbs />
        </div>
      </div>

      {/* RIGHT: Live Status + Flexible Search + Attendance/Punch + Notifications + User Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
        {/* Realtime Live Sync Health Indicator */}
        <div className="hidden lg:flex items-center mr-0.5 shrink-0" suppressHydrationWarning>
          {isLive ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/80"
              title="Live Database Realtime Connected: Synchronized across all users & tabs"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/80"
              title={`Connection State: ${status}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>{status === 'connecting' || status === 'reconnecting' ? 'Syncing...' : 'Live Ready'}</span>
            </span>
          )}
        </div>

        {/* Global Search Bar - Responsive Width */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('printerp_open_search'))}
          className="hidden sm:flex items-center justify-between gap-2 sm:gap-3 w-36 md:w-52 lg:w-64 xl:w-80 rounded-xl border border-slate-200/90 bg-slate-100/70 hover:bg-slate-100 px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200 cursor-pointer shrink transition-all min-h-[38px] shadow-2xs"
          title="Global Search (⌘K or /)"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <span className="truncate bangla-text font-medium text-slate-500 dark:text-slate-400">{t('common.search')}</span>
          </div>
          <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 font-mono shrink-0 shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Quick Search Icon Button (Mobile under 640px) */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('printerp_open_search'))}
          className="sm:hidden flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-slate-100/60 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer shrink-0 min-h-[36px] min-w-[36px] transition-colors"
          title="Global Search (/)"
          aria-label="Search"
        >
          <Search className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
        </button>

        {/* Dedicated Employee Attendance & Shift Punch Action */}
        <button
          type="button"
          onClick={() => setIsAttendanceOpen(true)}
          className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400 cursor-pointer shadow-2xs transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500/40 active:scale-95 shrink-0"
          title={tBilingual('Employee Attendance & Shift Punch', 'কর্মচারী উপস্থিতি ও শিফট পাঞ্চ')}
          aria-label={tBilingual('Employee Attendance & Shift Punch', 'কর্মচারী উপস্থিতি ও শিফট পাঞ্চ')}
        >
          <QrCode className="h-4 w-4" />
        </button>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Notifications Dropdown */}
        <NotificationsDropdown />

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

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
