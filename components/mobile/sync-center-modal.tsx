'use client'

// ==============================================================================
// InkFlow ERP - Sync Center Modal (V8)
// User-Facing Synchronization Status, Conflict Explanation & Retry Center
// ==============================================================================

import React, { useState, useEffect } from 'react'
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Cloud,
  ShieldCheck,
} from 'lucide-react'
import { ClientSyncManager } from '../../lib/offline/client-sync.ts'
import { LocalCacheSecurityManager } from '../../lib/offline/local-cache-security.ts'
import { processSyncBatchAction } from '../../actions/sync.actions.ts'
import type { SyncBatchItemPayload, SyncBatchResult } from '../../types/sync.types.ts'

interface SyncCenterModalProps {
  open: boolean
  onClose: () => void
}

export function SyncCenterModal({ open, onClose }: SyncCenterModalProps) {
  const [pendingItems, setPendingItems] = useState<SyncBatchItemPayload[]>([])
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncBatchResult | null>(null)

  useEffect(() => {
    if (open) {
      loadPending()
    }
  }, [open])

  function loadPending() {
    const items = ClientSyncManager.getLocalOutbox('default')
    setPendingItems(items)
  }

  async function handleSyncNow() {
    if (pendingItems.length === 0) return
    setSyncing(true)
    try {
      const res = await processSyncBatchAction(pendingItems)
      if (res.success && res.data) {
        setLastResult(res.data)
        const syncedKeys = res.data.results
          .filter((r) => r.status === 'synced')
          .map((r) => r.idempotency_key)
        ClientSyncManager.removeProcessedItems('default', syncedKeys)
        loadPending()
      }
    } catch (err) {
      console.error('Manual sync failed', err)
    } finally {
      setSyncing(false)
    }
  }

  function handleClearCache() {
    if (confirm('Clear all local offline cache and drafts for security?')) {
      LocalCacheSecurityManager.clearSensitiveLocalData()
      loadPending()
      alert('Local tenant cache purged.')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold">Sync Center</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Summary */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Outbox Queue:</span>
            <span className="text-xs font-mono font-bold text-indigo-400">
              {pendingItems.length} operations pending
            </span>
          </div>

          {lastResult && (
            <div className="pt-2 border-t border-slate-800/60 text-xs space-y-1">
              <div className="flex items-center justify-between text-emerald-400">
                <span>✓ Synced authoritatively:</span>
                <span className="font-bold">{lastResult.synced_count}</span>
              </div>
              {lastResult.conflict_count > 0 && (
                <div className="flex items-center justify-between text-amber-400">
                  <span>⚠ Conflicts detected:</span>
                  <span className="font-bold">{lastResult.conflict_count}</span>
                </div>
              )}
              {lastResult.failed_count > 0 && (
                <div className="flex items-center justify-between text-rose-400">
                  <span>✕ Failed operations:</span>
                  <span className="font-bold">{lastResult.failed_count}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pending Items List */}
        <div className="max-h-56 overflow-y-auto space-y-2 mb-4 pr-1">
          {pendingItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              All client operations are synced with the authoritative server.
            </div>
          ) : (
            pendingItems.map((item) => (
              <div
                key={item.idempotency_key}
                className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-200">{item.action_type}</div>
                  <div className="text-3xs font-mono text-slate-400">
                    ID: {item.idempotency_key.substring(0, 18)}...
                  </div>
                </div>
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <button
            disabled={syncing || pendingItems.length === 0}
            onClick={handleSyncNow}
            className="w-full min-h-[44px] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronizing with Server...' : 'Sync Now'}
          </button>

          <button
            onClick={handleClearCache}
            className="w-full min-h-[40px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            Purge Local Storage Cache
          </button>
        </div>
      </div>
    </div>
  )
}
