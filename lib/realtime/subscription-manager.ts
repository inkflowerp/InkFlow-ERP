// ==============================================================================
// PrintERP SaaS - Phase 28: Production Realtime Subscription Manager
// Ensures tenant isolation, reference-counted deduplication, and prevents
// unbounded WebSocket connections or memory leaks on the factory floor.
// ==============================================================================

import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type RealtimeTopic = 'orders' | 'jobs' | 'notifications' | 'inventory' | 'billing'

interface ChannelRef {
  channel: RealtimeChannel
  refCount: number
}

class RealtimeSubscriptionManager {
  private activeChannels = new Map<string, ChannelRef>()

  /**
   * Subscribe to a tenant-scoped channel topic with automatic deduplication.
   * If 3 components in the same tab watch 'jobs', only 1 WebSocket channel is opened.
   */
  subscribe<T>(
    companyId: string,
    topic: RealtimeTopic,
    event: string,
    callback: (payload: T) => void
  ): () => void {
    if (!companyId) {
      console.warn('[RealtimeManager] Cannot subscribe without companyId. Skipping.')
      return () => {}
    }

    // Strictly tenant-scoped channel name to prevent cross-tenant data leakage
    const channelName = `company:${companyId}:${topic}`
    let channelRef = this.activeChannels.get(channelName)

    if (!channelRef) {
      const supabase = createClient()
      const channel = supabase
        .channel(channelName)
        .on('broadcast' as never, { event } as never, (response: { payload: T }) => {
          callback(response.payload)
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[RealtimeManager] Connected to ${channelName}`)
          }
        })

      channelRef = { channel, refCount: 1 }
      this.activeChannels.set(channelName, channelRef)
    } else {
      channelRef.refCount += 1
    }

    // Return cleanup unsubscriber
    return () => {
      this.unsubscribe(channelName)
    }
  }

  /**
   * Decrements reference count and closes WebSocket channel when refCount drops to 0.
   */
  private unsubscribe(channelName: string) {
    const channelRef = this.activeChannels.get(channelName)
    if (!channelRef) return

    channelRef.refCount -= 1
    if (channelRef.refCount <= 0) {
      channelRef.channel.unsubscribe()
      this.activeChannels.delete(channelName)
      console.log(`[RealtimeManager] Closed channel ${channelName} (0 subscribers)`)
    }
  }

  /**
   * Return number of currently open WebSocket channels
   */
  getActiveChannelCount(): number {
    return this.activeChannels.size
  }
}

export const realtimeManager = new RealtimeSubscriptionManager()
