'use client'

import { useState, useEffect } from 'react'
import { OfflineSyncManager } from '@/lib/offline/sync-queue'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)

    const handleOnline = async () => {
      setIsOnline(true)
      setIsReconnecting(true)
      try {
        // Auto replay queue when back online
        await OfflineSyncManager.processQueue()
      } finally {
        setIsReconnecting(false)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, isReconnecting }
}
