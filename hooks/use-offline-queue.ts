'use client'

import { useState, useEffect, useCallback } from 'react'
import { OfflineSyncItem, OfflineDraft } from '@/types/offline.types'
import { OfflineSyncManager } from '@/lib/offline/sync-queue'
import { OfflineDraftManager } from '@/lib/offline/drafts'

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineSyncItem[]>([])
  const [drafts, setDrafts] = useState<OfflineDraft[]>([])
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  const reloadData = useCallback(() => {
    setQueue(OfflineSyncManager.getQueue())
    setDrafts(OfflineDraftManager.getDrafts())
  }, [])

  useEffect(() => {
    reloadData()

    const handleQueueUpdate = () => reloadData()
    const handleDraftsUpdate = () => reloadData()

    window.addEventListener('printerp_sync_queue_updated', handleQueueUpdate)
    window.addEventListener('printerp_drafts_updated', handleDraftsUpdate)

    return () => {
      window.removeEventListener('printerp_sync_queue_updated', handleQueueUpdate)
      window.removeEventListener('printerp_drafts_updated', handleDraftsUpdate)
    }
  }, [reloadData])

  const syncNow = async () => {
    setIsSyncing(true)
    try {
      await OfflineSyncManager.processQueue(() => reloadData())
    } finally {
      setIsSyncing(false)
      reloadData()
    }
  }

  const retryItem = (id: string) => {
    OfflineSyncManager.retryItem(id)
    reloadData()
  }

  const resolveConflict = (id: string, resolution: 'overwrite' | 'discard') => {
    OfflineSyncManager.resolveConflict(id, resolution)
    reloadData()
  }

  const clearSynced = () => {
    OfflineSyncManager.clearSynced()
    reloadData()
  }

  const deleteDraft = (id: string) => {
    OfflineDraftManager.deleteDraft(id)
    reloadData()
  }

  const pendingCount = queue.filter((i) => i.status === 'queued' || i.status === 'failed' || i.status === 'conflict').length

  return {
    queue,
    drafts,
    isSyncing,
    pendingCount,
    syncNow,
    retryItem,
    resolveConflict,
    clearSynced,
    deleteDraft,
    reloadData,
  }
}
