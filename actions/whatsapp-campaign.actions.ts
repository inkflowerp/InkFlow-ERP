'use server'

// ==============================================================================
// PrintERP SaaS - WhatsApp Campaigns & Chat Server Actions
// Supports safe controlled bulk broadcasts, contact management, and live chat replies.
// ==============================================================================

import { createClient } from '../lib/supabase/server.ts'
import { createAdminClient } from '../lib/supabase/admin.ts'
import { getCurrentTenant } from '../lib/auth/tenant-auth.ts'
import { CommunicationRouter } from '../services/communication-router.ts'
import { CommunicationJobQueue } from '../lib/communication/job-queue.ts'
import { normalizeBdPhoneNumber } from '../lib/gateway/phone-utils.ts'
import type {
  WhatsAppContactRecord,
  WhatsAppChatRecord,
  WhatsAppMessageRecord,
} from '../types/communication.types.ts'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

async function resolveTenant(requestedCompanyId?: string, action: 'view' | 'send' | 'manage' = 'view') {
  const tenant = await getCurrentTenant(requestedCompanyId)
  if (!tenant || !tenant.companyId) {
    throw new Error('Unauthorized: Valid tenant session required.')
  }

  if (tenant.companyRole !== 'business_owner' && !tenant.permissions.includes(`whatsapp.${action}`)) {
    throw new Error(`Forbidden: Missing 'whatsapp.${action}' permission.`)
  }

  return tenant
}

/**
 * Server Action: Dispatch Controlled WhatsApp Campaign
 */
export async function dispatchWhatsAppCampaignAction(params: {
  name: string
  messageTemplate: string
  recipientFilter: 'all_customers' | 'active_customers' | 'employees' | 'custom'
  customNumbers?: string[]
  acknowledgeSpamRisk: boolean
  requestedCompanyId?: string
}): Promise<ServerActionResult<{ queuedCount: number; campaignName: string }>> {
  try {
    const tenant = await resolveTenant(params.requestedCompanyId, 'manage')
    const tenantId = tenant.companyId

    if (!params.acknowledgeSpamRisk) {
      return {
        success: false,
        error: 'You must acknowledge the anti-spam agreement before initiating bulk broadcasts.',
      }
    }

    if (!params.messageTemplate || !params.messageTemplate.trim()) {
      return {
        success: false,
        error: 'Campaign message text is required.',
      }
    }

    // 1. Verify WhatsApp connection
    const sessionInfo = await CommunicationRouter.resolveTenantSession(tenantId)
    if (!sessionInfo.isConnected) {
      return {
        success: false,
        error: 'Tenant WhatsApp is not connected. Scan QR code in Settings before launching campaigns.',
      }
    }

    const adminClient = createAdminClient()

    // 2. Resolve recipient phone numbers
    const recipients: Array<{ phone: string; name?: string; customerId?: string; employeeId?: string }> = []

    if (params.recipientFilter === 'all_customers' || params.recipientFilter === 'active_customers') {
      let query = (adminClient as any)
        .from('customers')
        .select('id, name, mobile')
        .eq('company_id', tenantId)
        .not('mobile', 'is', null)
        .limit(300)

      const { data: customers } = await query
      if (customers) {
        for (const c of customers) {
          const { isValid, formatted } = normalizeBdPhoneNumber(c.mobile, false)
          if (isValid && formatted) {
            recipients.push({ phone: formatted, name: c.name, customerId: c.id })
          }
        }
      }
    } else if (params.recipientFilter === 'employees') {
      const { data: employees } = await (adminClient as any)
        .from('employees')
        .select('id, name, mobile')
        .eq('company_id', tenantId)
        .not('mobile', 'is', null)
        .limit(200)

      if (employees) {
        for (const e of employees) {
          const { isValid, formatted } = normalizeBdPhoneNumber(e.mobile, false)
          if (isValid && formatted) {
            recipients.push({ phone: formatted, name: e.name, employeeId: e.id })
          }
        }
      }
    } else if (params.recipientFilter === 'custom' && params.customNumbers) {
      for (const num of params.customNumbers) {
        const { isValid, formatted } = normalizeBdPhoneNumber(num, false)
        if (isValid && formatted) {
          recipients.push({ phone: formatted })
        }
      }
    }

    if (recipients.length === 0) {
      return {
        success: false,
        error: 'No valid recipient phone numbers found for the selected filter.',
      }
    }

    // 3. Filter out opted-out contacts
    const phoneList = recipients.map((r) => r.phone)
    const { data: optedOut } = await (adminClient as any)
      .from('whatsapp_contacts')
      .select('phone_number')
      .eq('tenant_id', tenantId)
      .eq('is_opted_in', false)
      .in('phone_number', phoneList)

    const optedOutSet = new Set((optedOut || []).map((o: any) => o.phone_number))
    const eligibleRecipients = recipients.filter((r) => !optedOutSet.has(r.phone))

    if (eligibleRecipients.length === 0) {
      return {
        success: false,
        error: 'All selected recipients have opted out of WhatsApp broadcasts.',
      }
    }

    // 4. Enqueue messages into CommunicationJobQueue with rate spacing
    let queuedCount = 0
    const campaignId = `camp_${Date.now()}`

    for (let i = 0; i < eligibleRecipients.length; i++) {
      const recipient = eligibleRecipients[i]
      const interpolatedMessage = params.messageTemplate.replace(/{{name}}/g, recipient.name || 'Valued Customer')

      await CommunicationJobQueue.enqueue({
        tenantId,
        eventType: 'whatsapp_campaign',
        channel: 'whatsapp',
        recipientPhone: recipient.phone,
        recipientCustomerId: recipient.customerId,
        templateKey: campaignId,
        payload: {
          campaignName: params.name,
          campaignId,
          message: interpolatedMessage,
          recipientName: recipient.name,
        },
        idempotencyKey: `${campaignId}:${recipient.phone}`,
      })

      queuedCount++
    }

    return {
      success: true,
      data: {
        queuedCount,
        campaignName: params.name,
      },
      message: `Enqueued ${queuedCount} WhatsApp campaign messages for safe background dispatch.`,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to dispatch WhatsApp campaign.',
    }
  }
}

/**
 * Server Action: Fetch WhatsApp Contacts for Tenant
 */
export async function getWhatsAppContactsAction(options?: {
  requestedCompanyId?: string
  search?: string
  limit?: number
}): Promise<ServerActionResult<WhatsAppContactRecord[]>> {
  try {
    const tenant = await resolveTenant(options?.requestedCompanyId, 'view')
    const supabase = await createClient()

    let query = (supabase.from('whatsapp_contacts' as any) as any)
      .select('*')
      .eq('tenant_id', tenant.companyId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(options?.limit || 50)

    if (options?.search) {
      query = query.or(`display_name.ilike.%${options.search}%,phone_number.ilike.%${options.search}%`)
    }

    const { data, error } = await query
    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: (data || []) as WhatsAppContactRecord[] }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch WhatsApp contacts.' }
  }
}

/**
 * Server Action: Fetch WhatsApp Chats (Conversation Threads)
 */
export async function getWhatsAppChatsAction(options?: {
  requestedCompanyId?: string
  limit?: number
}): Promise<ServerActionResult<Array<WhatsAppChatRecord & { contact?: WhatsAppContactRecord }>>> {
  try {
    const tenant = await resolveTenant(options?.requestedCompanyId, 'view')
    const adminClient = createAdminClient()

    const { data: chats, error } = await (adminClient as any)
      .from('whatsapp_chats')
      .select('*, contact:whatsapp_contacts(*)')
      .eq('tenant_id', tenant.companyId)
      .order('last_message_timestamp', { ascending: false, nullsFirst: false })
      .limit(options?.limit || 50)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: chats || [] }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch WhatsApp conversations.' }
  }
}

/**
 * Server Action: Fetch Chat Message History
 */
export async function getWhatsAppChatMessagesAction(
  chatId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<WhatsAppMessageRecord[]>> {
  try {
    const tenant = await resolveTenant(requestedCompanyId, 'view')
    const adminClient = createAdminClient()

    // Clear unread count for this chat
    await (adminClient as any)
      .from('whatsapp_chats')
      .update({ unread_count: 0 })
      .eq('id', chatId)
      .eq('tenant_id', tenant.companyId)

    const { data: messages, error } = await (adminClient as any)
      .from('whatsapp_messages')
      .select('*')
      .eq('tenant_id', tenant.companyId)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: messages || [] }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch chat messages.' }
  }
}

/**
 * Server Action: Send Live WhatsApp Reply in Chat Thread
 */
export async function sendWhatsAppReplyAction(params: {
  chatId: string
  messageText: string
  requestedCompanyId?: string
}): Promise<ServerActionResult<WhatsAppMessageRecord>> {
  try {
    const tenant = await resolveTenant(params.requestedCompanyId, 'send')
    const tenantId = tenant.companyId

    if (!params.messageText || !params.messageText.trim()) {
      return { success: false, error: 'Reply message cannot be empty.' }
    }

    const adminClient = createAdminClient()

    // 1. Resolve chat and contact
    const { data: chat, error: chatErr } = await (adminClient as any)
      .from('whatsapp_chats')
      .select('*, contact:whatsapp_contacts(*)')
      .eq('id', params.chatId)
      .eq('tenant_id', tenantId)
      .single()

    if (chatErr || !chat) {
      return { success: false, error: 'Chat conversation not found.' }
    }

    const recipientPhone = chat.contact?.phone_number
    if (!recipientPhone) {
      return { success: false, error: 'Chat recipient phone number missing.' }
    }

    // 2. Dispatch via CommunicationRouter
    const sendResult = await CommunicationRouter.sendTenantWhatsApp({
      companyId: tenantId,
      recipientPhone,
      messageText: params.messageText,
      sentByUserId: tenant.userId,
    })

    if (!sendResult.success) {
      return {
        success: false,
        error: sendResult.error || 'Failed to dispatch WhatsApp reply.',
      }
    }

    // 3. Update chat preview
    await (adminClient as any)
      .from('whatsapp_chats')
      .update({
        last_message_preview: params.messageText.slice(0, 150),
        last_message_timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.chatId)

    // 4. Return created message
    const { data: newMsg } = await (adminClient as any)
      .from('whatsapp_messages')
      .select('*')
      .eq('openwa_message_id', sendResult.messageId)
      .maybeSingle()

    return {
      success: true,
      data: newMsg as WhatsAppMessageRecord,
      message: 'Reply sent successfully.',
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to send WhatsApp reply.',
    }
  }
}
