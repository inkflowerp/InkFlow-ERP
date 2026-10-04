'use client'

import React from 'react'
import { WifiOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useOfflineQueue } from '@/hooks/use-offline-queue'

interface NetworkBannerProps {
 onOpenSyncDrawer?: () => void
}

export function NetworkBanner({ onOpenSyncDrawer }: NetworkBannerProps) {
 const { isOnline, isReconnecting } = useNetworkStatus()
 const { pendingCount, isSyncing } = useOfflineQueue()

 if (isOnline && pendingCount === 0 && !isSyncing && !isReconnecting) {
 return null
  }

 return (
    <div className="w-full bg-muted border-b border-border text-foreground px-4 py-2 text-xs flex items-center justify-between transition-all">
      <div className="flex items-center gap-2 max-w-xl">
        {!isOnline ? (
          <span className="flex items-center gap-1.5 text-warning font-semibold">
            <WifiOff className="h-3.5 w-3.5 animate-pulse"/>
            <span>Offline Mode</span>
          </span>
        ) : isSyncing || isReconnecting ? (
          <span className="flex items-center gap-1.5 text-primary font-semibold">
            <RefreshCw className="h-3.5 w-3.5 animate-spin"/>
            <span>Reconnecting & Syncing...</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-success font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5"/>
            <span>Online</span>
          </span>
        )}

        <span className="text-muted-foreground truncate">
          {!isOnline
            ? 'Operating in temporary offline mode. In-progress drafts and mutations are stored safely on your phone.'
            : pendingCount > 0
            ? `${pendingCount} offline ${pendingCount === 1 ? 'change' : 'changes'} pending sync.`
            : 'All offline changes successfully synchronized.'}
        </span>
      </div>

      {pendingCount > 0 && onOpenSyncDrawer && (
        <button
 onClick={onOpenSyncDrawer}
 className="underline font-bold text-primary hover:text-primary ml-2 shrink-0 cursor-pointer">
 View Queue ({pendingCount})
        </button>
      )}
    </div>
  )
}
