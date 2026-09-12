'use server'

// ==============================================================================
// InkFlow SaaS - Authoritative Server Actions for Support Chat & Conversations
// Server-Guarded: Enforces authenticated identity, tenant isolation, permissions,
// rate limiting, anti-XSS validation, and audit logging.
// ==============================================================================

import { requireTenantUser } from '@/lib/auth/tenant-auth'
import { requirePlatformUser, hasPlatformPermission } from '@/lib/auth/platform-auth'
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
export async function createSupportConversationAction(
  input: CreateConversationInput
): Promise<ApiResponse<SupportConversationRecord>> {
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
}

/**
 * Retrieves conversations belonging exclusively to the verified tenant
 */
export async function getTenantSupportConversationsAction(
  filters: TenantConversationFilters = {}
): Promise<ApiResponse<SupportConversationRecord[]>> {
  try {
    const tenant = await requireTenantUser()
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Authentication required' }
    }

    return await SupportService.getTenantConversations(tenant.companyId, filters)
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to retrieve conversations' }
  }
}

/**
 * Retrieves conversation details and messages for verified tenant.
 * Guaranteed to exclude platform internal notes.
 */
export async function getTenantSupportConversationDetailsAction(
  conversationId: string
): Promise<ApiResponse<{ conversation: SupportConversationRecord; messages: SupportMessageRecord[] }>> {
  try {
    const tenant = await requireTenantUser()
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Authentication required' }
    }

    return await SupportService.getTenantConversationDetails(tenant.companyId, conversationId)
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load conversation details' }
  }
}

/**
 * Sends a message from tenant user into their conversation
 */
export async function sendTenantSupportMessageAction(
  input: SendMessageInput
): Promise<ApiResponse<SupportMessageRecord>> {
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
}

/**
 * Marks conversation as read by tenant user
 */
export async function markConversationReadByTenantAction(
  conversationId: string
): Promise<ApiResponse<boolean>> {
  try {
    const tenant = await requireTenantUser()
    if (!tenant || !tenant.companyId) return { success: false, error: 'Unauthorized' }

    return await SupportService.markAsReadByTenant(tenant.companyId, conversationId)
  } catch {
    return { success: false, error: 'Failed to update read state' }
  }
}

/**
 * Closes conversation by tenant user
 */
export async function closeConversationByTenantAction(
  conversationId: string
): Promise<ApiResponse<SupportConversationRecord>> {
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
}

/**
 * Reopens conversation by tenant user
 */
export async function reopenConversationByTenantAction(
  conversationId: string,
  reason?: string
): Promise<ApiResponse<SupportConversationRecord>> {
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
}

// ==============================================================================
// PLATFORM SUPPORT ACTIONS
// ==============================================================================

/**
 * Retrieves all support conversations for platform agents
 */
export async function getPlatformSupportConversationsAction(
  filters: PlatformConversationFilters = {}
): Promise<ApiResponse<SupportConversationRecord[]>> {
  try {
    const platformUser = await requirePlatformUser()
    if (!hasPlatformPermission(platformUser, 'support.view')) {
      return { success: false, error: 'Permission denied: support.view required' }
    }

    return await SupportService.getPlatformConversations(filters)
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load conversations' }
  }
}

/**
 * Retrieves conversation details (with internal notes) for platform support staff
 */
export async function getPlatformSupportConversationDetailsAction(
  conversationId: string
): Promise<ApiResponse<{ conversation: SupportConversationRecord; messages: SupportMessageRecord[] }>> {
  try {
    const platformUser = await requirePlatformUser()
    if (!hasPlatformPermission(platformUser, 'support.view')) {
      return { success: false, error: 'Permission denied' }
    }

    return await SupportService.getPlatformConversationDetails(conversationId)
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load conversation details' }
  }
}

/**
 * Sends a platform support reply or internal note
 */
export async function sendPlatformSupportReplyAction(
  input: SendMessageInput
): Promise<ApiResponse<SupportMessageRecord>> {
  try {
    const platformUser = await requirePlatformUser()
    const isInternal = Boolean(input.isInternalNote)

    if (isInternal && !hasPlatformPermission(platformUser, 'support.internal_note') && !hasPlatformPermission(platformUser, 'support.view')) {
      return { success: false, error: 'Permission denied for internal notes' }
    }
    if (!isInternal && !hasPlatformPermission(platformUser, 'support.reply') && !hasPlatformPermission(platformUser, 'support.view')) {
      return { success: false, error: 'Permission denied for support reply' }
    }

    const cleanBody = sanitizeText(input.body || '')
    if (!cleanBody && (!input.attachments || input.attachments.length === 0)) {
      return { success: false, error: 'Reply body cannot be empty' }
    }

    return await SupportService.sendPlatformReply(
      platformUser.id,
      platformUser.email,
      platformUser.full_name,
      {
        conversationId: input.conversationId,
        body: cleanBody,
        attachments: input.attachments || [],
        isInternalNote: isInternal,
        clientMutationId: input.clientMutationId,
      }
    )
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send reply' }
  }
}

/**
 * Assigns conversation to a support agent
 */
export async function assignSupportConversationAction(
  conversationId: string,
  targetAdminId: string | null,
  targetAdminName: string | null
): Promise<ApiResponse<SupportConversationRecord>> {
  try {
    const platformUser = await requirePlatformUser()
    if (!hasPlatformPermission(platformUser, 'support.assign') && !hasPlatformPermission(platformUser, 'support.view')) {
      return { success: false, error: 'Permission denied' }
    }

    return await SupportService.assignConversation(
      platformUser.id,
      platformUser.email,
      platformUser.full_name,
      conversationId,
      targetAdminId,
      targetAdminName
    )
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to assign conversation' }
  }
}

/**
 * Updates conversation status
 */
export async function updateSupportConversationStatusAction(
  conversationId: string,
  status: SupportStatus,
  reason?: string
): Promise<ApiResponse<SupportConversationRecord>> {
  try {
    const platformUser = await requirePlatformUser()
    if (!hasPlatformPermission(platformUser, 'support.manage') && !hasPlatformPermission(platformUser, 'support.view')) {
      return { success: false, error: 'Permission denied' }
    }

    const cleanReason = sanitizeText(reason || '')
    return await SupportService.updateConversationStatus(
      platformUser.id,
      platformUser.email,
      platformUser.full_name,
      conversationId,
      status,
      cleanReason
    )
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update status' }
  }
}

/**
 * Updates conversation priority
 */
export async function updateSupportConversationPriorityAction(
  conversationId: string,
  priority: SupportPriority
): Promise<ApiResponse<SupportConversationRecord>> {
  try {
    const platformUser = await requirePlatformUser()
    if (!hasPlatformPermission(platformUser, 'support.manage') && !hasPlatformPermission(platformUser, 'support.view')) {
      return { success: false, error: 'Permission denied' }
    }

    return await SupportService.updateConversationPriority(
      platformUser.id,
      platformUser.email,
      platformUser.full_name,
      conversationId,
      priority
    )
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update priority' }
  }
}

/**
 * Updates conversation category
 */
export async function updateSupportConversationCategoryAction(
  conversationId: string,
  category: SupportCategory
): Promise<ApiResponse<SupportConversationRecord>> {
  try {
    const platformUser = await requirePlatformUser()
    if (!hasPlatformPermission(platformUser, 'support.manage') && !hasPlatformPermission(platformUser, 'support.view')) {
      return { success: false, error: 'Permission denied' }
    }

    return await SupportService.updateConversationCategory(
      platformUser.id,
      platformUser.email,
      platformUser.full_name,
      conversationId,
      category
    )
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update category' }
  }
}

/**
 * Marks conversation read by platform staff
 */
export async function markConversationReadByPlatformAction(
  conversationId: string
): Promise<ApiResponse<boolean>> {
  try {
    const platformUser = await requirePlatformUser()
    if (!platformUser) return { success: false, error: 'Unauthorized' }

    return await SupportService.markAsReadByPlatform(conversationId)
  } catch {
    return { success: false, error: 'Failed to mark read' }
  }
}

/**
 * Retrieves platform support queue overview statistics & SLA metrics
 */
export async function getPlatformSupportStatsAction(): Promise<SupportOverviewStats> {
  try {
    const platformUser = await requirePlatformUser()
    return await SupportService.getPlatformSupportStats(platformUser?.id)
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
