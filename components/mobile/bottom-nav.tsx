'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  Zap,
  Printer,
  Cloud,
  WifiOff,
} from 'lucide-react'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { QuickQuotationModal } from './quick-quotation-modal'
import { OfflineSyncDrawer } from './offline-sync-drawer'
import { useTenant } from '@/hooks/use-tenant'

export function MobileBottomNav() {
  const pathname = usePathname()
  const { company } = useTenant()
  const pathSlug = pathname ? pathname.split('/')[1] : null
  const tenantSlug = (pathSlug && pathSlug !== 'platform-admin' && pathSlug !== 'login' && pathSlug !== 'onboarding' ? pathSlug : company?.slug) || 'app'

  const { isOnline } = useNetworkStatus()
  const { pendingCount } = useOfflineQueue()

  const [quoteOpen, setQuoteOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)

  const isDashboardActive = pathname?.endsWith('/dashboard')
  const isSalesActive = pathname?.includes('/sales') || pathname?.includes('/quotations')
  const isProductionActive = pathname?.includes('/production')

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-950/95 backdrop-blur-md border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {/* 1. Dashboard / Owner */}
          <Link
            href={`/${tenantSlug}/dashboard`}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors ${
              isDashboardActive
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs font-semibold mt-1 tracking-normal bangla-text">Dashboard</span>
          </Link>

          {/* 2. Sales */}
          <Link
            href={`/${tenantSlug}/sales`}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors ${
              isSalesActive
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="h-5 w-5" />
            <span className="text-xs font-semibold mt-1 tracking-normal bangla-text">Sales</span>
          </Link>

          {/* 3. Center Quick Quote Floating Action */}
          <button
            type="button"
            onClick={() => setQuoteOpen(true)}
            className="flex flex-col items-center justify-center -mt-5 min-h-[48px] min-w-[48px] cursor-pointer"
            aria-label="Quick Quote"
          >
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 border-2 border-slate-950 active:scale-95 transition-transform">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <span className="text-xs font-bold text-white mt-1 bangla-text">Quote</span>
          </button>

          {/* 4. Production Floor */}
          <Link
            href={`/${tenantSlug}/production`}
            className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors ${
              isProductionActive
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer className="h-5 w-5" />
            <span className="text-xs font-semibold mt-1 tracking-normal bangla-text">Press</span>
          </Link>

          {/* 5. Offline Sync & Drafts */}
          <button
            type="button"
            onClick={() => setSyncOpen(true)}
            className="flex flex-col items-center justify-center h-full min-h-[48px] py-1 text-slate-400 hover:text-slate-200 relative cursor-pointer"
            aria-label="Offline Sync Status"
          >
            {!isOnline ? (
              <WifiOff className="h-5 w-5 text-amber-400 animate-pulse" />
            ) : (
              <Cloud className="h-5 w-5" />
            )}
            <span className="text-xs font-semibold mt-1 tracking-normal bangla-text">Sync</span>

            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-4 h-4.5 min-w-[18px] px-1 rounded-full bg-indigo-600 text-white font-mono text-2xs font-bold flex items-center justify-center shadow-xs">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Quick Quotation Modal */}
      <QuickQuotationModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        tenantSlug={tenantSlug}
      />

      {/* Offline Sync Drawer */}
      <OfflineSyncDrawer open={syncOpen} onClose={() => setSyncOpen(false)} />
    </>
  )
}
