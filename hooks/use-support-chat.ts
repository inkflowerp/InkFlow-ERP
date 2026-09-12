'use client'

// ==============================================================================
// InkFlow SaaS - Enterprise Realtime Support Chat React Hook
// Manages live message stream, Supabase Realtime synchronization,
// optimistic message delivery, connection state, audio chimes, and unread badges.
// ==============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { playNotificationSound } from '@/lib/notifications/sound-manager'
import { showBrowserNotification } from '@/lib/notifications/browser-notification'
import {
  SupportConversationRecord,
  SupportMessageRecord,
  SupportStatus,
  SupportPriority,
  SupportCategory,
  CreateConversationInput,
  SendMessageInput,
  TenantConversationFilters,
  PlatformConversationFilters,
} from '@/types/support.types'
import {
  createSupportConversationAction,
  getTenantSupportConversationsAction,
  getTenantSupportConversationDetailsAction,
  sendTenantSupportMessageAction,
  markConversationReadByTenantAction,
  closeConversationByTenantAction,
  reopenConversationByTenantAction,
  getPlatformSupportConversationsAction,
  getPlatformSupportConversationDetailsAction,
  sendPlatformSupportReplyAction,
  assignSupportConversationAction,
  updateSupportConversationStatusAction,
  updateSupportConversationPriorityAction,
  markConversationReadByPlatformAction,
} from '@/actions/support.actions'

export type ChatConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline'

interface UseSupportChatOptions {
  mode: 'tenant' | 'platform'
  companyId?: string
  initialConversationId?: string
}

export function useSupportChat({ mode, companyId, initialConversationId }: UseSupportChatOptions) {
  const [conversations, setConversations] = useState<SupportConversationRecord[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversationId || null
  )
  const [selectedConversation, setSelectedConversation] = useState<SupportConversationRecord | null>(null)
  const [messages, setMessages] = useState<SupportMessageRecord[]>([])
  const [connectionState, setConnectionState] = useState<ChatConnectionState>('connecting')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedConvIdRef = useRef<string | null>(selectedConversationId)
  useEffect(() => {
    selectedConvIdRef.current = selectedConversationId
  }, [selectedConversationId])

  // Load conversation list
  const loadConversations = useCallback(
    async (filters: TenantConversationFilters | PlatformConversationFilters = {}) => {
      try {
        setLoading(true)
        setError(null)

        if (mode === 'tenant') {
          const res = await getTenantSupportConversationsAction(filters as TenantConversationFilters)
          if (res.success && res.data) {
            setConversations(res.data)
            if (!selectedConvIdRef.current && res.data.length > 0) {
              setSelectedConversationId(res.data[0].id)
            }
          } else {
            setError(res.error || 'Failed to load support conversations')
          }
        } else {
          const res = await getPlatformSupportConversationsAction(filters as PlatformConversationFilters)
          if (res.success && res.data) {
            setConversations(res.data)
            if (!selectedConvIdRef.current && res.data.length > 0) {
              setSelectedConversationId(res.data[0].id)
            }
          } else {
            setError(res.error || 'Failed to load conversations')
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error loading conversations')
      } finally {
        setLoading(false)
      }
    },
    [mode]
  )

  // Load messages for the active conversation
  const loadMessages = useCallback(
    async (convId: string) => {
      if (!convId) return
      try {
        setLoadingMessages(true)
        if (mode === 'tenant') {
          const res = await getTenantSupportConversationDetailsAction(convId)
          if (res.success && res.data) {
            setSelectedConversation(res.data.conversation)
            setMessages(res.data.messages)
            // Mark as read
            markConversationReadByTenantAction(convId).catch(() => {})
          }
        } else {
          const res = await getPlatformSupportConversationDetailsAction(convId)
          if (res.success && res.data) {
            setSelectedConversation(res.data.conversation)
            setMessages(res.data.messages)
            // Mark as read
            markConversationReadByPlatformAction(convId).catch(() => {})
          }
        }
      } catch {
      } finally {
        setLoadingMessages(false)
      }
    },
    [mode]
  )

  // Initial load
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Reload messages on conversation selection
  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId)
    } else {
      setSelectedConversation(null)
      setMessages([])
    }
  }, [selectedConversationId, loadMessages])

  // Supabase Realtime & Online/Offline event handling
  useEffect(() => {
    const handleOnline = () => setConnectionState('connected')
    const handleOffline = () => setConnectionState('offline')

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      if (!navigator.onLine) {
        setConnectionState('offline')
      }
    }

    let channel: any = null
    try {
      const supabase = createClient()
      channel = supabase
        .channel(`support_realtime_${mode}_${companyId || 'platform'}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'support_conversations' },
          (payload: any) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const updated = payload.new as SupportConversationRecord
              setConversations((prev) => {
                const idx = prev.findIndex((c) => c.id === updated.id)
                if (idx >= 0) {
                  const copy = [...prev]
                  copy[idx] = { ...copy[idx], ...updated }
                  return copy.sort(
                    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
                  )
                }
                return [updated, ...prev]
              })

              if (selectedConvIdRef.current === updated.id) {
                setSelectedConversation((curr) => (curr ? { ...curr, ...updated } : updated))
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'support_messages' },
          (payload: any) => {
            const newMsg = payload.new as SupportMessageRecord
            if (!newMsg) return

            // If tenant mode, hide internal notes
            if (mode === 'tenant' && newMsg.message_type === 'internal_note') {
              return
            }

            if (selectedConvIdRef.current === newMsg.conversation_id) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id || (newMsg.client_mutation_id && m.client_mutation_id === newMsg.client_mutation_id))) {
                  return prev.map((m) => (m.client_mutation_id === newMsg.client_mutation_id ? newMsg : m))
                }
                return [...prev, newMsg]
              })

              // Play subtle audio chime for incoming messages from the other party
              if (
                (mode === 'tenant' && newMsg.sender_type === 'platform_support') ||
                (mode === 'platform' && newMsg.sender_type === 'tenant_user')
              ) {
                playNotificationSound('broadcast')
                showBrowserNotification({
                  title: `Support: ${newMsg.sender_name}`,
                  body: newMsg.body.substring(0, 100),
                  tag: newMsg.id,
                }).catch(() => {})
              }
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            setConnectionState('connected')
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setConnectionState('reconnecting')
          }
        })
    } catch {
      setConnectionState('connected')
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [mode, companyId])

  // Send message
  const sendMessage = useCallback(
    async (body: string, isInternalNote: boolean = false, attachments: any[] = []) => {
      if (!selectedConversationId || !body.trim()) return

      setSending(true)
      const clientMutationId = `mut-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

      // Optimistic Message Creation
      const optimisticMsg: SupportMessageRecord = {
        id: `optimistic-${Date.now()}`,
        conversation_id: selectedConversationId,
        company_id: companyId || selectedConversation?.company_id || '',
        sender_user_id: 'current-user',
        sender_name: mode === 'platform' ? 'Support Agent' : 'You',
        sender_type: mode === 'platform' ? 'platform_support' : 'tenant_user',
        message_type: isInternalNote ? 'internal_note' : mode === 'platform' ? 'support_reply' : 'message',
        body: body.trim(),
        attachments: attachments || [],
        client_mutation_id: clientMutationId,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, optimisticMsg])

      try {
        if (mode === 'tenant') {
          const res = await sendTenantSupportMessageAction({
            conversationId: selectedConversationId,
            body,
            attachments,
            clientMutationId,
          })
          if (res.success && res.data) {
            setMessages((prev) =>
              prev.map((m) => (m.client_mutation_id === clientMutationId ? res.data! : m))
            )
            loadConversations()
          } else {
            setError(res.error || 'Failed to send message')
          }
        } else {
          const res = await sendPlatformSupportReplyAction({
            conversationId: selectedConversationId,
            body,
            isInternalNote,
            attachments,
            clientMutationId,
          })
          if (res.success && res.data) {
            setMessages((prev) =>
              prev.map((m) => (m.client_mutation_id === clientMutationId ? res.data! : m))
            )
            loadConversations()
          } else {
            setError(res.error || 'Failed to send reply')
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error sending message')
      } finally {
        setSending(false)
      }
    },
    [selectedConversationId, mode, companyId, selectedConversation, loadConversations]
  )

  // Create new ticket (tenant)
  const createTicket = useCallback(
    async (input: CreateConversationInput) => {
      setSending(true)
      try {
        const res = await createSupportConversationAction(input)
        if (res.success && res.data) {
          setConversations((prev) => [res.data!, ...prev])
          setSelectedConversationId(res.data.id)
          return { success: true, data: res.data }
        }
        return { success: false, error: res.error || 'Failed to create conversation' }
      } catch (err: any) {
        return { success: false, error: err.message || 'Error creating conversation' }
      } finally {
        setSending(false)
      }
    },
    []
  )

  // Status update
  const updateStatus = useCallback(
    async (status: SupportStatus, reason?: string) => {
      if (!selectedConversationId) return
      if (mode === 'tenant') {
        if (status === 'closed') {
          await closeConversationByTenantAction(selectedConversationId)
        } else if (status === 'in_progress') {
          await reopenConversationByTenantAction(selectedConversationId, reason)
        }
      } else {
        await updateSupportConversationStatusAction(selectedConversationId, status, reason)
      }
      loadConversations()
      loadMessages(selectedConversationId)
    },
    [selectedConversationId, mode, loadConversations, loadMessages]
  )

  // Priority update (platform)
  const updatePriority = useCallback(
    async (priority: SupportPriority) => {
      if (!selectedConversationId || mode !== 'platform') return
      await updateSupportConversationPriorityAction(selectedConversationId, priority)
      loadConversations()
      loadMessages(selectedConversationId)
    },
    [selectedConversationId, mode, loadConversations, loadMessages]
  )

  // Assign ticket (platform)
  const assignTicket = useCallback(
    async (adminId: string | null, adminName: string | null) => {
      if (!selectedConversationId || mode !== 'platform') return
      await assignSupportConversationAction(selectedConversationId, adminId, adminName)
      loadConversations()
      loadMessages(selectedConversationId)
    },
    [selectedConversationId, mode, loadConversations, loadMessages]
  )

  return {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    selectedConversation,
    messages,
    connectionState,
    loading,
    loadingMessages,
    sending,
    error,
    setError,
    loadConversations,
    loadMessages,
    sendMessage,
    createTicket,
    updateStatus,
    updatePriority,
    assignTicket,
  }
}
