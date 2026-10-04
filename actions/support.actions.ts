'use server'

import { withTenantAction } from '@/lib/actions/action-wrapper'


// ==============================================================================
// InkFlow SaaS - Authoritative Server Actions for Support Chat & Conversations
// Server-Guarded: Enforces authenticated identity, tenant isolation, permissions,
// rate limiting, anti-XSS validation, and audit logging.
// ==============================================================================

import { requireTenantUser } from '@/lib/auth/tenant-auth'
import { requirePlatformUser, hasPlatformPermission } from '@/lib/auth/platform-auth'
import { withPlatformAction } from '@/lib/actions/action-wrapper'
import { SupportService } from '@/services/support.service'
import {
  CreateConversationInput,
  SendMessageInput,
  TenantConversationFilters,
  PlatformConversationFilters,
  SupportStatus,
  SupportPriority,
  SupportCategory,
  SupportConversationRecord,
  SupportMessageRecord,
  SupportOverviewStats,
} from '@/types/support.types'
import { ApiResponse } from '@/types/common.types'

// Rate Limiter Memory Tracker
const RATE_LIMIT_CACHE = new Map<string, number[]>()

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const timestamps = (RATE_LIMIT_CACHE.get(key) || []).filter((ts) => now - ts < windowMs)
  if (timestamps.length >= maxRequests) {
    return false
  }
  timestamps.push(now)
  RATE_LIMIT_CACHE.set(key, timestamps)
  return true
}

function sanitizeText(input: string): string {
  if (!input) return ''
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
}

// ==============================================================================
// TENANT USER ACTIONS
// ==============================================================================

/**
 * Creates a new support conversation (Ticket) by verified tenant user
 */
export const createSupportConversationAction = withTenantAction(
  {
    permission: "support.create",
    entityType: "support"
  },
  async (ctx, input: CreateConversationInput) : Promise<ApiResponse<SupportConversationRecord>> => {
  try {
    const tenant = await requireTenantUser()
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Authentication required' }
    }

    // 1. Rate Limiting: Max 5 tickets per 5 minutes per user
    const rateLimitKey = `ticket_create_${tenant.userId}`
    const isAllowed = checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000)
    if (!isAllowed) {
      return {
        success: false,
        error: "You are submitting tickets too quickly. Please wait a moment before trying again.",
      }
    }

    // 2. Input Validation
    const cleanSubject = sanitizeText(input.subject || '')
    const cleanMessage = sanitizeText(input.initialMessage || '')

    if (cleanSubject.length < 3) {
      return { success: false, error: 'Subject must be at least 3 characters' }
    }
    if (cleanSubject.length > 200) {
      return { success: false, error: 'Subject cannot exceed 200 characters' }
    }
    if (cleanMessage.length < 5) {
      return { success: false, error: 'Message must be at least 5 characters' }
    }
    if (cleanMessage.length > 10000) {
      return { success: false, error: 'Message cannot exceed 10,000 characters' }
    }

    return await SupportService.createConversation(
      tenant.companyId,
      tenant.companyName,
      tenant.companySlug,
      tenant.userId,
      tenant.userEmail,
      tenant.fullName || tenant.userEmail || 'Customer',
      {
        subject: cleanSubject,
        category: input.category || 'general',
        priority: input.priority || 'normal',
        initialMessage: cleanMessage,
        attachments: input.attachments || [],
        contextMetadata: input.contextMetadata || {},
        branchId: tenant.branchId || null,
      }
    )
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create support conversation' }
  }

})

/**
 * Retrieves conversations belonging exclusively to the verified tenant
 */
export const getTenantSupportConversationsAction = withTenantAction(
  {
    permission: "support.view",
    entityType: "support"
  },
  async (ctx, filters: TenantConversationFilters = {}) : Promise<ApiResponse<SupportConversationRecord[]>> => {
  try {
    const tenant = await requireTenantUser()
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Authentication required' }
    }

    return await SupportService.getTenantConversations(tenant.companyId, filters)
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to retrieve conversations' }
  }

})

/**
 * Retrieves conversation details and messages for verified tenant.
 * Guaranteed to exclude platform internal notes.
 */
export const getTenantSupportConversationDetailsAction = withTenantAction(
  {
    permission: "support.view",
    entityType: "support"
  },
  async (ctx, conversationId: string) : Promise<ApiResponse<{ conversation: SupportConversationRecord; messages: SupportMessageRecord[] }>> => {
  try {
    const tenant = await requireTenantUser()
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Authentication required' }
    }

    return await SupportService.getTenantConversationDetails(tenant.companyId, conversationId)
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load conversation details' }
  }

})

/**
 * Sends a message from tenant user into their conversation
 */
export const sendTenantSupportMessageAction = withTenantAction(
  {
    permission: "support.create",
    entityType: "support"
  },
  async (ctx, input: SendMessageInput) : Promise<ApiResponse<SupportMessageRecord>> => {
  try {
    const tenant = await requireTenantUser()
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Authentication required' }
    }

    // Rate limit: max 30 messages per minute
    const rateLimitKey = `msg_tenant_${tenant.userId}`
    const isAllowed = checkRateLimit(rateLimitKey, 30, 60 * 1000)
    if (!isAllowed) {
      return {
        success: false,
        error: "You are sending messages too quickly. Please pause for a few seconds.",
      }
    }

    const cleanBody = sanitizeText(input.body || '')
    if (!cleanBody && (!input.attachments || input.attachments.length === 0)) {
      return { success: false, error: 'Message body or attachment required' }
    }
    if (cleanBody.length > 10000) {
      return { success: false, error: 'Message cannot exceed 10,000 characters' }
    }

    return await SupportService.sendTenantMessage(
      tenant.companyId,
      tenant.userId,
      tenant.userEmail,
      tenant.fullName || tenant.userEmail || 'Customer',
      {
        conversationId: input.conversationId,
        body: cleanBody,
        attachments: input.attachments || [],
        clientMutationId: input.clientMutationId,
      }
    )
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send message' }
  }

})

/**
 * Marks conversation as read by tenant user
 */
export const markConversationReadByTenantAction = withTenantAction(
  {
    permission: "support.create",
    entityType: "support"
  },
  async (ctx, conversationId: string) : Promise<ApiResponse<boolean>> => {
  try {
    const tenant = await requireTenantUser()
    if (!tenant || !tenant.companyId) return { success: false, error: 'Unauthorized' }

    return await SupportService.markAsReadByTenant(tenant.companyId, conversationId)
  } catch {
    return { success: false, error: 'Failed to update read state' }
  }

})

/**
 * Closes conversation by tenant user
 */
export const closeConversationByTenantAction = withTenantAction(
  {
    permission: "support.view",
    entityType: "support"
  },
  async (ctx, conversationId: string) : Promise<ApiResponse<SupportConversationRecord>> => {
  try {
    const tenant = await requireTenantUser()
    if (!tenant || !tenant.companyId) return { success: false, error: 'Unauthorized' }

    return await SupportService.closeConversationByTenant(
      tenant.companyId,
      conversationId,
      tenant.userId,
      tenant.fullName || tenant.userEmail || 'Customer'
    )
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to close conversation' }
  }

})

/**
 * Reopens conversation by tenant user
 */
export const reopenConversationByTenantAction = withTenantAction(
  {
    permission: "support.view",
    entityType: "support"
  },
  async (ctx, conversationId: string,
  reason?: string) : Promise<ApiResponse<SupportConversationRecord>> => {
  try {
    const tenant = await requireTenantUser()
    if (!tenant || !tenant.companyId) return { success: false, error: 'Unauthorized' }

    const cleanReason = sanitizeText(reason || '')
    return await SupportService.reopenConversationByTenant(
      tenant.companyId,
      conversationId,
      tenant.userId,
      tenant.fullName || tenant.userEmail || 'Customer',
      cleanReason
    )
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reopen conversation' }
  }

})

// ==============================================================================
// PLATFORM SUPPORT ACTIONS
// ==============================================================================

/**
 * Retrieves all support conversations for platform agents
 */
export const getPlatformSupportConversationsAction = withPlatformAction(
  { permission: 'support.view' },
  async (_ctx, filters: PlatformConversationFilters = {}): Promise<ApiResponse<SupportConversationRecord[]>> => {
    return await SupportService.getPlatformConversations(filters)
  }
)

/**
 * Retrieves conversation details (with internal notes) for platform support staff
 */
export const getPlatformSupportConversationDetailsAction = withPlatformAction(
  { permission: 'support.view' },
  async (_ctx, conversationId: string): Promise<ApiResponse<{ conversation: SupportConversationRecord; messages: SupportMessageRecord[] }>> => {
    return await SupportService.getPlatformConversationDetails(conversationId)
  }
)

/**
 * Sends a platform support reply or internal note
 */
export const sendPlatformSupportReplyAction = withPlatformAction(
  {
    permission: 'support.reply',
    audit: true,
    actionName: 'support.reply',
    entityType: 'support_ticket',
  },
  async (ctx, input: SendMessageInput): Promise<ApiResponse<SupportMessageRecord>> => {
    const isInternal = Boolean(input.isInternalNote)

    if (isInternal && !hasPlatformPermission(ctx.platformUser, 'support.internal_note') && !hasPlatformPermission(ctx.platformUser, 'support.view')) {
      return { success: false, error: 'Permission denied for internal notes' }
    }

    const cleanBody = sanitizeText(input.body || '')
    if (!cleanBody && (!input.attachments || input.attachments.length === 0)) {
      return { success: false, error: 'Reply body cannot be empty' }
    }

    return await SupportService.sendPlatformReply(
      ctx.platformUser.id,
      ctx.platformUser.email,
      ctx.platformUser.full_name,
      {
        conversationId: input.conversationId,
        body: cleanBody,
        attachments: input.attachments || [],
        isInternalNote: isInternal,
        clientMutationId: input.clientMutationId,
      }
    )
  }
)

/**
 * Assigns conversation to a support agent
 */
export const assignSupportConversationAction = withPlatformAction(
  {
    permission: 'support.assign',
    audit: true,
    actionName: 'support.assign',
    entityType: 'support_ticket',
  },
  async (ctx, conversationId: string, targetAdminId: string | null, targetAdminName: string | null): Promise<ApiResponse<SupportConversationRecord>> => {
    return await SupportService.assignConversation(
      ctx.platformUser.id,
      ctx.platformUser.email,
      ctx.platformUser.full_name,
      conversationId,
      targetAdminId,
      targetAdminName
    )
  }
)

/**
 * Updates conversation status
 */
export const updateSupportConversationStatusAction = withPlatformAction(
  {
    permission: 'support.manage',
    audit: true,
    actionName: 'support.update_status',
    entityType: 'support_ticket',
  },
  async (ctx, conversationId: string, status: SupportStatus, reason?: string): Promise<ApiResponse<SupportConversationRecord>> => {
    const cleanReason = sanitizeText(reason || '')
    return await SupportService.updateConversationStatus(
      ctx.platformUser.id,
      ctx.platformUser.email,
      ctx.platformUser.full_name,
      conversationId,
      status,
      cleanReason
    )
  }
)

/**
 * Updates conversation priority
 */
export const updateSupportConversationPriorityAction = withPlatformAction(
  {
    permission: 'support.manage',
    audit: true,
    actionName: 'support.update_priority',
    entityType: 'support_ticket',
  },
  async (ctx, conversationId: string, priority: SupportPriority): Promise<ApiResponse<SupportConversationRecord>> => {
    return await SupportService.updateConversationPriority(
      ctx.platformUser.id,
      ctx.platformUser.email,
      ctx.platformUser.full_name,
      conversationId,
      priority
    )
  }
)

/**
 * Updates conversation category
 */
export const updateSupportConversationCategoryAction = withPlatformAction(
  {
    permission: 'support.manage',
    audit: true,
    actionName: 'support.update_category',
    entityType: 'support_ticket',
  },
  async (ctx, conversationId: string, category: SupportCategory): Promise<ApiResponse<SupportConversationRecord>> => {
    return await SupportService.updateConversationCategory(
      ctx.platformUser.id,
      ctx.platformUser.email,
      ctx.platformUser.full_name,
      conversationId,
      category
    )
  }
)

/**
 * Marks conversation read by platform staff
 */
export const markConversationReadByPlatformAction = withPlatformAction(
  { permission: 'support.view' },
  async (_ctx, conversationId: string): Promise<ApiResponse<boolean>> => {
    return await SupportService.markAsReadByPlatform(conversationId)
  }
)

/**
 * Retrieves platform support queue overview statistics & SLA metrics
 */
export const getPlatformSupportStatsAction = withPlatformAction(
  { permission: 'support.view' },
  async (ctx): Promise<SupportOverviewStats> => {
    return await SupportService.getPlatformSupportStats(ctx.platformUser.id)
  }
)
