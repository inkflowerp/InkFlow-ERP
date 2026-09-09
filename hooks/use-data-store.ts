'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  PrintERPDataStore,
  StorageKey,
  getInitialSeedData,
  isTransactionalKey,
} from '@/lib/db/data-store'

export type DataStoreHelpers = {
  addItem: <I extends { id?: string }>(item: I) => I[]
  updateItem: <I extends { id?: string }>(
    idOrPredicate: string | ((item: I) => boolean),
    updates: Partial<I>
  ) => I | null
  removeItem: <I extends { id?: string }>(
    idOrPredicate: string | ((item: I) => boolean)
  ) => boolean
  findItem: <I extends { id?: string }>(
    idOrPredicate: string | ((item: I) => boolean)
  ) => I | null
  reload: () => void
}

export type DataStoreResult<T> = {
  data: T
  set: (newData: T | ((prev: T) => T)) => void
  addItem: <I extends { id?: string }>(item: I) => I[]
  updateItem: <I extends { id?: string }>(
    idOrPredicate: string | ((item: I) => boolean),
    updates: Partial<I>
  ) => I | null
  removeItem: <I extends { id?: string }>(
    idOrPredicate: string | ((item: I) => boolean)
  ) => boolean
  findItem: <I extends { id?: string }>(
    idOrPredicate: string | ((item: I) => boolean)
  ) => I | null
  reload: () => void
  [Symbol.iterator](): Iterator<T | ((newData: T | ((prev: T) => T)) => void) | DataStoreHelpers>
} & [T, (newData: T | ((prev: T) => T)) => void, DataStoreHelpers]

export function useDataStore<T = any>(
  key: StorageKey,
  initialSeed?: T,
  customTenantSlug?: string
): DataStoreResult<T> {
  const initialSeedRef = useRef(initialSeed)
  initialSeedRef.current = initialSeed

  const [data, setData] = useState<T>(() => {
    const slug = customTenantSlug || PrintERPDataStore.getActiveTenantSlug()
    if (slug !== 'padma-digital' && isTransactionalKey(key)) {
      const stored = PrintERPDataStore.get<T>(key, slug)
      return (stored !== undefined && stored !== null ? stored : ([] as unknown as T))
    }
    if (initialSeed !== undefined) {
      return initialSeed
    }
    const seed = getInitialSeedData(key, slug)
    if (seed !== null && seed !== undefined) {
      return seed as T
    }
    return PrintERPDataStore.get<T>(key, slug)
  })

  const reload = useCallback(() => {
    const slug = customTenantSlug || PrintERPDataStore.getActiveTenantSlug()
    const latest = PrintERPDataStore.get<T>(key, slug)
    if (latest !== undefined && latest !== null) {
      setData(latest)
    } else if (slug !== 'padma-digital' && isTransactionalKey(key)) {
      setData([] as unknown as T)
    } else if (initialSeedRef.current !== undefined) {
      setData(initialSeedRef.current)
    }
  }, [key, customTenantSlug])

  const reloadRef = useRef(reload)
  useEffect(() => {
    reloadRef.current = reload
  }, [reload])

  useEffect(() => {
    // Initial sync on mount
    reloadRef.current()

    const slug = customTenantSlug || PrintERPDataStore.getActiveTenantSlug()
    const effectiveKey = PrintERPDataStore.getEffectiveKey(key, slug)

    const handleCustomSync = (e: Event) => {
      const customEvent = e as CustomEvent
      if (
        customEvent.detail?.key === key ||
        customEvent.detail?.effectiveKey === effectiveKey ||
        customEvent.detail?.all === true
      ) {
        reloadRef.current()
      }
    }

    const handleKeyUpdate = () => {
      reloadRef.current()
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key || e.key === effectiveKey) {
        reloadRef.current()
      }
    }

    window.addEventListener('printerp_data_sync', handleCustomSync)
    window.addEventListener(`${key}_updated`, handleKeyUpdate)
    window.addEventListener(`${effectiveKey}_updated`, handleKeyUpdate)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('printerp_data_sync', handleCustomSync)
      window.removeEventListener(`${key}_updated`, handleKeyUpdate)
      window.removeEventListener(`${effectiveKey}_updated`, handleKeyUpdate)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [key, customTenantSlug])

  const set = useCallback(
    (newData: T | ((prev: T) => T)) => {
      setData((prev) => {
        const slug = customTenantSlug || PrintERPDataStore.getActiveTenantSlug()
        const next = typeof newData === 'function' ? (newData as (prev: T) => T)(prev) : newData
        PrintERPDataStore.set(key, next, true, slug)
        return next
      })
    },
    [key, customTenantSlug]
  )

  const addItem = useCallback(
    <I extends { id?: string }>(item: I) => {
      const slug = customTenantSlug || PrintERPDataStore.getActiveTenantSlug()
      const updated = PrintERPDataStore.addItem(key, item, slug)
      setData(updated as unknown as T)
      return updated
    },
    [key, customTenantSlug]
  )

  const updateItem = useCallback(
    <I extends { id?: string }>(
      idOrPredicate: string | ((item: I) => boolean),
      updates: Partial<I>
    ) => {
      const slug = customTenantSlug || PrintERPDataStore.getActiveTenantSlug()
      const updated = PrintERPDataStore.updateItem(key, idOrPredicate as any, updates, slug)
      reload()
      return updated
    },
    [key, customTenantSlug, reload]
  )

  const removeItem = useCallback(
    <I extends { id?: string }>(idOrPredicate: string | ((item: I) => boolean)) => {
      const slug = customTenantSlug || PrintERPDataStore.getActiveTenantSlug()
      const res = PrintERPDataStore.removeItem(key, idOrPredicate as any, slug)
      reload()
      return res
    },
    [key, customTenantSlug, reload]
  )

  const findItem = useCallback(
    <I extends { id?: string }>(idOrPredicate: string | ((item: I) => boolean)) => {
      const slug = customTenantSlug || PrintERPDataStore.getActiveTenantSlug()
      return PrintERPDataStore.findItem<I>(key, idOrPredicate as any, slug)
    },
    [key, customTenantSlug]
  )

  const helpers: DataStoreHelpers = useMemo(
    () => ({
      addItem,
      updateItem,
      removeItem,
      findItem,
      reload,
    }),
    [addItem, updateItem, removeItem, findItem, reload]
  )

  const resultObj = useMemo(() => {
    return {
      data,
      set,
      ...helpers,
      0: data,
      1: set,
      2: helpers,
      length: 3,
      [Symbol.iterator]: function* () {
        yield data
        yield set
        yield helpers
      },
    }
  }, [data, set, helpers])

  return resultObj as unknown as DataStoreResult<T>
}
