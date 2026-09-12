'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  PlatformNotificationItem,
  PlatformNotificationFilterOptions,
} from '@/types/platform.types'
import {
  getPlatformNotificationsAction,
  markPlatformNotificationReadAction,
  markAllPlatformNotificationsReadAction,
  deletePlatformNotificationAction,
  clearAllReadPlatformNotificationsAction,
} from '@/actions/platform-data.actions'
import { realtimeManager, PostgresChangeEvent } from '@/lib/realtime/subscription-manager'

interface UsePlatformNotificationsOptions extends PlatformNotificationFilterOptions {
  autoSubscribe?: boolean
}

export function usePlatformNotifications(initialOptions?: UsePlatformNotificationsOptions) {
  const [notifications, setNotifications] = useState<PlatformNotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState<boolean>(false)
  const [page, setPage] = useState<number>(initialOptions?.page || 1)
  const [filters, setFilters] = useState<PlatformNotificationFilterOptions>({
    page: initialOptions?.page || 1,
    pageSize: initialOptions?.pageSize || 20,
    category: initialOptions?.category,
    severity: initialOptions?.severity,
    unreadOnly: initialOptions?.unreadOnly,
    search: initialOptions?.search,
  })

  const filtersRef = useRef(filters)
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  const isMountedRef = useRef(true)

  // Fetch notifications from authoritative server action
  const fetchNotifications = useCallback(
    async (targetPage = 1, append = false, silent = false) => {
      if (!silent && !append) setLoading(true)
      if (append) setLoadingMore(true)
      setError(null)

      try {
        const queryOptions: PlatformNotificationFilterOptions = {
          ...filtersRef.current,
          page: targetPage,
        }

        const res = await getPlatformNotificationsAction(queryOptions)

        if (!isMountedRef.current) return

        if (res.success && res.data) {
          if (append) {
            setNotifications((prev) => {
              const existingIds = new Set(prev.map((n) => n.id))
              const newItems = (res.data || []).filter((item) => !existingIds.has(item.id))
              return [...prev, ...newItems]
            })
          } else {
            setNotifications(res.data)
          }

          setTotalCount(res.totalCount ?? res.data.length)
          setUnreadCount(res.unreadCount ?? res.data.filter((n) => !n.is_read).length)
          setHasMore(res.hasMore ?? false)
          setPage(targetPage)
        } else {
          setError(res.error || 'Failed to load platform notifications')
        }
      } catch (err: any) {
        if (!isMountedRef.current) return
        setError(err?.message || 'Network error while fetching platform notifications')
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    []
  )

  // Initial load and filter change trigger
  useEffect(() => {
    isMountedRef.current = true
    fetchNotifications(1, false, false)

    return () => {
      isMountedRef.current = false
    }
  }, [filters.category, filters.severity, filters.unreadOnly, filters.search, filters.pageSize, fetchNotifications])

  // Realtime subscription setup with automatic event handling & gap protection
  useEffect(() => {
    if (initialOptions?.autoSubscribe === false) return

    const handleRealtimeChange = (changeEvent: PostgresChangeEvent<PlatformNotificationItem>) => {
      const { eventType, new: newRecord, old: oldRecord } = changeEvent
      if (!isMountedRef.current) return

      if (eventType === 'INSERT' && newRecord) {
        setNotifications((prev) => {
          // Check for duplicate ID
          if (prev.some((n) => n.id === newRecord.id)) {
            return prev
          }

          // Check if it satisfies active category filter (fallback: 'all' or empty shows everything)
          const currentCategory = filtersRef.current.category
          if (currentCategory && currentCategory !== 'all') {
            const matchesCategory =
              (currentCategory === 'support' && (newRecord.type === 'support' || newRecord.type?.includes('support'))) ||
              (currentCategory === 'tenant' && (newRecord.type === 'tenant' || newRecord.type === 'tenant_lifecycle')) ||
              (currentCategory === 'billing' && newRecord.type === 'billing') ||
              (currentCategory === 'system' && (newRecord.type === 'system' || newRecord.type === 'security' || newRecord.type === 'backup' || newRecord.type === 'maintenance'))

            if (!matchesCategory) {
              // Still update unread and total counters even if hidden by current category filter tab
              if (!newRecord.is_read) {
                setUnreadCount((c) => c + 1)
              }
              setTotalCount((t) => t + 1)
              return prev
            }
          }

          // If unreadOnly filter is on and new item is read, skip list
          if (filtersRef.current.unreadOnly && newRecord.is_read) {
            return prev
          }

          if (!newRecord.is_read) {
            setUnreadCount((c) => c + 1)
          }
          setTotalCount((t) => t + 1)

          // Prepend newest notification at the top of list
          return [newRecord, ...prev]
        })
      } else if (eventType === 'UPDATE' && newRecord) {
        setNotifications((prev) => {
          const index = prev.findIndex((n) => n.id === newRecord.id)
          if (index === -1) {
            // If item wasn't in state but now updated
            return prev
          }

          const oldItem = prev[index]
          // Adjust unread counter if read state transitioned
          if (!oldItem.is_read && newRecord.is_read) {
            setUnreadCount((c) => Math.max(0, c - 1))
          } else if (oldItem.is_read && !newRecord.is_read) {
            setUnreadCount((c) => c + 1)
          }

          const next = [...prev]
          next[index] = { ...oldItem, ...newRecord }
          return next
        })
      } else if (eventType === 'DELETE') {
        const deletedId = oldRecord?.id || (newRecord as any)?.id
        if (!deletedId) return

        setNotifications((prev) => {
          const target = prev.find((n) => n.id === deletedId)
          if (target && !target.is_read) {
            setUnreadCount((c) => Math.max(0, c - 1))
          }
          setTotalCount((t) => Math.max(0, t - 1))
          return prev.filter((n) => n.id !== deletedId)
        })
      }
    }

    const unsubscribe = realtimeManager.subscribeToPlatformNotifications(handleRealtimeChange)

    // Visibility / reconnect reconciliation: check freshness when returning to the tab
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchNotifications(1, false, true)
      }
    }

    const handleOnline = () => {
      fetchNotifications(1, false, true)
    }

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('online', handleOnline)
    }

    return () => {
      unsubscribe()
      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('online', handleOnline)
      }
    }
  }, [fetchNotifications, initialOptions?.autoSubscribe])

  // Load next page for pagination / infinite scroll
  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    await fetchNotifications(page + 1, true, false)
  }, [loadingMore, hasMore, page, fetchNotifications])

  // Optimistic & server-backed Mark As Read
  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    )
    setUnreadCount((c) => Math.max(0, c - 1))

    try {
      await markPlatformNotificationReadAction(id)
    } catch (err) {
      console.error('[usePlatformNotifications] Failed to mark notification read:', err)
      // Re-sync with server state on failure
      fetchNotifications(1, false, true)
    }
  }, [fetchNotifications])

  // Optimistic & server-backed Mark All As Read
  const markAllAsRead = useCallback(async () => {
    const nowIso = new Date().toISOString()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: nowIso })))
    setUnreadCount(0)

    try {
      await markAllPlatformNotificationsReadAction()
    } catch (err) {
      console.error('[usePlatformNotifications] Failed to mark all notifications read:', err)
      fetchNotifications(1, false, true)
    }
  }, [fetchNotifications])

  // Optimistic & server-backed Delete
  const deleteNotification = useCallback(
    async (id: string) => {
      setNotifications((prev) => {
        const item = prev.find((n) => n.id === id)
        if (item && !item.is_read) {
          setUnreadCount((c) => Math.max(0, c - 1))
        }
        setTotalCount((t) => Math.max(0, t - 1))
        return prev.filter((n) => n.id !== id)
      })

      try {
        await deletePlatformNotificationAction(id)
      } catch (err) {
        console.error('[usePlatformNotifications] Failed to delete notification:', err)
        fetchNotifications(1, false, true)
      }
    },
    [fetchNotifications]
  )

  // Optimistic & server-backed Clear All Read
  const clearAllRead = useCallback(async () => {
    setNotifications((prev) => prev.filter((n) => !n.is_read))
    setTotalCount((t) => Math.max(0, unreadCount))

    try {
      await clearAllReadPlatformNotificationsAction()
    } catch (err) {
      console.error('[usePlatformNotifications] Failed to clear read notifications:', err)
      fetchNotifications(1, false, true)
    }
  }, [unreadCount, fetchNotifications])

  const updateFilters = useCallback((newFilters: Partial<PlatformNotificationFilterOptions>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset page when filters change
    }))
  }, [])

  return {
    notifications,
    unreadCount,
    totalCount,
    loading,
    loadingMore,
    error,
    hasMore,
    page,
    pageSize: filters.pageSize || 20,
    filters,
    setFilters: updateFilters,
    fetchMore,
    refetch: () => fetchNotifications(1, false, false),
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllRead,
  }
}
