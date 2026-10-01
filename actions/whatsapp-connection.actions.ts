'use server'

// ==============================================================================
// PrintERP SaaS - Tenant WhatsApp Connection Server Actions
// Authoritative session lifecycle orchestration for OpenWA Multi-Tenant Gateway
// ==============================================================================

import { createClient } from '../lib/supabase/server.ts'
import { createAdminClient } from '../lib/supabase/admin.ts'
import { getCurrentTenant } from '../lib/auth/tenant-auth.ts'
import { getCurrentPlatformUser } from '../lib/auth/platform-auth.ts'
import { openWAClient, OpenWAError } from '../lib/integrations/openwa/client.ts'
import { OpenWAAdapter } from '../lib/whatsapp/adapters/openwa.adapter.ts'
import { normalizeBdPhoneNumber } from '../lib/gateway/phone-utils.ts'
import type {
  TenantWhatsAppConnectionRecord,
  WhatsAppConnectionStatus,
} from '../types/communication.types.ts'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface WhatsAppConnectionDetails {
  id?: string
  tenantId: string
  sessionId: string
  status: WhatsAppConnectionStatus
  phoneNumber?: string | null
  displayName?: string | null
  qrCode?: string | null
  connectedAt?: string | null
  lastSeenAt?: string | null
  dailySendLimit: number
  sendDelaySeconds: number
  webhookStatus?: string | null
  lastError?: string | null
}

/**
 * Internal Helper: Authorize caller for tenant WhatsApp operations
 */
async function resolveAuthorizedTenant(
  requestedCompanyId?: string,
  requiredPermission: 'view' | 'send' | 'manage' = 'view'
) {
  // 1. Try tenant authentication
  const tenant = await getCurrentTenant(requestedCompanyId)
  if (tenant && tenant.companyId) {
    // Business owners have all permissions
    if (tenant.companyRole === 'business_owner') {
      return { companyId: tenant.companyId, userId: tenant.userId, isOwner: true }
    }

    const hasPerm = tenant.permissions.includes(`whatsapp.${requiredPermission}`)
    if (hasPerm) {
      return { companyId: tenant.companyId, userId: tenant.userId, isOwner: false }
    }

    throw new Error(`Forbidden: Missing 'whatsapp.${requiredPermission}' permission.`)
  }

  // 2. Check if platform admin is acting on behalf of tenant
  const platformUser = await getCurrentPlatformUser()
  if (platformUser && requestedCompanyId) {
    return { companyId: requestedCompanyId, userId: platformUser.id, isPlatformAdmin: true }
  }

  throw new Error('Unauthorized: Valid tenant session or platform admin privilege required.')
}

/**
 * Server Action: Initiate WhatsApp QR Connection
 * Creates or wakes up the tenant's isolated OpenWA session, registers webhooks, and returns the QR code.
 */
export async function initiateWhatsAppConnectionAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<{ sessionId: string; status: WhatsAppConnectionStatus; qrCode?: string }>> {
  try {
    const auth = await resolveAuthorizedTenant(requestedCompanyId, 'manage')
    const tenantId = auth.companyId
    const sessionId = `tenant_${tenantId.replace(/-/g, '')}`

    const adminClient = createAdminClient()

    // 1. Get or create tenant connection record
    const { data: existingConn } = await (adminClient as any)
      .from('tenant_whatsapp_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!existingConn) {
      await (adminClient as any).from('tenant_whatsapp_connections').insert({
        tenant_id: tenantId,
        openwa_session_id: sessionId,
        provider: 'openwa',
        status: 'pending',
        engine: 'whatsapp-web.js',
      })
    }

    // 2. Verify OpenWA Gateway configuration
    const creds = openWAClient.validateCredentials()
    if (!creds.valid) {
      return {
        success: false,
        error: creds.error || 'OpenWA Gateway configuration is missing on the server.',
      }
    }

    // 3. Check or Create session on OpenWA
    let sessionStatus = 'initializing'
    try {
      const liveSession = await openWAClient.getSession(sessionId)
      sessionStatus = liveSession.status

      if (liveSession.status === 'ready') {
        // Already authenticated
        await (adminClient as any)
          .from('tenant_whatsapp_connections')
          .update({
            status: 'connected',
            phone_number: liveSession.phone,
            display_name: liveSession.pushName,
            connected_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            qr_code_raw: null,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId)

        return {
          success: true,
          data: {
            sessionId,
            status: 'connected',
          },
          message: 'WhatsApp is already connected and active.',
        }
      }

      // If disconnected or stopped, trigger start
      if (liveSession.status === 'disconnected' || liveSession.status === 'created') {
        await openWAClient.startSession(sessionId)
      }
    } catch (err: any) {
      if (err instanceof OpenWAError && err.statusCode === 404) {
        // Create new session
        await openWAClient.createSession(sessionId, {
          sessionName: `Tenant ${tenantId.slice(0, 8)}`,
        })
      } else {
        throw err
      }
    }

    // 4. Ensure Webhook is registered for incoming messages and lifecycle events
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.printerp.com'
    const webhookUrl = `${appUrl.replace(/\/+$/, '')}/api/webhooks/openwa`
    const webhookSecret = openWAClient.getWebhookSecret()

    try {
      await openWAClient.registerWebhook(sessionId, webhookUrl, webhookSecret, [
        'message.received',
        'message.ack',
        'session.status',
        'session.disconnected',
      ])

      await (adminClient as any)
        .from('tenant_whatsapp_connections')
        .update({
          webhook_status: 'registered',
          webhook_secret: webhookSecret,
        })
        .eq('tenant_id', tenantId)
    } catch (whErr: any) {
      console.warn('[initiateWhatsAppConnectionAction] Webhook registration warning:', whErr.message)
    }

    // 5. Fetch QR code
    let qrCode: string | undefined = undefined
    try {
      const qrRes = await openWAClient.getQrCode(sessionId)
      qrCode = qrRes.qrCode
    } catch (qrErr: any) {
      console.log('[initiateWhatsAppConnectionAction] QR code not ready yet:', qrErr.message)
    }

    const currentStatus: WhatsAppConnectionStatus = qrCode ? 'qr_ready' : 'connecting'

    // 6. Update database record
    await (adminClient as any)
      .from('tenant_whatsapp_connections')
      .update({
        status: currentStatus,
        qr_code_raw: qrCode || null,
        qr_code_updated_at: qrCode ? new Date().toISOString() : null,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)

    return {
      success: true,
      data: {
        sessionId,
        status: currentStatus,
        qrCode,
      },
    }
  } catch (err: any) {
    console.error('[initiateWhatsAppConnectionAction] Error:', err)
    return {
      success: false,
      error: err?.message || 'Failed to initiate WhatsApp connection.',
    }
  }
}

/**
 * Server Action: Get Tenant WhatsApp Connection Status & Details
 */
export async function getWhatsAppConnectionStatusAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<WhatsAppConnectionDetails>> {
  try {
    const auth = await resolveAuthorizedTenant(requestedCompanyId, 'view')
    const tenantId = auth.companyId

    const supabase = await createClient()

    const { data: conn, error } = await (supabase as any)
      .from('tenant_whatsapp_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error || !conn) {
      return {
        success: true,
        data: {
          tenantId,
          sessionId: `tenant_${tenantId.replace(/-/g, '')}`,
          status: 'disconnected',
          dailySendLimit: 500,
          sendDelaySeconds: 3,
        },
      }
    }

    const record = conn as TenantWhatsAppConnectionRecord
    const sessionId = record.openwa_session_id

    // Check live state with OpenWA gateway if session exists and not permanently disabled
    if (record.status !== 'disabled') {
      try {
        const liveSession = await openWAClient.getSession(sessionId)

        if (liveSession.status === 'ready' && record.status !== 'connected') {
          const adminClient = createAdminClient()
          await (adminClient as any)
            .from('tenant_whatsapp_connections')
            .update({
              status: 'connected',
              phone_number: liveSession.phone,
              display_name: liveSession.pushName,
              connected_at: new Date().toISOString(),
              qr_code_raw: null,
              last_seen_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id)

          record.status = 'connected'
          record.phone_number = liveSession.phone
          record.display_name = liveSession.pushName
          record.qr_code_raw = null
        } else if (liveSession.status === 'qr_ready') {
          // If in QR state, check if QR needs refreshing
          const now = Date.now()
          const lastQrTime = record.qr_code_updated_at ? new Date(record.qr_code_updated_at).getTime() : 0
          if (!record.qr_code_raw || now - lastQrTime > 25000) {
            try {
              const qrRes = await openWAClient.getQrCode(sessionId)
              if (qrRes.qrCode) {
                const adminClient = createAdminClient()
                await (adminClient as any)
                  .from('tenant_whatsapp_connections')
                  .update({
                    status: 'qr_ready',
                    qr_code_raw: qrRes.qrCode,
                    qr_code_updated_at: new Date().toISOString(),
                    last_seen_at: new Date().toISOString(),
                  })
                  .eq('id', record.id)

                record.qr_code_raw = qrRes.qrCode
                record.status = 'qr_ready'
              }
            } catch {}
          }
        } else if (liveSession.status === 'disconnected' && record.status === 'connected') {
          const adminClient = createAdminClient()
          await (adminClient as any)
            .from('tenant_whatsapp_connections')
            .update({
              status: 'disconnected',
              disconnected_at: new Date().toISOString(),
              qr_code_raw: null,
              last_seen_at: new Date().toISOString(),
            })
            .eq('id', record.id)

          record.status = 'disconnected'
        }
      } catch (liveErr: any) {
        // Gateway might be restarting or session pending
        console.warn('[getWhatsAppConnectionStatusAction] Live status sync warning:', liveErr.message)
      }
    }

    return {
      success: true,
      data: {
        id: record.id,
        tenantId: record.tenant_id,
        sessionId: record.openwa_session_id,
        status: record.status,
        phoneNumber: record.phone_number,
        displayName: record.display_name,
        qrCode: record.qr_code_raw,
        connectedAt: record.connected_at,
        lastSeenAt: record.last_seen_at,
        dailySendLimit: record.daily_send_limit,
        sendDelaySeconds: record.send_delay_seconds,
        webhookStatus: record.webhook_status,
        lastError: record.last_error,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to retrieve WhatsApp connection status.',
    }
  }
}

/**
 * Server Action: Disconnect Tenant WhatsApp Session
 */
export async function disconnectWhatsAppAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<{ status: WhatsAppConnectionStatus }>> {
  try {
    const auth = await resolveAuthorizedTenant(requestedCompanyId, 'manage')
    const tenantId = auth.companyId

    const adminClient = createAdminClient()

    const { data: conn } = await (adminClient as any)
      .from('tenant_whatsapp_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!conn) {
      return { success: true, data: { status: 'disconnected' }, message: 'No active connection found.' }
    }

    const sessionId = conn.openwa_session_id

    // Call OpenWA gateway to logout and stop session
    try {
      await openWAClient.logoutSession(sessionId)
    } catch (logoutErr: any) {
      console.warn('[disconnectWhatsAppAction] Gateway logout warning:', logoutErr.message)
      try {
        await openWAClient.stopSession(sessionId)
      } catch {}
    }

    // Update database record
    await (adminClient as any)
      .from('tenant_whatsapp_connections')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
        qr_code_raw: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conn.id)

    return {
      success: true,
      data: { status: 'disconnected' },
      message: 'WhatsApp session disconnected successfully.',
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to disconnect WhatsApp connection.',
    }
  }
}

/**
 * Server Action: Dispatch Real WhatsApp Test Message
 */
export async function sendWhatsAppTestMessageAction(payload: {
  phone: string
  message: string
  requestedCompanyId?: string
}): Promise<ServerActionResult<{ messageId?: string; recipient: string; latencyMs: number }>> {
  try {
    const auth = await resolveAuthorizedTenant(payload.requestedCompanyId, 'send')
    const tenantId = auth.companyId

    if (!payload.phone || !payload.message) {
      return {
        success: false,
        error: 'Recipient phone number and test message text are required.',
      }
    }

    // 1. Validate & normalize Bangladesh phone number
    const { isValid, formatted, error: phoneErr } = normalizeBdPhoneNumber(payload.phone, false)
    if (!isValid || !formatted) {
      return {
        success: false,
        error: phoneErr || 'Invalid Bangladeshi mobile number (must be 01XXXXXXXXX).',
      }
    }

    const adminClient = createAdminClient()

    // 2. Fetch tenant connection record
    const { data: conn } = await (adminClient as any)
      .from('tenant_whatsapp_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!conn || conn.status !== 'connected') {
      return {
        success: false,
        error: 'WhatsApp is not connected for this tenant. Please scan QR code in settings first.',
      }
    }

    const adapter = new OpenWAAdapter()
    const sendResult = await adapter.sendTextMessage(
      {
        to: formatted,
        text: payload.message,
      },
      conn.openwa_session_id
    )

    if (!sendResult.success) {
      return {
        success: false,
        error: sendResult.error || 'WhatsApp message dispatch failed at gateway.',
      }
    }

    // 3. Log sent message in communication_logs
    try {
      await (adminClient as any).from('communication_logs').insert({
        company_id: tenantId,
        channel: 'whatsapp',
        recipient_name: 'Test Recipient',
        recipient_destination: formatted,
        provider_used: 'openwa',
        message_content: payload.message,
        status: 'sent',
      })
    } catch {}

    return {
      success: true,
      data: {
        messageId: sendResult.messageId,
        recipient: formatted,
        latencyMs: sendResult.latency_ms,
      },
      message: `Test WhatsApp message sent successfully to ${formatted}.`,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to dispatch WhatsApp test message.',
    }
  }
}

/**
 * Server Action: Update Tenant WhatsApp Configuration & Send Rules
 */
export async function updateWhatsAppSettingsAction(settings: {
  dailySendLimit?: number
  sendDelaySeconds?: number
  requestedCompanyId?: string
}): Promise<ServerActionResult<void>> {
  try {
    const auth = await resolveAuthorizedTenant(settings.requestedCompanyId, 'manage')
    const tenantId = auth.companyId

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (settings.dailySendLimit !== undefined) {
      if (settings.dailySendLimit < 10 || settings.dailySendLimit > 5000) {
        return { success: false, error: 'Daily send limit must be between 10 and 5,000.' }
      }
      updates.daily_send_limit = settings.dailySendLimit
    }

    if (settings.sendDelaySeconds !== undefined) {
      if (settings.sendDelaySeconds < 1 || settings.sendDelaySeconds > 60) {
        return { success: false, error: 'Send delay must be between 1 and 60 seconds.' }
      }
      updates.send_delay_seconds = settings.sendDelaySeconds
    }

    const adminClient = createAdminClient()
    const { error } = await (adminClient as any)
      .from('tenant_whatsapp_connections')
      .update(updates)
      .eq('tenant_id', tenantId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, message: 'WhatsApp settings updated successfully.' }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to update WhatsApp settings.',
    }
  }
}
