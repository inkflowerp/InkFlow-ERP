// ==============================================================================
// PrintERP SaaS - OpenWA Multi-Tenant Webhook Receiver
// Route: /api/webhooks/openwa
// Handles HMAC-SHA256 signature verification, idempotency deduplication,
// real-time session lifecycle tracking, inbound messaging, and delivery acks.
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server.js'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOpenWAWebhookSignature } from '@/lib/integrations/openwa/client'
import { normalizeBdPhoneNumber } from '@/lib/gateway/phone-utils'
import type { WhatsAppConnectionStatus, WhatsAppMessageStatus } from '@/types/communication.types'

// High-speed in-memory deduplication cache with 10-minute sliding window
const PROCESSED_WEBHOOK_KEYS = new Map<string, number>()
const DEDUP_TTL_MS = 10 * 60 * 1000

function isDuplicateDelivery(key?: string | null): boolean {
  if (!key) return false
  const now = Date.now()

  // Evict expired entries every ~100 items
  if (PROCESSED_WEBHOOK_KEYS.size > 2000) {
    for (const [k, ts] of PROCESSED_WEBHOOK_KEYS.entries()) {
      if (now - ts > DEDUP_TTL_MS) {
        PROCESSED_WEBHOOK_KEYS.delete(k)
      }
    }
  }

  if (PROCESSED_WEBHOOK_KEYS.has(key)) {
    return true
  }

  PROCESSED_WEBHOOK_KEYS.set(key, now)
  return false
}

/**
 * GET: Webhook endpoint handshake & health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'PrintERP OpenWA Webhook Endpoint',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
}

/**
 * POST: Ingest and process OpenWA webhook events
 */
export async function POST(request: NextRequest) {
  const start = Date.now()

  try {
    // 1. Read raw text body for HMAC verification
    const rawBody = await request.text()
    if (!rawBody || !rawBody.trim()) {
      return NextResponse.json({ error: 'Empty payload received' }, { status: 400 })
    }

    // 2. Validate HMAC-SHA256 Signature
    const signature =
      request.headers.get('x-openwa-signature') ||
      request.headers.get('X-OpenWA-Signature')
    const configuredSecret = process.env.OPENWA_WEBHOOK_SECRET

    if (configuredSecret) {
      const isValidSig = verifyOpenWAWebhookSignature(rawBody, signature, configuredSecret)
      if (!isValidSig) {
        console.warn('[OpenWA Webhook] Unauthorized signature rejection. Provided:', signature)
        return NextResponse.json(
          { error: 'Invalid HMAC signature' },
          { status: 401 }
        )
      }
    }

    // 3. Parse JSON Body
    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const {
      event,
      timestamp,
      sessionId,
      idempotencyKey,
      deliveryId,
      data,
    } = payload

    if (!event || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required webhook fields: event and sessionId' },
        { status: 400 }
      )
    }

    // 4. Idempotency Deduplication Check
    const dedupKey =
      idempotencyKey ||
      deliveryId ||
      request.headers.get('x-openwa-idempotency-key') ||
      `${sessionId}:${event}:${data?.id || timestamp || ''}`

    if (isDuplicateDelivery(dedupKey)) {
      return NextResponse.json({ status: 'duplicate_ignored', dedupKey }, { status: 200 })
    }

    const adminClient = createAdminClient()

    // 5. Resolve Tenant Connection Record from openwa_session_id
    const { data: conn, error: connErr } = await (adminClient as any)
      .from('tenant_whatsapp_connections')
      .select('id, tenant_id, phone_number, status, openwa_session_id')
      .eq('openwa_session_id', sessionId)
      .maybeSingle()

    if (connErr || !conn) {
      console.warn(`[OpenWA Webhook] Unrecognized session '${sessionId}' for event '${event}'`)
      // Return 200 so OpenWA does not endlessly re-deliver for orphaned sessions
      return NextResponse.json({ status: 'session_not_registered', sessionId }, { status: 200 })
    }

    const tenantId = conn.tenant_id

    // 6. Dispatch Event Handling
    switch (event) {
      // --------------------------------------------------------------------------
      // EVENT: session.status
      // --------------------------------------------------------------------------
      case 'session.status': {
        const liveStatus = data?.status
        const mappedStatus: WhatsAppConnectionStatus =
          liveStatus === 'ready'
            ? 'connected'
            : liveStatus === 'qr_ready'
            ? 'qr_ready'
            : liveStatus === 'disconnected'
            ? 'disconnected'
            : liveStatus === 'authenticating'
            ? 'connecting'
            : 'pending'

        const updates: Record<string, any> = {
          status: mappedStatus,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        if (data?.phone) {
          updates.phone_number = data.phone
        }
        if (data?.pushName) {
          updates.display_name = data.pushName
        }

        if (mappedStatus === 'connected') {
          updates.connected_at = new Date().toISOString()
          updates.qr_code_raw = null
        } else if (mappedStatus === 'disconnected') {
          updates.disconnected_at = new Date().toISOString()
          updates.qr_code_raw = null
        }

        await (adminClient as any)
          .from('tenant_whatsapp_connections')
          .update(updates)
          .eq('id', conn.id)

        // In-app alert on significant transition
        if (mappedStatus === 'connected' && conn.status !== 'connected') {
          await createTenantNotification(adminClient, {
            company_id: tenantId,
            type: 'production_ready',
            title: 'WhatsApp Connected',
            title_bn: 'হোয়াটসঅ্যাপ সংযুক্ত হয়েছে',
            message: `Tenant WhatsApp gateway is now active (${data?.phone || 'Online'}).`,
            message_bn: 'আপনার ব্যবসা হোয়াটসঅ্যাপ গেটওয়ে সফলভাবে সংযুক্ত হয়েছে।',
            action_url: `/settings/whatsapp`,
          })
        }
        break
      }

      // --------------------------------------------------------------------------
      // EVENT: session.disconnected
      // --------------------------------------------------------------------------
      case 'session.disconnected': {
        await (adminClient as any)
          .from('tenant_whatsapp_connections')
          .update({
            status: 'disconnected',
            disconnected_at: new Date().toISOString(),
            qr_code_raw: null,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', conn.id)

        await createTenantNotification(adminClient, {
          company_id: tenantId,
          type: 'production_ready',
          title: 'WhatsApp Disconnected',
          title_bn: 'হোয়াটসঅ্যাপ সংযোগ বিচ্ছিন্ন হয়েছে',
          message: 'Tenant WhatsApp gateway disconnected. Please scan QR to reconnect.',
          message_bn: 'হোয়াটসঅ্যাপ সংযোগ বিচ্ছিন্ন হয়েছে। পুনরায় স্ক্যান করুন।',
          action_url: `/settings/whatsapp`,
        })
        break
      }

      // --------------------------------------------------------------------------
      // EVENT: message.received
      // --------------------------------------------------------------------------
      case 'message.received': {
        // Ignore self-dispatched messages
        if (data?.fromMe) {
          return NextResponse.json({ status: 'ignored_from_me' }, { status: 200 })
        }

        const rawFrom = data?.from || ''
        const rawDigits = rawFrom.split('@')[0]
        const { formatted: cleanPhone, isValid } = normalizeBdPhoneNumber(rawDigits, false)
        const recipientPhone = cleanPhone || rawDigits

        const senderName = data?.sender?.pushname || data?.sender?.name || data?.notifyName || recipientPhone
        const messageBody = data?.body || (data?.hasMedia ? '[Media Attachment]' : '')
        const messageType = data?.type === 'chat' ? 'text' : data?.type || 'text'

        // 6.a Resolve or create whatsapp_contacts
        let contactId: string | null = null
        const { data: existingContact } = await (adminClient as any)
          .from('whatsapp_contacts')
          .select('id, contact_type, customer_id, employee_id')
          .eq('tenant_id', tenantId)
          .eq('phone_number', recipientPhone)
          .maybeSingle()

        if (existingContact) {
          contactId = existingContact.id
          await (adminClient as any)
            .from('whatsapp_contacts')
            .update({
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', contactId)
        } else {
          // Check if matches an existing customer
          const { data: matchedCustomer } = await (adminClient as any)
            .from('customers')
            .select('id, name')
            .eq('company_id', tenantId)
            .ilike('phone', `%${recipientPhone.slice(-10)}%`)
            .maybeSingle()

          // Check if matches an employee
          const { data: matchedEmployee } = await (adminClient as any)
            .from('employees')
            .select('id, full_name')
            .eq('company_id', tenantId)
            .ilike('phone', `%${recipientPhone.slice(-10)}%`)
            .maybeSingle()

          const contactType = matchedCustomer ? 'customer' : matchedEmployee ? 'employee' : 'customer'
          const displayName = matchedCustomer?.name || matchedEmployee?.full_name || senderName

          const { data: newContact } = await (adminClient as any)
            .from('whatsapp_contacts')
            .insert({
              tenant_id: tenantId,
              phone_number: recipientPhone,
              display_name: displayName,
              customer_id: matchedCustomer?.id || null,
              employee_id: matchedEmployee?.id || null,
              contact_type: contactType,
              last_message_at: new Date().toISOString(),
            })
            .select('id')
            .single()

          contactId = newContact?.id || null
        }

        // 6.b Resolve or create whatsapp_chats
        let chatId: string | null = null
        const { data: existingChat } = await (adminClient as any)
          .from('whatsapp_chats')
          .select('id, unread_count')
          .eq('tenant_id', tenantId)
          .eq('chat_id', rawFrom)
          .maybeSingle()

        if (existingChat) {
          chatId = existingChat.id
          await (adminClient as any)
            .from('whatsapp_chats')
            .update({
              unread_count: (existingChat.unread_count || 0) + 1,
              last_message_body: messageBody.slice(0, 150),
              last_message_at: new Date().toISOString(),
              name: senderName || 'Customer',
              updated_at: new Date().toISOString(),
            })
            .eq('id', chatId)
        } else {
          const { data: newChat } = await (adminClient as any)
            .from('whatsapp_chats')
            .insert({
              tenant_id: tenantId,
              connection_id: conn.id,
              chat_id: rawFrom,
              contact_id: contactId,
              chat_type: rawFrom.includes('@g.us') ? 'group' : 'individual',
              name: senderName || 'Customer',
              unread_count: 1,
              last_message_body: messageBody.slice(0, 150),
              last_message_at: new Date().toISOString(),
            })
            .select('id')
            .single()

          chatId = newChat?.id || null
        }

        // 6.c Insert into whatsapp_messages
        if (chatId) {
          const { data: insertedMsg } = await (adminClient as any)
            .from('whatsapp_messages')
            .insert({
              tenant_id: tenantId,
              connection_id: conn.id,
              chat_id: chatId,
              contact_id: contactId,
              direction: 'incoming',
              provider_message_id: data?.id,
              message_type: messageType,
              body: data?.body || null,
              media_url: data?.media?.url || null,
              media_mime_type: data?.media?.mimetype || null,
              media_filename: data?.media?.filename || null,
              status: 'delivered',
              delivered_at: new Date().toISOString(),
            })
            .select('id')
            .single()

          if (insertedMsg?.id) {
            await (adminClient as any)
              .from('whatsapp_chats')
              .update({ last_message_id: insertedMsg.id })
              .eq('id', chatId)
          }
        }

        // 6.d Trigger In-App Notification for staff
        await createTenantNotification(adminClient, {
          company_id: tenantId,
          type: 'customer_approval_needed',
          title: `WhatsApp: ${senderName}`,
          title_bn: `হোয়াটসঅ্যাপ বার্তা: ${senderName}`,
          message: messageBody.slice(0, 120),
          message_bn: messageBody.slice(0, 120),
          action_url: `/communications/inbox?chat=${chatId}`,
        })
        break
      }

      // --------------------------------------------------------------------------
      // EVENT: message.ack
      // --------------------------------------------------------------------------
      case 'message.ack': {
        const messageId = data?.id
        const ackCode = data?.ack // 1 = sent, 2 = received/delivered, 3 = read, 4 = played

        if (messageId && ackCode) {
          const statusMap: Record<number, WhatsAppMessageStatus> = {
            1: 'sent',
            2: 'delivered',
            3: 'read',
            4: 'read',
          }
          const newStatus = statusMap[ackCode]

          if (newStatus) {
            const updates: Record<string, any> = {
              status: newStatus,
            }
            if (newStatus === 'sent') updates.sent_at = new Date().toISOString()
            if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString()
            if (newStatus === 'read') updates.read_at = new Date().toISOString()

            await (adminClient as any)
              .from('whatsapp_messages')
              .update(updates)
              .eq('provider_message_id', messageId)
              .eq('tenant_id', tenantId)
          }
        }
        break
      }

      default: {
        console.log(`[OpenWA Webhook] Unhandled event type '${event}' for session '${sessionId}'`)
      }
    }

    return NextResponse.json({
      success: true,
      event,
      sessionId,
      latencyMs: Date.now() - start,
    })
  } catch (err: any) {
    console.error('[OpenWA Webhook Router] Unhandled error:', err)
    return NextResponse.json(
      { error: err?.message || 'Internal webhook ingestion failure' },
      { status: 500 }
    )
  }
}

/**
 * Helper: Insert in-app notification without crashing the webhook handler
 */
async function createTenantNotification(
  adminClient: any,
  notification: {
    company_id: string
    user_id?: string | null
    type: string
    title: string
    title_bn?: string
    message: string
    message_bn?: string
    action_url?: string
  }
) {
  try {
    await adminClient.from('in_app_notifications').insert({
      company_id: notification.company_id,
      user_id: notification.user_id || null,
      type: notification.type,
      title: notification.title,
      title_bn: notification.title_bn || notification.title,
      message: notification.message,
      message_bn: notification.message_bn || notification.message,
      action_url: notification.action_url || null,
      is_read: false,
    })
  } catch (err: any) {
    console.warn('[OpenWA Webhook] In-app notification creation skipped:', err.message)
  }
}
