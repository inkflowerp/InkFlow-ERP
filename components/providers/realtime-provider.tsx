'use client'

import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useCallback,
  useState,
  useRef,
} from 'react'
import { useRouter } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'
import { useRealtimeSync, RealtimeSyncState } from '@/hooks/use-realtime-sync'
import {
  realtimeManager,
  RealtimeConnectionStatus,
  TableSyncHandler,
  PresenceState,
  LiveOperationalTable,
} from '@/lib/realtime/subscription-manager'

export interface RealtimeContextValue extends RealtimeSyncState {
  reconnect: () => void
  broadcastSyncEvent: (event: {
    table: string
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    record: any
    oldRecord?: any
  }) => void
  registerTableHandler: (table: string, handler: TableSyncHandler) => () => void
  registerOptimisticMutation: (table: string, recordId: string, payload?: any) => void
  isOptimisticPending: (table: string, recordId: string) => boolean
  trackPresence: (presence: { module: string; targetId?: string; isEditing?: boolean }) => void
  presenceUsers: PresenceState[]
}

const RealtimeContext = createContext<RealtimeContextValue>({
  isLive: false,
  status: 'disconnected',
  lastEventTime: null,
  reconnect: () => {},
  broadcastSyncEvent: () => {},
  registerTableHandler: () => () => {},
  registerOptimisticMutation: () => {},
  isOptimisticPending: () => false,
  trackPresence: () => {},
  presenceUsers: [],
})

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { company, currentUser } = useTenant()
  const companyId = company?.id
  const syncState = useRealtimeSync(companyId)

  // Presence state tracking
  const [presenceUsers, setPresenceUsers] = useState<PresenceState[]>([])

  useEffect(() => {
    const unsub = realtimeManager.onPresenceChange((users) => {
      setPresenceUsers(users)
    })
    return () => unsub()
  }, [])

  // Slow fallback poll (60s) ONLY when socket is disconnected
  useEffect(() => {
    // When connected, DO NOT poll: Realtime delivers changes instantly (~1 second)
    if (syncState.status === 'connected') return

    const fallbackTimer = setInterval(() => {
      console.log('[RealtimeProvider] Socket disconnected; slow fallback refresh triggered (60s)...')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('printerp_data_sync'))
      }
      try {
        router.refresh()
      } catch {}
    }, 60000)

    return () => clearInterval(fallbackTimer)
  }, [syncState.status, router])

  const registerTableHandler = useCallback((table: string, handler: TableSyncHandler) => {
    return realtimeManager.registerTableHandler(table, handler)
  }, [])

  const registerOptimisticMutation = useCallback((table: string, recordId: string, payload?: any) => {
    realtimeManager.registerOptimisticMutation(table, recordId, payload)
  }, [])

  const isOptimisticPending = useCallback((table: string, recordId: string) => {
    return realtimeManager.isLocalOptimisticEcho(table, recordId)
  }, [])

  const trackPresence = useCallback(
    (presence: { module: string; targetId?: string; isEditing?: boolean }) => {
      if (!companyId) return
      const userId = currentUser?.user_id || currentUser?.id || 'unknown-user'
      const userName = currentUser?.profile?.full_name || currentUser?.profile?.email || 'User'
      realtimeManager.trackPresence(companyId, {
        userId,
        userName,
        module: presence.module,
        targetId: presence.targetId,
        isEditing: presence.isEditing,
      })
    },
    [companyId, currentUser]
  )

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
      registerTableHandler,
      registerOptimisticMutation,
      isOptimisticPending,
      trackPresence,
      presenceUsers,
    }),
    [
      syncState,
      companyId,
      registerTableHandler,
      registerOptimisticMutation,
      isOptimisticPending,
      trackPresence,
      presenceUsers,
    ]
  )

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  return useContext(RealtimeContext)
}

/**
 * Hook for modules to subscribe to table events and automatically invalidate or patch
 */
export function useTableSubscription(
  table: string | string[],
  onEvent?: TableSyncHandler,
  fallbackRouterRefresh = false
) {
  const router = useRouter()
  const { registerTableHandler } = useRealtime()

  useEffect(() => {
    const tables = Array.isArray(table) ? table : [table]
    const unsubs = tables.map((tbl) =>
      registerTableHandler(tbl, (event) => {
        if (onEvent) {
          onEvent(event)
        } else if (fallbackRouterRefresh && !event.isEcho) {
          try {
            router.refresh()
          } catch {}
        }
      })
    )
    return () => {
      unsubs.forEach((unsub) => unsub())
    }
  }, [table, onEvent, fallbackRouterRefresh, registerTableHandler, router])
}

/**
 * Hook for observing who is editing or viewing what in production/design boards
 */
export function usePresence(module?: string, targetId?: string) {
  const { presenceUsers, trackPresence } = useRealtime()

  const filteredUsers = useMemo(() => {
    if (!module && !targetId) return presenceUsers
    return presenceUsers.filter((u) => {
      if (module && u.module !== module) return false
      if (targetId && u.targetId !== targetId) return false
      return true
    })
  }, [presenceUsers, module, targetId])

  const setEditing = useCallback(
    (isEditing: boolean) => {
      if (module) {
        trackPresence({ module, targetId, isEditing })
      }
    },
    [module, targetId, trackPresence]
  )

  return { users: filteredUsers, setEditing }
}
