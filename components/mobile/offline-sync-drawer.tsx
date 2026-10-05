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
 className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in-0 cursor-pointer"onClick={onClose}
    >
      <div
 className="w-full max-w-md bg-surface-inset border-l border-border h-full flex flex-col shadow-lg cursor-default"onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-inset">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isOnline ? 'bg-success/10 border-success-border/30 text-success' : 'bg-warning/10 border-warning-border/30 text-warning'}`}>
              {isOnline ? <Wifi className="h-4 w-4"/> : <WifiOff className="h-4 w-4"/>}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Offline Hub & Sync Queue</h2>
              <p className="text-xs text-muted-foreground">
                {isOnline ? 'Connected to Dhaka Cloud' : 'Working Offline (Drafts Protected)'}
              </p>
            </div>
          </div>
          <button
 onClick={onClose}
 className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-elevated">
            <X className="h-4 w-4"/>
          </button>
        </div>

        {/* Sync Controls */}
        <div className="p-3 bg-surface-inset border-b border-border flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            {pendingCount} item{pendingCount === 1 ? '' : 's'} waiting to sync
          </span>
          <div className="flex items-center gap-1.5">
            {queue.some((i) => i.status === 'synced') && (
              <Button
 size="sm"variant="ghost"onClick={clearSynced}
 className="h-7 text-xs text-muted-foreground hover:text-foreground">
 Clear Synced
              </Button>
            )}
            <Button
 size="sm"disabled={isSyncing || !isOnline || pendingCount === 0}
 onClick={syncNow}
 className="h-7 text-xs bg-primary hover:bg-primary text-white rounded-lg font-semibold">
              <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs font-sans">
          {/* Section 1: Offline Mutations Queue */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Mutation Queue ({queue.length})</span>
              <span className="text-xs text-muted-foreground tabular-nums">FIFO Execution</span>
            </h3>

            {queue.length === 0 ? (
              <div className="p-4 rounded-xl bg-surface-inset border border-border text-center text-muted-foreground">
 No pending offline mutations.
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((item) => (
                  <div
 key={item.id}
 className="p-3 rounded-xl bg-surface-inset border border-border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-white text-xs">{item.title}</div>
                        <div className="text-xs tabular-nums text-muted-foreground mt-0.5">
                          {item.actionType} • {formatTime(item.timestamp)}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
 className={`px-2 py-0.5 rounded-full text-xs tabular-nums font-bold uppercase border ${
 item.status === 'synced'
                            ? 'bg-success/10 text-success border-success-border/30'
                            : item.status === 'syncing'
                            ? 'bg-primary/10 text-primary border-primary/20/30'
                            : item.status === 'conflict'
                            ? 'bg-destructive/10 text-destructive border-danger-border/30'
                            : item.status === 'failed'
                            ? 'bg-destructive/10 text-destructive border-danger-border/30'
                            : 'bg-warning/10 text-warning border-warning-border/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Conflict or Error Resolution */}
                    {item.status === 'conflict' && (
                      <div className="p-2 rounded-lg bg-danger-surface border border-danger-border/60 text-xs text-destructive space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="h-3.5 w-3.5"/>
                          <span>Version Conflict Detected</span>
                        </div>
                        <p className="text-xs text-destructive/80">{item.error}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
 size="sm"onClick={() => resolveConflict(item.id, 'overwrite')}
 className="h-6 text-xs bg-destructive hover:bg-destructive text-white rounded px-2">
 Overwrite Server
                          </Button>
                          <Button
 size="sm"variant="outline"onClick={() => resolveConflict(item.id, 'discard')}
 className="h-6 text-xs border-border text-muted-foreground rounded px-2">
 Discard Local
                          </Button>
                        </div>
                      </div>
                    )}

                    {item.status === 'failed' && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                        <span className="text-destructive">{item.error || 'Sync failed'}</span>
                        <button
 onClick={() => retryItem(item.id)}
 className="font-bold text-primary hover:underline">
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
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Saved Local Drafts ({drafts.length})</span>
              <span className="text-xs text-muted-foreground">Auto-saved</span>
            </h3>

            {drafts.length === 0 ? (
              <div className="p-4 rounded-xl bg-surface-inset border border-border text-center text-muted-foreground">
 No drafts saved locally.
              </div>
            ) : (
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <div
 key={draft.id}
 className="p-3 rounded-xl bg-surface-inset border border-border flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-primary"/>
                        <span>{draft.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
 Type: {draft.formType} • Saved {formatTime(draft.updatedAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
 onClick={() => deleteDraft(draft.id)}
 className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg"title="Discard Draft">
                        <Trash2 className="h-3.5 w-3.5"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-surface-inset text-xs text-muted-foreground text-center">
 PrintFlow Offline Storage Engine • Safe local storage on device
        </div>
      </div>
    </div>
  )
}
