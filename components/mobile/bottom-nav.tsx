'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Clock,
  Printer,
  Plus,
  MessageSquare,
  Menu,
  UserCheck,
  Palette,
  Flame,
  FileText,
  ShoppingBag,
} from 'lucide-react'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { OfflineSyncDrawer } from './offline-sync-drawer'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useI18n } from '@/i18n/context'
import { NewWorkWizard } from '@/components/orders/new-work-wizard'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import type { NavSection } from '@/config/navigation.config'

export function MobileBottomNav({ initialNavSections }: { initialNavSections?: NavSection[] } = {}) {
  const pathname = usePathname()
  const { company, currentUser } = useTenant()
  const { isOwner, can } = usePermissions()
  const { tBilingual } = useI18n()
  const pathSlug = pathname ? pathname.split('/')[1] : null
  const tenantSlug = (pathSlug && pathSlug !== 'platform-admin' && pathSlug !== 'login' && pathSlug !== 'onboarding' ? pathSlug : company?.slug) || 'app'

  const { isOnline } = useNetworkStatus()
  const { pendingCount } = useOfflineQueue()

  const [newWorkOpen, setNewWorkOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)

  const role = (currentUser?.role || (currentUser as any)?.primaryRole || '').toLowerCase().trim()
  const isGeneralStaff = (role === 'general_staff' || role === 'staff') && !isOwner
  const isOperator = (role === 'machine_operator' || role === 'operator' || role.includes('operat')) && !isOwner
  const isDesigner = (role === 'graphic_designer' || role === 'designer' || role.includes('design')) && !isOwner

  const isDashboardActive = pathname === '/dashboard' || pathname === `/${tenantSlug}/dashboard` || pathname === `/${tenantSlug}` || pathname === '/'
  const isOperatorActive = pathname?.includes('/operator')
  const isDesignerActive = pathname?.includes('/designer')
  const isAttendanceActive = pathname?.includes('/attendance')
  const isPortalActive = pathname?.includes('/portal')
  const isMaterialsActive = pathname?.includes('/production/floor-consumption')
  const isMessagesActive = pathname?.includes('/communications')

  const handleOpenMobileDrawer = () => {
    window.dispatchEvent(new Event('printflow_open_mobile_nav'))
  }

  // 1. General Staff Bottom Navigation (clean touch targets, zero owner actions)
  if (isGeneralStaff) {
    const hasComms = can('view', 'whatsapp') || can('view', 'communications')
    return (
      <nav
        aria-label="Staff Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] select-none shadow-lg"
      >
        <div className={`grid ${hasComms ? 'grid-cols-4' : 'grid-cols-3'} h-16 items-center px-1`}>
          <Link
            href={getTenantNavHref('/portal', pathname, tenantSlug)}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isPortalActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserCheck className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[70px]">
              {tBilingual('Portal', 'পোর্টাল')}
            </span>
          </Link>

          <Link
            href={getTenantNavHref('/attendance', pathname, tenantSlug)}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isAttendanceActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[70px]">
              {tBilingual('Attendance', 'হাজিরা')}
            </span>
          </Link>

          {hasComms && (
            <Link
              href={getTenantNavHref('/communications', pathname, tenantSlug)}
              className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
                isMessagesActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="h-5 w-5 shrink-0" />
              <span className="text-xs font-semibold mt-1 truncate max-w-[70px]">
                {tBilingual('Messages', 'মেসেজ')}
              </span>
            </Link>
          )}

          <Link
            href={getTenantNavHref('/portal/my-workforce', pathname, tenantSlug)}
            className="flex flex-col items-center justify-center h-full min-h-[48px] py-1 text-muted-foreground hover:text-foreground transition-colors bangla-text"
          >
            <FileText className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[70px]">
              {tBilingual('Records', 'রেকর্ডস')}
            </span>
          </Link>
        </div>
      </nav>
    )
  }

  // 2. Machine Operator Bottom Navigation
  if (isOperator) {
    return (
      <nav
        aria-label="Operator Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] select-none shadow-lg"
      >
        <div className="grid grid-cols-4 h-16 items-center px-1">
          <Link
            href={getTenantNavHref('/operator', pathname, tenantSlug)}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isOperatorActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Printer className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[70px]">
              {tBilingual('Queue', 'আমার কাজ')}
            </span>
          </Link>

          <Link
            href={getTenantNavHref('/attendance', pathname, tenantSlug)}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isAttendanceActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[70px]">
              {tBilingual('Attendance', 'হাজিরা')}
            </span>
          </Link>

          <Link
            href={getTenantNavHref('/production/floor-consumption', pathname, tenantSlug)}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isMaterialsActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Flame className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[70px]">
              {tBilingual('Materials', 'কাঁচামাল')}
            </span>
          </Link>

          <Link
            href={getTenantNavHref('/portal', pathname, tenantSlug)}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isPortalActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserCheck className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[70px]">
              {tBilingual('Portal', 'পোর্টাল')}
            </span>
          </Link>
        </div>
      </nav>
    )
  }

  // 3. Graphic Designer Bottom Navigation
  if (isDesigner) {
    const canViewOrders = can('view', 'orders') || can('view', 'order')
    return (
      <nav
        aria-label="Designer Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] select-none shadow-lg"
      >
        <div className={`grid ${canViewOrders ? 'grid-cols-4' : 'grid-cols-3'} h-16 items-center px-1`}>
          <Link
            href={getTenantNavHref('/designer', pathname, tenantSlug)}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isDesignerActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Palette className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[70px]">
              {tBilingual('Jobs', 'ডিজাইন')}
            </span>
          </Link>

          {canViewOrders && (
            <Link
              href={getTenantNavHref('/orders', pathname, tenantSlug)}
              className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
                pathname?.includes('/orders') ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingBag className="h-5 w-5 shrink-0" />
              <span className="text-xs font-semibold mt-1 truncate max-w-[70px]">
                {tBilingual('Orders', 'অর্ডার')}
              </span>
            </Link>
          )}

          <Link
            href={getTenantNavHref('/attendance', pathname, tenantSlug)}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isAttendanceActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[70px]">
              {tBilingual('Attendance', 'হাজিরা')}
            </span>
          </Link>

          <Link
            href={getTenantNavHref('/portal', pathname, tenantSlug)}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isPortalActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserCheck className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[70px]">
              {tBilingual('Portal', 'পোর্টাল')}
            </span>
          </Link>
        </div>
      </nav>
    )
  }

  // 4. Standard Management / Owner Bottom Navigation (5 items)
  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] select-none shadow-lg"
      >
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {/* 1. Dashboard */}
          <Link
            href={getTenantNavHref('/dashboard', pathname, tenantSlug)}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isDashboardActive
                ? 'text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[60px]">
              {tBilingual('Dashboard', 'ড্যাশবোর্ড')}
            </span>
          </Link>

          {/* 2. My Work / Operator Terminal */}
          <Link
            href={getTenantNavHref('/operator', pathname, tenantSlug)}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isOperatorActive
                ? 'text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Printer className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[60px]">
              {tBilingual('My Work', 'আমার কাজ')}
            </span>
          </Link>

          {/* 3. Center New Work Floating Action */}
          <button
            type="button"
            onClick={() => setNewWorkOpen(true)}
            className="flex flex-col items-center justify-center -mt-5 min-h-[48px] min-w-[48px] cursor-pointer focus:outline-none"
            aria-label="Create New Work"
          >
            <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs border-2 border-background active:scale-95 transition-transform">
              <Plus className="h-6 w-6 stroke-[3]" />
            </div>
            <span className="text-xs font-bold text-foreground mt-1 bangla-text whitespace-nowrap">
              {tBilingual('New Work', 'নতুন কাজ')}
            </span>
          </button>

          {/* 4. Messages / Notifications */}
          <Link
            href={getTenantNavHref('/communications', pathname, tenantSlug)}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isMessagesActive
                ? 'text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[60px]">
              {tBilingual('Messages', 'মেসেজ')}
            </span>
          </Link>

          {/* 5. More (Open Drawer with All Modules & Search) */}
          <button
            type="button"
            onClick={handleOpenMobileDrawer}
            className="flex flex-col items-center justify-center h-full min-h-[48px] py-1 text-muted-foreground hover:text-foreground relative cursor-pointer focus:outline-none bangla-text"
            aria-label="Open Full Menu and Modules"
          >
            <Menu className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold mt-1 truncate max-w-[60px]">
              {tBilingual('More', 'আরও')}
            </span>
            {(!isOnline || pendingCount > 0) && (
              <span className="absolute top-2 right-3.5 h-2 w-2 rounded-full bg-warning ring-2 ring-background animate-pulse" />
            )}
          </button>
        </div>
      </nav>

      {/* New Work Modal */}
      {newWorkOpen && (
        <NewWorkWizard
          isOpen={true}
          isInlineModal={true}
          onClose={() => setNewWorkOpen(false)}
          onSuccess={() => setNewWorkOpen(false)}
        />
      )}

      {/* Offline Sync Drawer */}
      <OfflineSyncDrawer
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
      />
    </>
  )
}
