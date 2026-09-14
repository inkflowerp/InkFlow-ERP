'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Printer,
  Plus,
  Clock,
  Briefcase,
  WifiOff,
  Cloud,
  Layers,
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
  const isSalesActive = pathname?.includes('/sales') || pathname?.includes('/orders') || pathname?.includes('/billing')
  const isProductionActive = pathname?.includes('/production')

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-950/95 backdrop-blur-md border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {/* 1. Today / Dashboard */}
          <Link
            href={`/${tenantSlug}/dashboard`}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors ${
              isDashboardActive
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="h-5 w-5" />
            <span className="text-[10px] font-semibold mt-1">আজকের কাজ</span>
          </Link>

          {/* 2. My Work / Operator Terminal */}
          <Link
            href={`/${tenantSlug}/operator`}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors ${
              isOperatorActive
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer className="h-5 w-5" />
            <span className="text-[10px] font-semibold mt-1">আমার কাজ</span>
          </Link>

          {/* 3. Center + New Work Floating Action */}
          <button
            type="button"
            onClick={() => setNewWorkOpen(true)}
            className="flex flex-col items-center justify-center -mt-5 min-h-[48px] min-w-[48px] cursor-pointer"
            aria-label="New Work Order"
          >
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 border-2 border-slate-950 active:scale-95 transition-transform">
              <Plus className="h-6 w-6 stroke-[3]" />
            </div>
            <span className="text-[10px] font-black text-white mt-1">+ নতুন কাজ</span>
          </button>

          {/* 4. Sales & Billing */}
          <Link
            href={`/${tenantSlug}/sales`}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors ${
              isSalesActive
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="h-5 w-5" />
            <span className="text-[10px] font-semibold mt-1">সেলস ও বিল</span>
          </Link>

          {/* 5. Offline Sync Status */}
          <button
            type="button"
            onClick={() => setSyncOpen(true)}
            className="flex flex-col items-center justify-center h-full min-h-[48px] py-1 text-slate-400 hover:text-slate-200 relative cursor-pointer"
            aria-label="Offline Sync"
          >
            {!isOnline ? (
              <WifiOff className="h-5 w-5 text-amber-400 animate-pulse" />
            ) : (
              <Cloud className="h-5 w-5" />
            )}
            <span className="text-[10px] font-semibold mt-1">
              {!isOnline ? 'অফলাইন' : 'সিঙ্ক'}
            </span>
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-3 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-slate-950" />
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
