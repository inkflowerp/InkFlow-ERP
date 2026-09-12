'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'
import { SubscriptionProvider } from '@/hooks/use-subscription'
import { RealtimeProvider } from '@/components/providers/realtime-provider'
import { SubscriptionStatusBanner } from '@/components/subscriptions/subscription-status-banner'
import { TrialUpgradeModal } from '@/components/subscriptions/trial-upgrade-modal'
import { LimitExceededModal } from '@/components/subscriptions/limit-exceeded-modal'
import { TrialNotificationPopup } from '@/components/subscriptions/trial-notification-popup'
import { RealtimeNotificationPopup } from './realtime-notification-popup'
import { NetworkBanner } from '@/components/pwa/network-banner'
import { MobileBottomNav } from '@/components/mobile/bottom-nav'
import { useShortcuts } from '@/hooks/use-shortcuts'
import { ToastProvider } from '@/components/shared/toast-feedback'
import { PlatformSupportBanner } from './platform-support-banner'

const CommandPalette = dynamic(
  () => import('@/components/search/command-palette').then((mod) => mod.CommandPalette),
  { ssr: false }
)
const OfflineSyncDrawer = dynamic(
  () => import('@/components/mobile/offline-sync-drawer').then((mod) => mod.OfflineSyncDrawer),
  { ssr: false }
)
const PWAInstaller = dynamic(
  () => import('@/components/pwa/pwa-installer').then((mod) => mod.PWAInstaller),
  { ssr: false }
)

export function AppShell({ children }: { children: React.ReactNode }) {
  const [syncDrawerOpen, setSyncDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchMode, setSearchMode] = useState<'search' | 'quick-new'>('search')

  // Global keyboard shortcuts (/ and N)
  useShortcuts({
    onOpenSearch: () => {
      setSearchMode('search')
      setSearchOpen(true)
    },
    onOpenNew: () => {
      setSearchMode('quick-new')
      setSearchOpen(true)
    },
    onClose: () => setSearchOpen(false),
  })

  // Custom DOM event triggers from TopNav or Mobile
  useEffect(() => {
    const handleOpenSearch = () => {
      setSearchMode('search')
      setSearchOpen(true)
    }
    const handleOpenNew = () => {
      setSearchMode('quick-new')
      setSearchOpen(true)
    }

    window.addEventListener('printerp_open_search', handleOpenSearch)
    window.addEventListener('printerp_open_new', handleOpenNew)

    return () => {
      window.removeEventListener('printerp_open_search', handleOpenSearch)
      window.removeEventListener('printerp_open_new', handleOpenNew)
    }
  }, [])

  return (
    <RealtimeProvider>
      <SubscriptionProvider>
        <ToastProvider>
          <div className="flex h-screen max-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex-col overflow-hidden">
            <PlatformSupportBanner />
            <NetworkBanner onOpenSyncDrawer={() => setSyncDrawerOpen(true)} />
            <SubscriptionStatusBanner />
            <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
              <Sidebar />
              <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
                <TopNav />
                <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
                  <div className="mx-auto max-w-7xl">{children}</div>
                </main>
              </div>
            </div>
            <PWAInstaller />
            <MobileBottomNav />
            <OfflineSyncDrawer
              open={syncDrawerOpen}
              onClose={() => setSyncDrawerOpen(false)}
            />
            <CommandPalette
              isOpen={searchOpen}
              onClose={() => setSearchOpen(false)}
              initialMode={searchMode}
            />
            <TrialUpgradeModal />
            <LimitExceededModal />
            <TrialNotificationPopup />
            <RealtimeNotificationPopup />
          </div>
        </ToastProvider>
      </SubscriptionProvider>
    </RealtimeProvider>
  )
}
