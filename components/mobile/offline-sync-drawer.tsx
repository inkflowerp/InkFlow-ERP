'use client'

import React, { useEffect } from 'react'
import {
  X,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Wifi,
  WifiOff,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { formatTime } from '@/lib/formatters'

interface OfflineSyncDrawerProps {
  open: boolean
  onClose: () => void
}

export function OfflineSyncDrawer({ open, onClose }: OfflineSyncDrawerProps) {
  const { isOnline } = useNetworkStatus()
  const {
    queue,
    drafts,
    isSyncing,
    pendingCount,
    syncNow,
    retryItem,
    resolveConflict,
    clearSynced,
    deleteDraft,
  } = useOfflineQueue()

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-end animate-in fade-in-0 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
              {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Offline Hub & Sync Queue</h2>
              <p className="text-[11px] text-slate-400">
                {isOnline ? 'Connected to Dhaka Cloud' : 'Working Offline (Drafts Protected)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sync Controls */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-300 font-medium">
            {pendingCount} item{pendingCount === 1 ? '' : 's'} waiting to sync
          </span>
          <div className="flex items-center gap-1.5">
            {queue.some((i) => i.status === 'synced') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSynced}
                className="h-7 text-[11px] text-slate-400 hover:text-white"
              >
                Clear Synced
              </Button>
            )}
            <Button
              size="sm"
              disabled={isSyncing || !isOnline || pendingCount === 0}
              onClick={syncNow}
              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs font-sans">
          {/* Section 1: Offline Mutations Queue */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Mutation Queue ({queue.length})</span>
              <span className="text-[10px] text-slate-500 font-mono">FIFO Execution</span>
            </h3>

            {queue.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 text-center text-slate-500">
                No pending offline mutations.
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-white text-xs">{item.title}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {item.actionType} • {formatTime(item.timestamp)}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          item.status === 'synced'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : item.status === 'syncing'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                            : item.status === 'conflict'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : item.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Conflict or Error Resolution */}
                    {item.status === 'conflict' && (
                      <div className="p-2 rounded-lg bg-red-950/40 border border-red-800/60 text-[11px] text-red-300 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Version Conflict Detected</span>
                        </div>
                        <p className="text-[10px] text-red-300/80">{item.error}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => resolveConflict(item.id, 'overwrite')}
                            className="h-6 text-[10px] bg-red-800 hover:bg-red-700 text-white rounded px-2"
                          >
                            Overwrite Server
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveConflict(item.id, 'discard')}
                            className="h-6 text-[10px] border-slate-700 text-slate-300 rounded px-2"
                          >
                            Discard Local
                          </Button>
                        </div>
                      </div>
                    )}

                    {item.status === 'failed' && (
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
                        <span className="text-rose-400">{item.error || 'Sync failed'}</span>
                        <button
                          onClick={() => retryItem(item.id)}
                          className="font-bold text-indigo-400 hover:underline"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Saved Offline Drafts */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Saved Local Drafts ({drafts.length})</span>
              <span className="text-[10px] text-slate-500">Auto-saved</span>
            </h3>

            {drafts.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 text-center text-slate-500">
                No drafts saved locally.
              </div>
            ) : (
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{draft.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Type: {draft.formType} • Saved {formatTime(draft.updatedAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteDraft(draft.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                        title="Discard Draft"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-[10px] text-slate-500 text-center">
          PrintERP Offline Storage Engine • Safe local storage on device
        </div>
      </div>
    </div>
  )
}
