'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  realtimeManager,
  RealtimeConnectionStatus,
} from '@/lib/realtime/subscription-manager'

export interface RealtimeSyncState {
  isLive: boolean
  status: RealtimeConnectionStatus
  lastEventTime: number | null
}

export function useRealtimeSync(companyId?: string) {
  const [status, setStatus] = useState<RealtimeConnectionStatus>(() =>
    realtimeManager.getConnectionStatus()
  )
  const [lastEventTime, setLastEventTime] = useState<number | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // 1. Subscribe to status changes
    const unsubStatus = realtimeManager.onConnectionStatusChange((newStatus) => {
      setStatus(newStatus)
    })

    // 2. Subscribe to tenant sync if companyId is present
    if (companyId) {
      unsubRef.current = realtimeManager.subscribeToTenantSync(
        companyId,
        (_event) => {
          setLastEventTime(Date.now())
        }
      )
    }

    return () => {
      unsubStatus()
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
    }
  }, [companyId])

  const reconnect = useCallback(() => {
    if (companyId) {
      if (unsubRef.current) {
        unsubRef.current()
      }
      unsubRef.current = realtimeManager.subscribeToTenantSync(
        companyId,
        (_event) => {
          setLastEventTime(Date.now())
        }
      )
    }
  }, [companyId])

  return {
    isLive: status === 'connected',
    status,
    lastEventTime,
    reconnect,
  }
}
