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
import { ConfirmDialog } from '../shared/confirm-dialog'
import { dispatchToast } from '../shared/toast-feedback'

interface SyncCenterModalProps {
  open: boolean
  onClose: () => void
}

export function SyncCenterModal({ open, onClose }: SyncCenterModalProps) {
  const [pendingItems, setPendingItems] = useState<SyncBatchItemPayload[]>([])
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncBatchResult | null>(null)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

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
    if (syncing || pendingItems.length === 0) return
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
        dispatchToast({
          type: 'success',
          title: 'Sync Complete',
          titleBn: 'সিঙ্ক সম্পন্ন হয়েছে',
          message: `Synchronized ${syncedKeys.length} changes with server.`,
        })
      }
    } catch (err) {
      console.error('Manual sync failed', err)
      dispatchToast({
        type: 'error',
        title: 'Sync Failed',
        titleBn: 'সিঙ্ক ব্যর্থ হয়েছে',
        message: 'Could not connect to server to sync pending changes.',
      })
    } finally {
      setSyncing(false)
    }
  }

  function handleClearCache() {
    setIsClearConfirmOpen(true)
  }

  function confirmClearCache() {
    setIsClearing(true)
    try {
      LocalCacheSecurityManager.clearSensitiveLocalData()
      loadPending()
      dispatchToast({
        type: 'info',
        title: 'Cache Purged',
        titleBn: 'ক্যাশ মুছে ফেলা হয়েছে',
        message: 'Local offline cache and drafts have been securely purged.',
      })
      setIsClearConfirmOpen(false)
    } finally {
      setIsClearing(false)
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

      {/* Clear Cache Confirm Dialog */}
      <ConfirmDialog
        open={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}
        title="Clear Local Offline Cache?"
        titleBn="অফলাইন ক্যাশ মুছে ফেলবেন?"
        message="Are you sure you want to purge all local offline storage cache and drafts? Unsynced local drafts will be permanently cleared."
        messageBn="আপনি কি সব লোকাল অফলাইন ক্যাশ ও ড্রাফট মুছে ফেলতে চান? এটি নিরাপদ কিন্তু আন-সিঙ্কড ড্রাফট মুছে যাবে।"
        confirmText="Purge Cache"
        confirmTextBn="ক্যাশ মুছুন"
        cancelText="Cancel"
        cancelTextBn="বাতিল"
        isDestructive={true}
        isLoading={isClearing}
        onConfirm={confirmClearCache}
      />
    </div>
  )
}
