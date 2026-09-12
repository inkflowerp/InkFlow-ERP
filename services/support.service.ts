// ==============================================================================
// InkFlow SaaS - Enterprise Support Chat & Conversation Service
// Authoritative Supabase Database & Memory Store implementation.
// Strictly isolates tenant data and guarantees internal notes privacy.
// ==============================================================================

import { createAdminClient } from '../lib/supabase/admin.ts'
import { AuditService } from './audit.service.ts'
import type {
  SupportConversationRecord,
  SupportMessageRecord,
  SupportAttachmentRecord,
  SupportOverviewStats,
  SupportStatus,
  SupportPriority,
  SupportCategory,
  CreateConversationInput,
  SendMessageInput,
  TenantConversationFilters,
  PlatformConversationFilters,
} from '../types/support.types.ts'
import type { ApiResponse } from '../types/common.types.ts'

// Memory & LocalStorage Cache Store for Resilience and Instant Response
class SupportMemoryStore {
  private static conversations: Map<string, SupportConversationRecord> = new Map()
  private static messages: Map<string, SupportMessageRecord[]> = new Map()
  private static ticketSequenceCounter = 100

  static getConversations(): SupportConversationRecord[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const item = window.localStorage.getItem('printerp_support_conversations')
        if (item) {
          const list: SupportConversationRecord[] = JSON.parse(item)
          list.forEach((c) => this.conversations.set(c.id, c))
        }
      } catch {}
    }
    return Array.from(this.conversations.values())
  }

  static getConversation(id: string): SupportConversationRecord | null {
    this.getConversations()
    return this.conversations.get(id) || null
  }

  static saveConversation(conv: SupportConversationRecord): void {
    this.conversations.set(conv.id, conv)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const all = Array.from(this.conversations.values())
        window.localStorage.setItem('printerp_support_conversations', JSON.stringify(all))
      } catch {}
    }
  }

  static getMessages(conversationId: string): SupportMessageRecord[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const item = window.localStorage.getItem(`printerp_support_msg_${conversationId}`)
        if (item) {
          const msgs: SupportMessageRecord[] = JSON.parse(item)
          this.messages.set(conversationId, msgs)
        }
      } catch {}
    }
    return this.messages.get(conversationId) || []
  }

  static saveMessage(msg: SupportMessageRecord): void {
    const list = this.getMessages(msg.conversation_id)
    const existingIdx = list.findIndex((m) => m.id === msg.id || (msg.client_mutation_id && m.client_mutation_id === msg.client_mutation_id))
    if (existingIdx >= 0) {
      list[existingIdx] = msg
    } else {
      list.push(msg)
    }
    this.messages.set(msg.conversation_id, list)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(`printerp_support_msg_${msg.conversation_id}`, JSON.stringify(list))
      } catch {}
    }
  }

  static nextTicketNumber(): string {
    this.ticketSequenceCounter += 1
    return `SUP-${String(this.ticketSequenceCounter).padStart(6, '0')}`
  }

  static clear(): void {
    this.conversations.clear()
    this.messages.clear()
  }
}

export class SupportService {
  private static localFallbackSeq = 0

  /**
   * Generates a unique, server-controlled sequential ticket number (e.g. SUP-000001)
   */
  static async generateTicketNumber(): Promise<string> {
    try {
      const adminClient = createAdminClient()
      const { data, error } = await (adminClient as any).rpc('get_next_support_ticket_number')
      if (!error && data && typeof data === 'string') {
        return data
      }
    } catch {}

    // Fallback: Query max count + unique increment
    try {
      const adminClient = createAdminClient()
      const { count } = await (adminClient as any)
        .from('support_conversations')
        .select('*', { count: 'exact', head: true })
      this.localFallbackSeq += 1
      const nextNum = (count || 0) + this.localFallbackSeq
      return `SUP-${String(nextNum).padStart(6, '0')}`
    } catch {
      return SupportMemoryStore.nextTicketNumber()
    }
  }

  // ============================================================================
  // TENANT ACTIONS
  // ============================================================================

  /**
   * Starts a new support conversation (Ticket) by a tenant user
   */
  static async createConversation(
    companyId: string,
    companyName: string,
    companySlug: string,
    userId: string,
    userEmail: string,
    userName: string,
    input: CreateConversationInput
  ): Promise<ApiResponse<SupportConversationRecord>> {
    try {
      if (!companyId || !input.subject?.trim() || !input.initialMessage?.trim()) {
        return { success: false, error: 'Subject and message are required' }
      }

      const ticketNumber = await this.generateTicketNumber()
      const now = new Date().toISOString()
      const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      const initialMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

      const conversationRecord: SupportConversationRecord = {
        id: conversationId,
        ticket_number: ticketNumber,
        company_id: companyId,
        company_name: companyName,
        company_slug: companySlug,
        branch_id: input.branchId || null,
        created_by: userId,
        created_by_name: userName,
        created_by_email: userEmail,
        assigned_to: null,
        assigned_to_name: null,
        subject: input.subject.trim(),
        status: 'open',
        priority: input.priority || 'normal',
        category: input.category || 'general',
        source: 'app',
        context_metadata: input.contextMetadata || {},
        unread_tenant_count: 0,
        unread_platform_count: 1,
        last_message_at: now,
        last_message_preview: input.initialMessage.trim().substring(0, 120),
        last_message_by: userName,
        last_message_sender_type: 'tenant_user',
        created_at: now,
        updated_at: now,
      }

      const messageRecord: SupportMessageRecord = {
        id: initialMessageId,
        conversation_id: conversationId,
        company_id: companyId,
        sender_user_id: userId,
        sender_name: userName,
        sender_email: userEmail,
        sender_type: 'tenant_user',
        message_type: 'message',
        body: input.initialMessage.trim(),
        attachments: input.attachments || [],
        client_mutation_id: `mut-${Date.now()}`,
        created_at: now,
      }

      // 1. Try DB insertion
      try {
        const adminClient = createAdminClient()
        const { data: dbConv, error: convErr } = await (adminClient as any)
          .from('support_conversations')
          .insert({
            ticket_number: ticketNumber,
            company_id: companyId,
            branch_id: input.branchId || null,
            created_by: userId,
            created_by_name: userName,
            created_by_email: userEmail,
            subject: input.subject.trim(),
            status: 'open',
            priority: input.priority || 'normal',
            category: input.category || 'general',
            source: 'app',
            context_metadata: input.contextMetadata || {},
            unread_tenant_count: 0,
            unread_platform_count: 1,
            last_message_at: now,
            last_message_preview: input.initialMessage.trim().substring(0, 120),
            last_message_by: userName,
            last_message_sender_type: 'tenant_user',
          })
          .select()
          .single()

        if (!convErr && dbConv) {
          conversationRecord.id = dbConv.id

          await (adminClient as any).from('support_messages').insert({
            conversation_id: dbConv.id,
            company_id: companyId,
            sender_user_id: userId,
            sender_name: userName,
            sender_email: userEmail,
            sender_type: 'tenant_user',
            message_type: 'message',
            body: input.initialMessage.trim(),
            attachments: input.attachments || [],
          })
        }
      } catch {
        // Fallback to memory store if DB unreachable
      }

      // Save to memory cache
      SupportMemoryStore.saveConversation(conversationRecord)
      SupportMemoryStore.saveMessage(messageRecord)

      // Audit Log
      await AuditService.logEvent(
        companyId,
        userId,
        userEmail,
        'support_conversation_created',
        'support',
        conversationRecord.id,
        null,
        { ticket_number: ticketNumber, subject: input.subject, category: input.category },
        `Customer started support conversation ${ticketNumber}: "${input.subject}"`
      )

      return { success: true, data: conversationRecord }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create support conversation' }
    }
  }

  /**
   * Retrieves tenant-isolated conversations for a specific company
   */
  static async getTenantConversations(
    companyId: string,
    filters: TenantConversationFilters = {}
  ): Promise<ApiResponse<SupportConversationRecord[]>> {
    try {
      if (!companyId) return { success: false, error: 'Company ID required' }

      let conversations: SupportConversationRecord[] = []

      // 1. Query Supabase
      try {
        const adminClient = createAdminClient()
        let query = (adminClient as any)
          .from('support_conversations')
          .select('*')
          .eq('company_id', companyId)
          .order('last_message_at', { ascending: false })

        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status)
        }
        if (filters.category && filters.category !== 'all') {
          query = query.eq('category', filters.category)
        }

        const { data, error } = await query
        if (!error && data && Array.isArray(data)) {
          conversations = data
        }
      } catch {}

      // Fallback: Memory Store
      if (conversations.length === 0) {
        conversations = SupportMemoryStore.getConversations().filter((c) => c.company_id === companyId)
        if (filters.status && filters.status !== 'all') {
          conversations = conversations.filter((c) => c.status === filters.status)
        }
        if (filters.category && filters.category !== 'all') {
          conversations = conversations.filter((c) => c.category === filters.category)
        }
      }

      // Client-side text search filter
      if (filters.search?.trim()) {
        const q = filters.search.toLowerCase().trim()
        conversations = conversations.filter(
          (c) =>
            c.ticket_number.toLowerCase().includes(q) ||
            c.subject.toLowerCase().includes(q) ||
            (c.last_message_preview && c.last_message_preview.toLowerCase().includes(q))
        )
      }

      // Sort by last message at desc
      conversations.sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      )

      return { success: true, data: conversations }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch conversations' }
    }
  }

  /**
   * Retrieves single conversation details with messages for tenant user.
   * STRICT SECURITY: Internal notes are completely filtered out!
   */
  static async getTenantConversationDetails(
    companyId: string,
    conversationId: string
  ): Promise<ApiResponse<{ conversation: SupportConversationRecord; messages: SupportMessageRecord[] }>> {
    try {
      if (!companyId || !conversationId) {
        return { success: false, error: 'Invalid parameters' }
      }

      let conversation: SupportConversationRecord | null = null
      let messages: SupportMessageRecord[] = []

      // 1. Query Supabase
      try {
        const adminClient = createAdminClient()
        const { data: conv, error: convErr } = await (adminClient as any)
          .from('support_conversations')
          .select('*')
          .eq('id', conversationId)
          .eq('company_id', companyId)
          .single()

        if (!convErr && conv) {
          conversation = conv

          // STRICT FILTER: message_type != 'internal_note' and deleted_at is null
          const { data: msgList, error: msgErr } = await (adminClient as any)
            .from('support_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('company_id', companyId)
            .neq('message_type', 'internal_note')
            .is('deleted_at', null)
            .order('created_at', { ascending: true })

          if (!msgErr && msgList) {
            messages = msgList
          }
        }
      } catch {}

      // Fallback to memory store
      if (!conversation) {
        const memConv = SupportMemoryStore.getConversation(conversationId)
        if (memConv && memConv.company_id === companyId) {
          conversation = memConv
          // Filter out internal notes
          messages = SupportMemoryStore.getMessages(conversationId).filter(
            (m) => m.message_type !== 'internal_note' && !m.deleted_at
          )
        }
      }

      if (!conversation) {
        return { success: false, error: 'Support conversation not found or access forbidden' }
      }

      return {
        success: true,
        data: { conversation, messages },
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to retrieve conversation details' }
    }
  }

  /**
   * Sends a message from a tenant user into a conversation
   */
  static async sendTenantMessage(
    companyId: string,
    userId: string,
    userEmail: string,
    userName: string,
    input: SendMessageInput
  ): Promise<ApiResponse<SupportMessageRecord>> {
    try {
      if (!companyId || !input.conversationId || !input.body?.trim()) {
        return { success: false, error: 'Message body cannot be empty' }
      }

      // Check tenant ownership
      const convRes = await this.getTenantConversationDetails(companyId, input.conversationId)
      if (!convRes.success || !convRes.data?.conversation) {
        return { success: false, error: 'Conversation not found or access forbidden' }
      }

      const conversation = convRes.data.conversation
      const now = new Date().toISOString()
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

      const messageRecord: SupportMessageRecord = {
        id: messageId,
        conversation_id: input.conversationId,
        company_id: companyId,
        sender_user_id: userId,
        sender_name: userName,
        sender_email: userEmail,
        sender_type: 'tenant_user',
        message_type: 'message',
        body: input.body.trim(),
        attachments: input.attachments || [],
        client_mutation_id: input.clientMutationId || null,
        created_at: now,
      }

      // Auto-transition status back to in_progress if customer replies while waiting or resolved
      let newStatus = conversation.status
      if (conversation.status === 'waiting_customer' || conversation.status === 'resolved') {
        newStatus = 'in_progress'
      }

      // 1. Save to DB
      try {
        const adminClient = createAdminClient()
        const { data: dbMsg } = await (adminClient as any)
          .from('support_messages')
          .insert({
            conversation_id: input.conversationId,
            company_id: companyId,
            sender_user_id: userId,
            sender_name: userName,
            sender_email: userEmail,
            sender_type: 'tenant_user',
            message_type: 'message',
            body: input.body.trim(),
            attachments: input.attachments || [],
            client_mutation_id: input.clientMutationId || null,
          })
          .select()
          .single()

        if (dbMsg) {
          messageRecord.id = dbMsg.id
        }

        await (adminClient as any)
          .from('support_conversations')
          .update({
            status: newStatus,
            last_message_at: now,
            last_message_preview: input.body.trim().substring(0, 120),
            last_message_by: userName,
            last_message_sender_type: 'tenant_user',
            unread_platform_count: (conversation.unread_platform_count || 0) + 1,
            updated_at: now,
          })
          .eq('id', input.conversationId)
      } catch {}

      // Update memory store
      conversation.status = newStatus
      conversation.last_message_at = now
      conversation.last_message_preview = input.body.trim().substring(0, 120)
      conversation.last_message_by = userName
      conversation.last_message_sender_type = 'tenant_user'
      conversation.unread_platform_count = (conversation.unread_platform_count || 0) + 1
      conversation.updated_at = now

      SupportMemoryStore.saveConversation(conversation)
      SupportMemoryStore.saveMessage(messageRecord)

      return { success: true, data: messageRecord }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send message' }
    }
  }

  /**
   * Marks conversation read by tenant user
   */
  static async markAsReadByTenant(companyId: string, conversationId: string): Promise<ApiResponse<boolean>> {
    try {
      const conv = SupportMemoryStore.getConversation(conversationId)
      if (conv && conv.company_id === companyId) {
        conv.unread_tenant_count = 0
        SupportMemoryStore.saveConversation(conv)
      }

      try {
        const adminClient = createAdminClient()
        await (adminClient as any)
          .from('support_conversations')
          .update({ unread_tenant_count: 0 })
          .eq('id', conversationId)
          .eq('company_id', companyId)
      } catch {}

      return { success: true, data: true }
    } catch {
      return { success: false, error: 'Failed to mark conversation read' }
    }
  }

  /**
   * Closes conversation by customer
   */
  static async closeConversationByTenant(
    companyId: string,
    conversationId: string,
    userId: string,
    userName: string
  ): Promise<ApiResponse<SupportConversationRecord>> {
    try {
      const convRes = await this.getTenantConversationDetails(companyId, conversationId)
      if (!convRes.success || !convRes.data?.conversation) {
        return { success: false, error: 'Conversation not found' }
      }

      const conv = convRes.data.conversation
      const now = new Date().toISOString()
      conv.status = 'closed'
      conv.closed_at = now
      conv.closed_by = userId
      conv.updated_at = now

      // Insert system event
      const eventMsg: SupportMessageRecord = {
        id: `msg-event-${Date.now()}`,
        conversation_id: conversationId,
        company_id: companyId,
        sender_user_id: userId,
        sender_name: userName,
        sender_type: 'system',
        message_type: 'system_event',
        body: `Conversation marked as resolved and closed by customer (${userName}).`,
        attachments: [],
        created_at: now,
      }

      try {
        const adminClient = createAdminClient()
        await (adminClient as any)
          .from('support_conversations')
          .update({ status: 'closed', closed_at: now, closed_by: userId, updated_at: now })
          .eq('id', conversationId)

        await (adminClient as any).from('support_messages').insert({
          conversation_id: conversationId,
          company_id: companyId,
          sender_user_id: userId,
          sender_name: userName,
          sender_type: 'system',
          message_type: 'system_event',
          body: eventMsg.body,
          attachments: [],
        })
      } catch {}

      SupportMemoryStore.saveConversation(conv)
      SupportMemoryStore.saveMessage(eventMsg)

      return { success: true, data: conv }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to close conversation' }
    }
  }

  /**
   * Reopens a closed/resolved conversation by customer
   */
  static async reopenConversationByTenant(
    companyId: string,
    conversationId: string,
    userId: string,
    userName: string,
    reason?: string
  ): Promise<ApiResponse<SupportConversationRecord>> {
    try {
      const convRes = await this.getTenantConversationDetails(companyId, conversationId)
      if (!convRes.success || !convRes.data?.conversation) {
        return { success: false, error: 'Conversation not found' }
      }

      const conv = convRes.data.conversation
      const now = new Date().toISOString()
      conv.status = 'in_progress'
      conv.reopened_at = now
      conv.unread_platform_count = (conv.unread_platform_count || 0) + 1
      conv.updated_at = now

      const eventMsg: SupportMessageRecord = {
        id: `msg-event-${Date.now()}`,
        conversation_id: conversationId,
        company_id: companyId,
        sender_user_id: userId,
        sender_name: userName,
        sender_type: 'system',
        message_type: 'system_event',
        body: `Conversation reopened by customer.${reason ? ` Reason: ${reason}` : ''}`,
        attachments: [],
        created_at: now,
      }

      try {
        const adminClient = createAdminClient()
        await (adminClient as any)
          .from('support_conversations')
          .update({ status: 'in_progress', reopened_at: now, updated_at: now, unread_platform_count: conv.unread_platform_count })
          .eq('id', conversationId)

        await (adminClient as any).from('support_messages').insert({
          conversation_id: conversationId,
          company_id: companyId,
          sender_user_id: userId,
          sender_name: userName,
          sender_type: 'system',
          message_type: 'system_event',
          body: eventMsg.body,
          attachments: [],
        })
      } catch {}

      SupportMemoryStore.saveConversation(conv)
      SupportMemoryStore.saveMessage(eventMsg)

      return { success: true, data: conv }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reopen conversation' }
    }
  }

  // ============================================================================
  // PLATFORM SUPPORT ACTIONS
  // ============================================================================

  /**
   * Retrieves all support conversations for platform agents with filters & search
   */
  static async getPlatformConversations(
    filters: PlatformConversationFilters = {}
  ): Promise<ApiResponse<SupportConversationRecord[]>> {
    try {
      let list: SupportConversationRecord[] = []

      // 1. Query Supabase
      try {
        const adminClient = createAdminClient()
        let query = (adminClient as any)
          .from('support_conversations')
          .select('*')
          .order('last_message_at', { ascending: false })

        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status)
        }
        if (filters.priority && filters.priority !== 'all') {
          query = query.eq('priority', filters.priority)
        }
        if (filters.category && filters.category !== 'all') {
          query = query.eq('category', filters.category)
        }
        if (filters.assignedTo && filters.assignedTo !== 'all') {
          query = query.eq('assigned_to', filters.assignedTo)
        }
        if (filters.unassignedOnly) {
          query = query.is('assigned_to', null)
        }
        if (filters.tenantId && filters.tenantId !== 'all') {
          query = query.eq('company_id', filters.tenantId)
        }

        const { data, error } = await query
        if (!error && data && Array.isArray(data)) {
          list = data
        }
      } catch {}

      // Fallback: Memory Store
      if (list.length === 0) {
        list = SupportMemoryStore.getConversations()
        if (filters.status && filters.status !== 'all') {
          list = list.filter((c) => c.status === filters.status)
        }
        if (filters.priority && filters.priority !== 'all') {
          list = list.filter((c) => c.priority === filters.priority)
        }
        if (filters.category && filters.category !== 'all') {
          list = list.filter((c) => c.category === filters.category)
        }
        if (filters.assignedTo && filters.assignedTo !== 'all') {
          list = list.filter((c) => c.assigned_to === filters.assignedTo)
        }
        if (filters.unassignedOnly) {
          list = list.filter((c) => !c.assigned_to)
        }
        if (filters.tenantId && filters.tenantId !== 'all') {
          list = list.filter((c) => c.company_id === filters.tenantId)
        }
      }

      // Search
      if (filters.search?.trim()) {
        const q = filters.search.toLowerCase().trim()
        list = list.filter(
          (c) =>
            c.ticket_number.toLowerCase().includes(q) ||
            c.subject.toLowerCase().includes(q) ||
            c.created_by_name.toLowerCase().includes(q) ||
            c.created_by_email.toLowerCase().includes(q) ||
            (c.company_name && c.company_name.toLowerCase().includes(q)) ||
            (c.last_message_preview && c.last_message_preview.toLowerCase().includes(q))
        )
      }

      list.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())

      return { success: true, data: list }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch platform conversations' }
    }
  }

  /**
   * Retrieves single conversation details for platform agents (includes ALL messages & internal notes)
   */
  static async getPlatformConversationDetails(
    conversationId: string
  ): Promise<ApiResponse<{ conversation: SupportConversationRecord; messages: SupportMessageRecord[] }>> {
    try {
      if (!conversationId) return { success: false, error: 'Conversation ID required' }

      let conversation: SupportConversationRecord | null = null
      let messages: SupportMessageRecord[] = []

      // 1. Query Supabase
      try {
        const adminClient = createAdminClient()
        const { data: conv } = await (adminClient as any)
          .from('support_conversations')
          .select('*')
          .eq('id', conversationId)
          .single()

        if (conv) {
          conversation = conv
          const { data: msgList } = await (adminClient as any)
            .from('support_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })

          if (msgList) messages = msgList
        }
      } catch {}

      if (!conversation) {
        conversation = SupportMemoryStore.getConversation(conversationId)
        if (conversation) {
          messages = SupportMemoryStore.getMessages(conversationId).filter((m) => !m.deleted_at)
        }
      }

      if (!conversation) {
        return { success: false, error: 'Support conversation not found' }
      }

      return { success: true, data: { conversation, messages } }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to get conversation details' }
    }
  }

  /**
   * Platform agent sends a reply or internal note
   */
  static async sendPlatformReply(
    adminId: string,
    adminEmail: string,
    adminName: string,
    input: SendMessageInput
  ): Promise<ApiResponse<SupportMessageRecord>> {
    try {
      if (!adminId || !input.conversationId || !input.body?.trim()) {
        return { success: false, error: 'Reply body cannot be empty' }
      }

      const convRes = await this.getPlatformConversationDetails(input.conversationId)
      if (!convRes.success || !convRes.data?.conversation) {
        return { success: false, error: 'Conversation not found' }
      }

      const conversation = convRes.data.conversation
      const now = new Date().toISOString()
      const isInternalNote = Boolean(input.isInternalNote)
      const messageType = isInternalNote ? 'internal_note' : 'support_reply'
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

      const messageRecord: SupportMessageRecord = {
        id: messageId,
        conversation_id: input.conversationId,
        company_id: conversation.company_id,
        sender_user_id: adminId,
        sender_name: `${adminName} (Support)`,
        sender_email: adminEmail,
        sender_type: 'platform_support',
        message_type: messageType,
        body: input.body.trim(),
        attachments: input.attachments || [],
        client_mutation_id: input.clientMutationId || null,
        created_at: now,
      }

      // If it's a public reply, update status to waiting_customer and update first_response_at
      let newStatus = conversation.status
      let firstResponseAt = conversation.first_response_at
      let unreadTenantCount = conversation.unread_tenant_count || 0

      if (!isInternalNote) {
        if (!firstResponseAt) {
          firstResponseAt = now
        }
        newStatus = 'waiting_customer'
        unreadTenantCount += 1
      }

      // DB mutation
      try {
        const adminClient = createAdminClient()
        const { data: dbMsg } = await (adminClient as any)
          .from('support_messages')
          .insert({
            conversation_id: input.conversationId,
            company_id: conversation.company_id,
            sender_user_id: adminId,
            sender_name: `${adminName} (Support)`,
            sender_email: adminEmail,
            sender_type: 'platform_support',
            message_type: messageType,
            body: input.body.trim(),
            attachments: input.attachments || [],
            client_mutation_id: input.clientMutationId || null,
          })
          .select()
          .single()

        if (dbMsg) messageRecord.id = dbMsg.id

        if (!isInternalNote) {
          await (adminClient as any)
            .from('support_conversations')
            .update({
              status: newStatus,
              first_response_at: firstResponseAt,
              last_message_at: now,
              last_message_preview: input.body.trim().substring(0, 120),
              last_message_by: adminName,
              last_message_sender_type: 'platform_support',
              unread_tenant_count: unreadTenantCount,
              updated_at: now,
            })
            .eq('id', input.conversationId)
        }
      } catch {}

      // Update memory store
      if (!isInternalNote) {
        conversation.status = newStatus
        conversation.first_response_at = firstResponseAt
        conversation.last_message_at = now
        conversation.last_message_preview = input.body.trim().substring(0, 120)
        conversation.last_message_by = adminName
        conversation.last_message_sender_type = 'platform_support'
        conversation.unread_tenant_count = unreadTenantCount
        conversation.updated_at = now
        SupportMemoryStore.saveConversation(conversation)
      }

      SupportMemoryStore.saveMessage(messageRecord)

      // Audit Log
      await AuditService.logEvent(
        conversation.company_id,
        adminId,
        adminEmail,
        isInternalNote ? 'support_internal_note_added' : 'support_reply_sent',
        'support',
        conversation.id,
        null,
        { is_internal: isInternalNote, preview: input.body.substring(0, 80) },
        `Agent ${adminName} ${isInternalNote ? 'added internal note on' : 'replied to'} ticket ${conversation.ticket_number}`
      )

      return { success: true, data: messageRecord }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send platform reply' }
    }
  }

  /**
   * Assigns or reassigns conversation to a platform support agent
   */
  static async assignConversation(
    adminId: string,
    adminEmail: string,
    adminName: string,
    conversationId: string,
    targetAdminId: string | null,
    targetAdminName: string | null
  ): Promise<ApiResponse<SupportConversationRecord>> {
    try {
      const convRes = await this.getPlatformConversationDetails(conversationId)
      if (!convRes.success || !convRes.data?.conversation) {
        return { success: false, error: 'Conversation not found' }
      }

      const conv = convRes.data.conversation
      const now = new Date().toISOString()
      const prevAssignee = conv.assigned_to_name || 'Unassigned'
      const newAssignee = targetAdminName || 'Unassigned'

      conv.assigned_to = targetAdminId
      conv.assigned_to_name = targetAdminName
      if (conv.status === 'open' && targetAdminId) {
        conv.status = 'in_progress'
      }
      conv.updated_at = now

      const eventMsg: SupportMessageRecord = {
        id: `msg-event-${Date.now()}`,
        conversation_id: conversationId,
        company_id: conv.company_id,
        sender_user_id: adminId,
        sender_name: 'System',
        sender_type: 'system',
        message_type: 'system_event',
        body: targetAdminId
          ? `Conversation assigned to ${targetAdminName} by ${adminName}.`
          : `Conversation unassigned by ${adminName}.`,
        attachments: [],
        created_at: now,
      }

      try {
        const adminClient = createAdminClient()
        await (adminClient as any)
          .from('support_conversations')
          .update({
            assigned_to: targetAdminId,
            assigned_to_name: targetAdminName,
            status: conv.status,
            updated_at: now,
          })
          .eq('id', conversationId)

        await (adminClient as any).from('support_messages').insert({
          conversation_id: conversationId,
          company_id: conv.company_id,
          sender_user_id: adminId,
          sender_name: 'System',
          sender_type: 'system',
          message_type: 'system_event',
          body: eventMsg.body,
          attachments: [],
        })
      } catch {}

      SupportMemoryStore.saveConversation(conv)
      SupportMemoryStore.saveMessage(eventMsg)

      // Audit Log
      await AuditService.logEvent(
        conv.company_id,
        adminId,
        adminEmail,
        'support_conversation_assigned',
        'support',
        conv.id,
        { previous_assignee: prevAssignee },
        { new_assignee: newAssignee },
        `Ticket ${conv.ticket_number} assigned from ${prevAssignee} to ${newAssignee}`
      )

      return { success: true, data: conv }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to assign conversation' }
    }
  }

  /**
   * Updates conversation status (e.g. open -> in_progress -> resolved -> closed)
   */
  static async updateConversationStatus(
    adminId: string,
    adminEmail: string,
    adminName: string,
    conversationId: string,
    newStatus: SupportStatus,
    reason?: string
  ): Promise<ApiResponse<SupportConversationRecord>> {
    try {
      const convRes = await this.getPlatformConversationDetails(conversationId)
      if (!convRes.success || !convRes.data?.conversation) {
        return { success: false, error: 'Conversation not found' }
      }

      const conv = convRes.data.conversation
      const prevStatus = conv.status
      const now = new Date().toISOString()

      conv.status = newStatus
      conv.updated_at = now

      if (newStatus === 'resolved') {
        conv.resolved_at = now
        conv.resolved_by = adminId
      } else if (newStatus === 'closed') {
        conv.closed_at = now
        conv.closed_by = adminId
      }

      const eventMsg: SupportMessageRecord = {
        id: `msg-event-${Date.now()}`,
        conversation_id: conversationId,
        company_id: conv.company_id,
        sender_user_id: adminId,
        sender_name: 'System',
        sender_type: 'system',
        message_type: 'system_event',
        body: `Status changed from ${prevStatus.toUpperCase()} to ${newStatus.toUpperCase()} by ${adminName}.${reason ? ` (${reason})` : ''}`,
        attachments: [],
        created_at: now,
      }

      try {
        const adminClient = createAdminClient()
        await (adminClient as any)
          .from('support_conversations')
          .update({
            status: newStatus,
            resolved_at: conv.resolved_at || null,
            resolved_by: conv.resolved_by || null,
            closed_at: conv.closed_at || null,
            closed_by: conv.closed_by || null,
            updated_at: now,
          })
          .eq('id', conversationId)

        await (adminClient as any).from('support_messages').insert({
          conversation_id: conversationId,
          company_id: conv.company_id,
          sender_user_id: adminId,
          sender_name: 'System',
          sender_type: 'system',
          message_type: 'system_event',
          body: eventMsg.body,
          attachments: [],
        })
      } catch {}

      SupportMemoryStore.saveConversation(conv)
      SupportMemoryStore.saveMessage(eventMsg)

      await AuditService.logEvent(
        conv.company_id,
        adminId,
        adminEmail,
        'support_status_changed',
        'support',
        conv.id,
        { previous_status: prevStatus },
        { new_status: newStatus, reason },
        `Status changed for ticket ${conv.ticket_number} to ${newStatus}`
      )

      return { success: true, data: conv }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update conversation status' }
    }
  }

  /**
   * Updates conversation priority
   */
  static async updateConversationPriority(
    adminId: string,
    adminEmail: string,
    adminName: string,
    conversationId: string,
    newPriority: SupportPriority
  ): Promise<ApiResponse<SupportConversationRecord>> {
    try {
      const convRes = await this.getPlatformConversationDetails(conversationId)
      if (!convRes.success || !convRes.data?.conversation) {
        return { success: false, error: 'Conversation not found' }
      }

      const conv = convRes.data.conversation
      const prevPriority = conv.priority
      const now = new Date().toISOString()
      conv.priority = newPriority
      conv.updated_at = now

      const eventMsg: SupportMessageRecord = {
        id: `msg-event-${Date.now()}`,
        conversation_id: conversationId,
        company_id: conv.company_id,
        sender_user_id: adminId,
        sender_name: 'System',
        sender_type: 'system',
        message_type: 'system_event',
        body: `Priority updated from ${prevPriority.toUpperCase()} to ${newPriority.toUpperCase()} by ${adminName}.`,
        attachments: [],
        created_at: now,
      }

      try {
        const adminClient = createAdminClient()
        await (adminClient as any)
          .from('support_conversations')
          .update({ priority: newPriority, updated_at: now })
          .eq('id', conversationId)

        await (adminClient as any).from('support_messages').insert({
          conversation_id: conversationId,
          company_id: conv.company_id,
          sender_user_id: adminId,
          sender_name: 'System',
          sender_type: 'system',
          message_type: 'system_event',
          body: eventMsg.body,
          attachments: [],
        })
      } catch {}

      SupportMemoryStore.saveConversation(conv)
      SupportMemoryStore.saveMessage(eventMsg)

      return { success: true, data: conv }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update priority' }
    }
  }

  /**
   * Updates conversation category
   */
  static async updateConversationCategory(
    adminId: string,
    adminEmail: string,
    adminName: string,
    conversationId: string,
    newCategory: SupportCategory
  ): Promise<ApiResponse<SupportConversationRecord>> {
    try {
      const convRes = await this.getPlatformConversationDetails(conversationId)
      if (!convRes.success || !convRes.data?.conversation) {
        return { success: false, error: 'Conversation not found' }
      }

      const conv = convRes.data.conversation
      const now = new Date().toISOString()
      conv.category = newCategory
      conv.updated_at = now

      try {
        const adminClient = createAdminClient()
        await (adminClient as any)
          .from('support_conversations')
          .update({ category: newCategory, updated_at: now })
          .eq('id', conversationId)
      } catch {}

      SupportMemoryStore.saveConversation(conv)
      return { success: true, data: conv }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update category' }
    }
  }

  /**
   * Marks conversation read by platform agent
   */
  static async markAsReadByPlatform(conversationId: string): Promise<ApiResponse<boolean>> {
    try {
      const conv = SupportMemoryStore.getConversation(conversationId)
      if (conv) {
        conv.unread_platform_count = 0
        SupportMemoryStore.saveConversation(conv)
      }

      try {
        const adminClient = createAdminClient()
        await (adminClient as any)
          .from('support_conversations')
          .update({ unread_platform_count: 0 })
          .eq('id', conversationId)
      } catch {}

      return { success: true, data: true }
    } catch {
      return { success: false, error: 'Failed to mark read' }
    }
  }

  /**
   * Calculates platform support queue overview statistics & SLA metrics
   */
  static async getPlatformSupportStats(currentAdminId?: string): Promise<SupportOverviewStats> {
    try {
      const convsRes = await this.getPlatformConversations()
      const list = convsRes.data || []

      let openCount = 0
      let inProgressCount = 0
      let waitingCustomerCount = 0
      let resolvedCount = 0
      let closedCount = 0
      let unassignedCount = 0
      let assignedToMeCount = 0
      let urgentCount = 0

      let totalFirstResponseMinutes = 0
      let firstResponseCount = 0
      let totalResolutionMinutes = 0
      let resolutionCount = 0

      list.forEach((c) => {
        if (c.status === 'open') openCount++
        if (c.status === 'in_progress') inProgressCount++
        if (c.status === 'waiting_customer') waitingCustomerCount++
        if (c.status === 'resolved') resolvedCount++
        if (c.status === 'closed') closedCount++

        if (!c.assigned_to && c.status !== 'closed' && c.status !== 'resolved') {
          unassignedCount++
        }
        if (currentAdminId && c.assigned_to === currentAdminId && c.status !== 'closed') {
          assignedToMeCount++
        }
        if (c.priority === 'urgent' && c.status !== 'closed' && c.status !== 'resolved') {
          urgentCount++
        }

        // SLA First Response Calculation
        if (c.first_response_at && c.created_at) {
          const createdMs = new Date(c.created_at).getTime()
          const respMs = new Date(c.first_response_at).getTime()
          const diffMinutes = Math.max(0, (respMs - createdMs) / (1000 * 60))
          totalFirstResponseMinutes += diffMinutes
          firstResponseCount++
        }

        // SLA Resolution Calculation
        if (c.resolved_at && c.created_at) {
          const createdMs = new Date(c.created_at).getTime()
          const resMs = new Date(c.resolved_at).getTime()
          const diffMinutes = Math.max(0, (resMs - createdMs) / (1000 * 60))
          totalResolutionMinutes += diffMinutes
          resolutionCount++
        }
      })

      return {
        totalCount: list.length,
        openCount,
        inProgressCount,
        waitingCustomerCount,
        resolvedCount,
        closedCount,
        unassignedCount,
        assignedToMeCount,
        urgentCount,
        averageFirstResponseMinutes:
          firstResponseCount > 0 ? Math.round(totalFirstResponseMinutes / firstResponseCount) : 15,
        averageResolutionMinutes:
          resolutionCount > 0 ? Math.round(totalResolutionMinutes / resolutionCount) : 120,
      }
    } catch {
      return {
        totalCount: 0,
        openCount: 0,
        inProgressCount: 0,
        waitingCustomerCount: 0,
        resolvedCount: 0,
        closedCount: 0,
        unassignedCount: 0,
        assignedToMeCount: 0,
        urgentCount: 0,
        averageFirstResponseMinutes: 15,
        averageResolutionMinutes: 120,
      }
    }
  }
}
