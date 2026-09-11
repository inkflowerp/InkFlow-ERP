'use client'

import React, { createContext, useContext, useMemo } from 'react'
import { useTenant } from '@/hooks/use-tenant'
import { useRealtimeSync, RealtimeSyncState } from '@/hooks/use-realtime-sync'
import { realtimeManager, RealtimeConnectionStatus } from '@/lib/realtime/subscription-manager'

interface RealtimeContextValue extends RealtimeSyncState {
  reconnect: () => void
  broadcastSyncEvent: (event: {
    table: string
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    record: any
    oldRecord?: any
  }) => void
}

const RealtimeContext = createContext<RealtimeContextValue>({
  isLive: false,
  status: 'disconnected',
  lastEventTime: null,
  reconnect: () => {},
  broadcastSyncEvent: () => {},
})

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { company } = useTenant()
  const companyId = company?.id
  const syncState = useRealtimeSync(companyId)

  const value = useMemo(
    () => ({
      ...syncState,
      broadcastSyncEvent: (event: {
        table: string
        eventType: 'INSERT' | 'UPDATE' | 'DELETE'
        record: any
        oldRecord?: any
      }) => {
        if (companyId) {
          realtimeManager.broadcastSyncEvent(companyId, event)
        }
      },
    }),
    [syncState, companyId]
  )

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  return useContext(RealtimeContext)
}
