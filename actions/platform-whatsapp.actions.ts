'use server'

// ==============================================================================
// PrintERP SaaS - Platform Superadmin WhatsApp Gateway Monitoring Actions
// Authoritative global telemetry and infrastructure control across all tenant sessions.
// ==============================================================================

import { withPlatformAction } from '../lib/actions/action-wrapper.ts'
import { createAdminClient } from '../lib/supabase/admin.ts'
import { openWAClient } from '../lib/integrations/openwa/client.ts'

export interface PlatformWhatsAppOverview {
  gatewayStatus: {
    online: boolean
    baseUrl: string
    latencyMs: number
    activeSessions: number
    totalSessions: number
    version?: string
    error?: string
  }
  tenantSessions: Array<{
    id: string
    tenantId: string
    companyName: string
    companySlug: string
    sessionId: string
    status: string
    phoneNumber?: string | null
    displayName?: string | null
    connectedAt?: string | null
    lastSeenAt?: string | null
    dailySendLimit: number
    todaySendCount: number
  }>
}

/**
 * Server Action: Get Global WhatsApp Gateway Telemetry & Tenant Sessions
 */
export const getPlatformWhatsAppOverviewAction = withPlatformAction(
  { permission: 'system.view' },
  async (_ctx): Promise<{ success: boolean; data: PlatformWhatsAppOverview }> => {
    const start = Date.now()
    let gatewayOnline = false
    let activeSessions = 0
    let totalSessions = 0
    let version: string | undefined
    let gatewayError: string | undefined

    try {
      const stats = await openWAClient.getStatsOverview()
      gatewayOnline = true
      activeSessions = stats.activeSessions ?? 0
      totalSessions = stats.totalSessions ?? 0
      version = stats.version
    } catch (err: any) {
      gatewayError = err?.message || 'Failed to ping OpenWA gateway'
    }

    const latencyMs = Date.now() - start
    const adminClient = createAdminClient()

    // Query all tenant connections with company details
    const { data: connections, error: connErr } = await (adminClient as any)
      .from('tenant_whatsapp_connections')
      .select('*, company:companies(id, name, slug)')
      .order('updated_at', { ascending: false })

    if (connErr) {
      throw new Error(connErr.message)
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const tenantSessions = await Promise.all(
      (connections || []).map(async (conn: any) => {
        // Count today's messages for this tenant
        const { count } = await (adminClient as any)
          .from('whatsapp_messages')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', conn.tenant_id)
          .gte('created_at', todayStart.toISOString())

        return {
          id: conn.id,
          tenantId: conn.tenant_id,
          companyName: conn.company?.name || 'Unknown Company',
          companySlug: conn.company?.slug || 'unknown',
          sessionId: conn.openwa_session_id,
          status: conn.status,
          phoneNumber: conn.phone_number,
          displayName: conn.display_name,
          connectedAt: conn.connected_at,
          lastSeenAt: conn.last_seen_at,
          dailySendLimit: conn.daily_send_limit || 500,
          todaySendCount: count || 0,
        }
      })
    )

    return {
      success: true,
      data: {
        gatewayStatus: {
          online: gatewayOnline,
          baseUrl: process.env.OPENWA_BASE_URL || 'http://localhost:2785/api',
          latencyMs,
          activeSessions,
          totalSessions,
          version,
          error: gatewayError,
        },
        tenantSessions,
      },
    }
  }
)

/**
 * Server Action: Superadmin Force Session Restart
 */
export const platformRestartTenantSessionAction = withPlatformAction(
  {
    permission: 'system.manage',
    audit: true,
    actionName: 'whatsapp.restart_session',
    entityType: 'whatsapp_session',
  },
  async (_ctx, sessionId: string) => {
    await openWAClient.restartSession(sessionId)
    return { message: `Session ${sessionId} restarted successfully.` }
  }
)

/**
 * Server Action: Superadmin Terminate / Delete Session
 */
export const platformTerminateTenantSessionAction = withPlatformAction(
  {
    permission: 'system.manage',
    audit: true,
    actionName: 'whatsapp.terminate_session',
    entityType: 'whatsapp_session',
  },
  async (_ctx, sessionId: string) => {
    await openWAClient.deleteSession(sessionId)

    const adminClient = createAdminClient()
    await (adminClient as any)
      .from('tenant_whatsapp_connections')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
        qr_code_raw: null,
      })
      .eq('openwa_session_id', sessionId)

    return { message: `Session ${sessionId} terminated and logged out.` }
  }
)
