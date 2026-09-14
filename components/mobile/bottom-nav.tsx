'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Clock,
  Printer,
  Plus,
  MessageSquare,
  Menu,
  WifiOff,
  Cloud,
} from 'lucide-react'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { OfflineSyncDrawer } from './offline-sync-drawer'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { NewWorkWizard } from '@/components/orders/new-work-wizard'

export function MobileBottomNav() {
  const pathname = usePathname()
  const { company } = useTenant()
  const { tBilingual } = useI18n()
  const pathSlug = pathname ? pathname.split('/')[1] : null
  const tenantSlug = (pathSlug && pathSlug !== 'platform-admin' && pathSlug !== 'login' && pathSlug !== 'onboarding' ? pathSlug : company?.slug) || 'app'

  const { isOnline } = useNetworkStatus()
  const { pendingCount } = useOfflineQueue()

  const [newWorkOpen, setNewWorkOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)

  const isDashboardActive = pathname?.endsWith('/dashboard')
  const isOperatorActive = pathname?.includes('/operator')
  const isMessagesActive = pathname?.includes('/communications')

  const handleOpenMobileDrawer = () => {
    window.dispatchEvent(new Event('inkflow_open_mobile_nav'))
  }

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-950/95 backdrop-blur-md border-t border-slate-800 pb-[env(safe-area-inset-bottom)] select-none"
      >
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {/* 1. Today / Dashboard */}
          <Link
            href={`/${tenantSlug}/dashboard`}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isDashboardActive
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-semibold mt-1 truncate max-w-[60px]">
              {tBilingual('Today', 'আজকের কাজ')}
            </span>
          </Link>

          {/* 2. My Work / Operator Terminal */}
          <Link
            href={`/${tenantSlug}/operator`}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isOperatorActive
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-semibold mt-1 truncate max-w-[60px]">
              {tBilingual('My Work', 'আমার কাজ')}
            </span>
          </Link>

          {/* 3. Center + New Work Floating Action */}
          <button
            type="button"
            onClick={() => setNewWorkOpen(true)}
            className="flex flex-col items-center justify-center -mt-5 min-h-[48px] min-w-[48px] cursor-pointer focus:outline-none"
            aria-label="Create New Work"
          >
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 border-2 border-slate-950 active:scale-95 transition-transform">
              <Plus className="h-6 w-6 stroke-[3]" />
            </div>
            <span className="text-[10px] font-black text-white mt-1 bangla-text whitespace-nowrap">
              {tBilingual('+ New Work', '+ নতুন কাজ')}
            </span>
          </button>

          {/* 4. Messages / Notifications */}
          <Link
            href={`/${tenantSlug}/communications`}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors bangla-text ${
              isMessagesActive
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-semibold mt-1 truncate max-w-[60px]">
              {tBilingual('Messages', 'মেসেজ')}
            </span>
          </Link>

          {/* 5. More (Open Drawer with All Modules & Search) */}
          <button
            type="button"
            onClick={handleOpenMobileDrawer}
            className="flex flex-col items-center justify-center h-full min-h-[48px] py-1 text-slate-400 hover:text-slate-200 relative cursor-pointer focus:outline-none bangla-text"
            aria-label="Open Full Menu and Modules"
          >
            <Menu className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-semibold mt-1 truncate max-w-[60px]">
              {tBilingual('More', 'আরও')}
            </span>
            {(!isOnline || pendingCount > 0) && (
              <span className="absolute top-2 right-3.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-slate-950 animate-pulse" />
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
