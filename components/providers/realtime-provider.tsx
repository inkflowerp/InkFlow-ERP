'use client'

import React, { createContext, useContext, useMemo } from 'react'
import { useTenant } from '@/hooks/use-tenant'
import { useRealtimeSync, RealtimeSyncState } from '@/hooks/use-realtime-sync'
import { RealtimeConnectionStatus } from '@/lib/realtime/subscription-manager'

interface RealtimeContextValue extends RealtimeSyncState {
  reconnect: () => void
}

const RealtimeContext = createContext<RealtimeContextValue>({
  isLive: false,
  status: 'disconnected',
  lastEventTime: null,
  reconnect: () => {},
})

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { company } = useTenant()
  const syncState = useRealtimeSync(company?.id)

  const value = useMemo(
    () => ({
      ...syncState,
    }),
    [syncState]
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
