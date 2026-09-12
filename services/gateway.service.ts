// ==============================================================================
// PrintERP SaaS - Unified Gateway & API Integration Core Service
// Provides database persistence, AES-256 encryption, security isolation, logs, & telemetry
// ==============================================================================

import { createAdminClient } from '../lib/supabase/admin.ts'
import type {
  GatewayCategory,
  AnyProviderType,
  GatewayIntegrationRecord,
  SanitizedGatewayRecord,
  GatewayFormData,
  GatewayTestResult,
  SendTestPayload,
  SendTestResult,
  CommunicationLogRecord,
  GatewayTransactionRecord,
  GatewayWebhookRecord,
  GatewayAuditRecord,
  GatewayTelemetrySummary,
} from '../types/gateway.types.ts'
import { encryptSecret, decryptSecret, maskCredential } from '../lib/security/encryption.ts'
import { GatewayRegistry } from '../lib/gateway/gateway.registry.ts'

const isValidUuid = (str?: string | null): boolean => {
  return Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))
}

// Fallback in-memory store for offline/local resilience
class GatewayMemoryStore {
  private static store: Map<string, any> = new Map()

  static get<T>(key: string): T | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const val = window.localStorage.getItem(key)
        if (val) return JSON.parse(val)
      } catch {}
    }
    const mem = this.store.get(key)
    return mem !== undefined ? JSON.parse(JSON.stringify(mem)) : null
  }

  static set<T>(key: string, value: T): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch {}
    }
    this.store.set(key, JSON.parse(JSON.stringify(value)))
  }
}

export class GatewayService {
  /**
   * Sanitizes a database gateway record to safely display in the UI without leaking secrets
   */
  static sanitizeRecord(record: GatewayIntegrationRecord): SanitizedGatewayRecord {
    let hasCredentials = false
    const masked: Record<string, string> = {}

    if (record.encrypted_credentials) {
      hasCredentials = true
      try {
        const decryptedStr = decryptSecret(record.encrypted_credentials)
        if (decryptedStr) {
          const parsed = JSON.parse(decryptedStr)
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string' && v.trim().length > 0) {
              masked[k] = maskCredential(v)
            }
          }
        }
      } catch {
        masked['secret'] = '••••••••'
      }
    }

    return {
      id: record.id,
      tenant_id: record.tenant_id,
      category: record.category,
      provider: record.provider,
      name: record.name,
      is_enabled: record.is_enabled,
      is_default: record.is_default,
      environment: record.environment,
      has_credentials: hasCredentials,
      masked_credentials: masked,
      public_config: record.public_config || {},
      status: record.status,
      last_tested_at: record.last_tested_at,
      last_test_status: record.last_test_status,
      last_test_error: record.last_test_error,
      last_test_latency_ms: record.last_test_latency_ms,
      failure_count: record.failure_count || 0,
      created_at: record.created_at,
      updated_at: record.updated_at,
    }
  }

  /**
   * Decrypts credentials of a gateway record for server-side operations
   */
  static getDecryptedCredentials(record: GatewayIntegrationRecord): Record<string, string> {
    if (!record.encrypted_credentials) return {}
    try {
      const decrypted = decryptSecret(record.encrypted_credentials)
      return JSON.parse(decrypted)
    } catch {
      return {}
    }
  }

  /**
   * Lists gateway integrations for platform owner (tenant_id IS NULL) or specific tenant
   */
  static async listGateways(options: {
    tenantId?: string | null
    category?: GatewayCategory
  } = {}): Promise<SanitizedGatewayRecord[]> {
    const { tenantId = null, category } = options
    const admin = createAdminClient()

    try {
      let query = (admin as any).from('gateway_integrations').select('*')

      if (tenantId === null) {
        query = query.is('tenant_id', null)
      } else if (isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      } else {
        // Handle non-UUID test IDs or offline fallback
        const local = GatewayMemoryStore.get<GatewayIntegrationRecord[]>('printerp_gateway_integrations') || []
        const filtered = local.filter(
          (g) => g.tenant_id === tenantId && (!category || g.category === category)
        )
        return filtered.map((r) => this.sanitizeRecord(r))
      }

      if (category) {
        query = query.eq('category', category)
      }

      query = query.order('created_at', { ascending: true })

      const { data, error } = await query

      if (error) {
        console.warn('[GatewayService] DB list fallback:', error.message)
        const local = GatewayMemoryStore.get<GatewayIntegrationRecord[]>('printerp_gateway_integrations') || []
        const filtered = local.filter(
          (g) => (tenantId === null ? !g.tenant_id : g.tenant_id === tenantId) && (!category || g.category === category)
        )
        return filtered.map((r) => this.sanitizeRecord(r))
      }

      return (data || []).map((r: GatewayIntegrationRecord) => this.sanitizeRecord(r))
    } catch (err: any) {
      console.error('[GatewayService] List gateways error:', err)
      const local = GatewayMemoryStore.get<GatewayIntegrationRecord[]>('printerp_gateway_integrations') || []
      return local.map((r) => this.sanitizeRecord(r))
    }
  }

  /**
   * Gets a single gateway record by ID
   */
  static async getGatewayById(id: string): Promise<GatewayIntegrationRecord | null> {
    const admin = createAdminClient()
    try {
      if (isValidUuid(id)) {
        const { data, error } = await (admin as any)
          .from('gateway_integrations')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (!error && data) return data as GatewayIntegrationRecord
      }

      const local = GatewayMemoryStore.get<GatewayIntegrationRecord[]>('printerp_gateway_integrations') || []
      return local.find((g) => g.id === id) || null
    } catch {
      return null
    }
  }

  /**
   * Saves / Upserts a gateway configuration with AES-256-GCM encrypted credentials
   */
  static async saveGateway(
    formData: GatewayFormData,
    userId?: string
  ): Promise<{ success: boolean; data?: SanitizedGatewayRecord; error?: string }> {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    try {
      let existing: GatewayIntegrationRecord | null = null
      if (formData.id && isValidUuid(formData.id)) {
        existing = await this.getGatewayById(formData.id)
      } else {
        // Look up by provider and tenant_id
        let lookupQuery = (admin as any)
          .from('gateway_integrations')
          .select('*')
          .eq('provider', formData.provider)

        if (formData.tenant_id && isValidUuid(formData.tenant_id)) {
          lookupQuery = lookupQuery.eq('tenant_id', formData.tenant_id)
        } else {
          lookupQuery = lookupQuery.is('tenant_id', null)
        }

        const { data: matched } = await lookupQuery.maybeSingle()
        if (matched) existing = matched as GatewayIntegrationRecord
      }

      // Merge credentials: if new credentials supplied, encrypt them; otherwise retain existing
      let encryptedCredentials = existing?.encrypted_credentials || null

      if (formData.credentials && Object.keys(formData.credentials).length > 0) {
        // Filter out empty or unchanged masked strings like '••••••••'
        const existingCreds = existing ? this.getDecryptedCredentials(existing) : {}
        const mergedCreds: Record<string, string> = { ...existingCreds }

        for (const [key, val] of Object.entries(formData.credentials)) {
          if (val && !val.includes('••••')) {
            mergedCreds[key] = val.trim()
          }
        }

        if (Object.keys(mergedCreds).length > 0) {
          encryptedCredentials = encryptSecret(JSON.stringify(mergedCreds))
        }
      }

      const status =
        formData.is_enabled === false
          ? 'disabled'
          : existing?.status === 'connected'
          ? 'connected'
          : encryptedCredentials
          ? 'configured'
          : 'not_configured'

      const sanitizedTenantId = isValidUuid(formData.tenant_id) ? formData.tenant_id : null
      const sanitizedUserId = isValidUuid(userId) ? userId : null

      const recordPayload = {
        tenant_id: sanitizedTenantId,
        category: formData.category,
        provider: formData.provider,
        name: formData.name,
        is_enabled: formData.is_enabled ?? true,
        is_default: formData.is_default ?? false,
        environment: formData.environment || 'sandbox',
        encrypted_credentials: encryptedCredentials,
        public_config: formData.public_config || {},
        status,
        updated_at: now,
      }

      let savedRecord: GatewayIntegrationRecord

      if (existing) {
        try {
          const { data, error } = await (admin as any)
            .from('gateway_integrations')
            .update(recordPayload)
            .eq('id', existing.id)
            .select()
            .single()

          if (!error && data) {
            savedRecord = data as GatewayIntegrationRecord
          } else {
            throw new Error(error?.message || 'Update failed')
          }
        } catch {
          savedRecord = {
            ...existing,
            ...recordPayload,
          } as GatewayIntegrationRecord
        }
      } else {
        try {
          const { data, error } = await (admin as any)
            .from('gateway_integrations')
            .insert({
              ...recordPayload,
              created_by: sanitizedUserId,
              created_at: now,
            })
            .select()
            .single()

          if (!error && data) {
            savedRecord = data as GatewayIntegrationRecord
          } else {
            throw new Error(error?.message || 'Insert failed')
          }
        } catch {
          savedRecord = {
            id: `gw-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            ...recordPayload,
            created_by: sanitizedUserId,
            created_at: now,
          } as GatewayIntegrationRecord
        }
      }

      // Save to local memory store
      const local = GatewayMemoryStore.get<GatewayIntegrationRecord[]>('printerp_gateway_integrations') || []
      const idx = local.findIndex((g) => g.id === savedRecord.id)
      if (idx >= 0) local[idx] = savedRecord
      else local.push(savedRecord)
      GatewayMemoryStore.set('printerp_gateway_integrations', local)

      // Audit Log
      await this.logAudit({
        tenant_id: savedRecord.tenant_id,
        gateway_id: savedRecord.id,
        action: existing ? 'updated' : 'created',
        details: {
          provider: savedRecord.provider,
          category: savedRecord.category,
          environment: savedRecord.environment,
          status: savedRecord.status,
          credentials_updated: Boolean(formData.credentials && Object.keys(formData.credentials).length > 0),
        },
        performed_by: userId,
      })

      return { success: true, data: this.sanitizeRecord(savedRecord) }
    } catch (err: any) {
      console.error('[GatewayService] Save gateway error:', err)
      return { success: false, error: err?.message || 'Failed to save gateway integration' }
    }
  }

  /**
   * Tests connection against provider API and updates gateway status in DB
   */
  static async testConnection(
    gatewayId: string,
    formDataOverride?: GatewayFormData
  ): Promise<GatewayTestResult> {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    const gateway = await this.getGatewayById(gatewayId)
    if (!gateway && !formDataOverride) {
      return {
        success: false,
        status: 'error',
        latency_ms: 0,
        message: 'Gateway integration not found.',
        error: 'Record missing',
      }
    }

    const category = formDataOverride?.category || gateway!.category
    const provider = formDataOverride?.provider || gateway!.provider
    const environment = formDataOverride?.environment || gateway!.environment
    const publicConfig = { ...(gateway?.public_config || {}), ...(formDataOverride?.public_config || {}) }

    // Resolve credentials
    let credentials = gateway ? this.getDecryptedCredentials(gateway) : {}
    if (formDataOverride?.credentials) {
      for (const [k, v] of Object.entries(formDataOverride.credentials)) {
        if (v && !v.includes('••••')) credentials[k] = v.trim()
      }
    }

    const testRes = await GatewayRegistry.testConnection({
      category,
      provider,
      credentials,
      publicConfig,
      environment,
    })

    // Update Gateway DB Record status and latency
    if (gateway) {
      const updatedStatus = testRes.success ? 'connected' : 'error'
      await (admin as any)
        .from('gateway_integrations')
        .update({
          status: updatedStatus,
          last_tested_at: now,
          last_test_status: testRes.success ? 'passed' : 'failed',
          last_test_error: testRes.error || null,
          last_test_latency_ms: testRes.latency_ms,
          failure_count: testRes.success ? 0 : (gateway.failure_count || 0) + 1,
          updated_at: now,
        })
        .eq('id', gateway.id)

      // Audit Log
      await this.logAudit({
        tenant_id: gateway.tenant_id,
        gateway_id: gateway.id,
        action: 'test_connection',
        details: {
          result: testRes.success ? 'SUCCESS' : 'FAILURE',
          latency_ms: testRes.latency_ms,
          error: testRes.error,
        },
      })
    }

    return testRes
  }

  /**
   * Dispatches a real test message (Email, SMS, WhatsApp, or Telegram)
   */
  static async sendTestMessage(
    payload: SendTestPayload,
    userId?: string
  ): Promise<SendTestResult> {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    let gateway: GatewayIntegrationRecord | null = null
    if (payload.gatewayId) {
      gateway = await this.getGatewayById(payload.gatewayId)
    }

    let credentials: Record<string, string> = {}
    let publicConfig: Record<string, any> = {}
    let provider = payload.provider || gateway?.provider

    if (gateway) {
      credentials = this.getDecryptedCredentials(gateway)
      publicConfig = gateway.public_config || {}
      provider = gateway.provider
    }

    if (!provider) {
      return {
        success: false,
        timestamp: now,
        latency_ms: 0,
        error: 'No active provider resolved for test message.',
      }
    }

    const sendRes = await GatewayRegistry.sendTestMessage(
      {
        category: payload.category,
        provider,
        credentials,
        publicConfig,
      },
      payload
    )

    // Record in Communication Logs table
    try {
      await (admin as any).from('communication_logs').insert({
        company_id: gateway?.tenant_id || null,
        gateway_id: gateway?.id || null,
        channel: payload.category,
        recipient_name: payload.recipientName || 'Test Recipient',
        recipient_destination: payload.recipient,
        provider_used: provider,
        message_content: payload.message,
        status: sendRes.success ? 'sent' : 'failed',
        provider_message_id: sendRes.providerMessageId || null,
        error_message: sendRes.error || null,
        sent_by: userId || null,
        sent_at: sendRes.success ? now : null,
        failed_at: sendRes.success ? null : now,
        created_at: now,
      })
    } catch (logErr) {
      console.warn('[GatewayService] Comm log insertion fallback:', logErr)
    }

    // Audit Log
    await this.logAudit({
      tenant_id: gateway?.tenant_id,
      gateway_id: gateway?.id,
      action: 'test_message_sent',
      details: {
        channel: payload.category,
        provider,
        recipient: payload.recipient,
        success: sendRes.success,
        providerMessageId: sendRes.providerMessageId,
      },
      performed_by: userId,
    })

    return sendRes
  }

  /**
   * Toggles gateway enabled / disabled status
   */
  static async toggleStatus(
    gatewayId: string,
    isEnabled: boolean,
    userId?: string
  ): Promise<{ success: boolean; data?: SanitizedGatewayRecord; error?: string }> {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    try {
      const gateway = await this.getGatewayById(gatewayId)
      if (!gateway) return { success: false, error: 'Gateway not found' }

      const newStatus = isEnabled
        ? gateway.last_test_status === 'passed'
          ? 'connected'
          : 'configured'
        : 'disabled'

      const { data, error } = await (admin as any)
        .from('gateway_integrations')
        .update({
          is_enabled: isEnabled,
          status: newStatus,
          updated_at: now,
        })
        .eq('id', gatewayId)
        .select()
        .single()

      if (error) throw new Error(error.message)

      await this.logAudit({
        tenant_id: gateway.tenant_id,
        gateway_id: gatewayId,
        action: isEnabled ? 'enabled' : 'disabled',
        details: { provider: gateway.provider, status: newStatus },
        performed_by: userId,
      })

      return { success: true, data: this.sanitizeRecord(data as GatewayIntegrationRecord) }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to toggle status' }
    }
  }

  /**
   * Deletes a gateway configuration
   */
  static async deleteGateway(
    gatewayId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const admin = createAdminClient()

    try {
      const gateway = await this.getGatewayById(gatewayId)
      if (!gateway) return { success: false, error: 'Gateway not found' }

      const { error } = await (admin as any).from('gateway_integrations').delete().eq('id', gatewayId)
      if (error) throw new Error(error.message)

      await this.logAudit({
        tenant_id: gateway.tenant_id,
        gateway_id: gatewayId,
        action: 'deleted',
        details: { provider: gateway.provider, category: gateway.category },
        performed_by: userId,
      })

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete gateway' }
    }
  }

  /**
   * Writes a non-sensitive entry to the gateway audit log
   */
  static async logAudit(entry: {
    tenant_id?: string | null
    gateway_id?: string | null
    action: string
    details: Record<string, any>
    performed_by?: string | null
    ip_address?: string | null
  }): Promise<void> {
    const admin = createAdminClient()
    try {
      const sanitizedTenantId = isValidUuid(entry.tenant_id) ? entry.tenant_id : null
      const sanitizedGatewayId = isValidUuid(entry.gateway_id) ? entry.gateway_id : null
      const sanitizedPerformedBy = isValidUuid(entry.performed_by) ? entry.performed_by : null

      await (admin as any).from('gateway_audit_logs').insert({
        tenant_id: sanitizedTenantId,
        gateway_id: sanitizedGatewayId,
        action: entry.action,
        details: entry.details || {},
        performed_by: sanitizedPerformedBy,
        ip_address: entry.ip_address || null,
        created_at: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('[GatewayService] Audit logging fallback:', err)
    }
  }

  /**
   * Fetches paginated communication logs
   */
  static async getCommunicationLogs(filters: {
    tenantId?: string | null
    channel?: string
    status?: string
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{ logs: CommunicationLogRecord[]; total: number }> {
    const admin = createAdminClient()
    const { tenantId = null, channel, status, search, page = 1, pageSize = 20 } = filters

    try {
      let query = (admin as any)
        .from('communication_logs')
        .select('*', { count: 'exact' })

      if (tenantId === null) {
        query = query.is('company_id', null)
      } else if (isValidUuid(tenantId)) {
        query = query.eq('company_id', tenantId)
      } else {
        return { logs: [], total: 0 }
      }

      if (channel && channel !== 'all') query = query.eq('channel', channel)
      if (status && status !== 'all') query = query.eq('status', status)
      if (search) {
        query = query.or(`recipient_destination.ilike.%${search}%,recipient_name.ilike.%${search}%,message_content.ilike.%${search}%`)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query.order('created_at', { ascending: false }).range(from, to)

      const { data, count, error } = await query

      if (error) {
        return { logs: [], total: 0 }
      }

      return { logs: data || [], total: count || 0 }
    } catch {
      return { logs: [], total: 0 }
    }
  }

  /**
   * Fetches paginated payment transactions
   */
  static async getPaymentTransactions(filters: {
    tenantId?: string | null
    provider?: string
    status?: string
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{ transactions: GatewayTransactionRecord[]; total: number }> {
    const admin = createAdminClient()
    const { tenantId = null, provider, status, search, page = 1, pageSize = 20 } = filters

    try {
      let query = (admin as any)
        .from('gateway_transactions')
        .select('*', { count: 'exact' })

      if (tenantId !== undefined) {
        if (tenantId === null) query = query.is('tenant_id', null)
        else if (isValidUuid(tenantId)) query = query.eq('tenant_id', tenantId)
        else return { transactions: [], total: 0 }
      }

      if (provider && provider !== 'all') query = query.eq('provider', provider)
      if (status && status !== 'all') query = query.eq('payment_status', status)
      if (search) {
        query = query.or(`internal_trx_id.ilike.%${search}%,provider_trx_id.ilike.%${search}%,invoice_id.ilike.%${search}%`)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query.order('created_at', { ascending: false }).range(from, to)

      const { data, count, error } = await query
      if (error) return { transactions: [], total: 0 }

      return { transactions: data || [], total: count || 0 }
    } catch {
      return { transactions: [], total: 0 }
    }
  }

  /**
   * Fetches paginated webhook event records
   */
  static async getWebhooks(filters: {
    provider?: string
    status?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{ webhooks: GatewayWebhookRecord[]; total: number }> {
    const admin = createAdminClient()
    const { provider, status, page = 1, pageSize = 20 } = filters

    try {
      let query = (admin as any).from('gateway_webhooks').select('*', { count: 'exact' })

      if (provider && provider !== 'all') query = query.eq('provider', provider)
      if (status && status !== 'all') query = query.eq('status', status)

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query.order('created_at', { ascending: false }).range(from, to)

      const { data, count, error } = await query
      if (error) return { webhooks: [], total: 0 }

      return { webhooks: data || [], total: count || 0 }
    } catch {
      return { webhooks: [], total: 0 }
    }
  }

  /**
   * Fetches security audit logs
   */
  static async getAuditLogs(filters: {
    tenantId?: string | null
    gatewayId?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{ logs: GatewayAuditRecord[]; total: number }> {
    const admin = createAdminClient()
    const { tenantId = null, gatewayId, page = 1, pageSize = 20 } = filters

    try {
      let query = (admin as any).from('gateway_audit_logs').select('*', { count: 'exact' })

      if (tenantId === null) query = query.is('tenant_id', null)
      else if (isValidUuid(tenantId)) query = query.eq('tenant_id', tenantId)
      else return { logs: [], total: 0 }

      if (gatewayId) {
        if (isValidUuid(gatewayId)) query = query.eq('gateway_id', gatewayId)
        else return { logs: [], total: 0 }
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query.order('created_at', { ascending: false }).range(from, to)

      const { data, count, error } = await query
      if (error) return { logs: [], total: 0 }

      return { logs: data || [], total: count || 0 }
    } catch {
      return { logs: [], total: 0 }
    }
  }

  /**
   * Returns high-level dashboard telemetry for Platform Owner
   */
  static async getTelemetrySummary(): Promise<GatewayTelemetrySummary> {
    const gateways = await this.listGateways({ tenantId: null })
    const { total: recentLogsCount } = await this.getCommunicationLogs({ tenantId: null, pageSize: 1 })
    const { transactions, total: txCount } = await this.getPaymentTransactions({ pageSize: 50 })
    const { total: recentWebhooksCount } = await this.getWebhooks({ pageSize: 1 })

    let connected = 0
    let errors = 0
    let latencySum = 0
    let latencyCount = 0
    let live = 0
    let sandbox = 0

    for (const g of gateways) {
      if (g.status === 'connected') connected++
      if (g.status === 'error') errors++
      if (g.environment === 'live') live++
      else sandbox++
      if (g.last_test_latency_ms && g.last_test_latency_ms > 0) {
        latencySum += g.last_test_latency_ms
        latencyCount++
      }
    }

    const txVolume = transactions.reduce((acc, t) => acc + (t.payment_status === 'paid' ? Number(t.amount) : 0), 0)

    return {
      totalConfigured: gateways.filter((g) => g.status !== 'not_configured').length,
      totalConnected: connected,
      totalErrors: errors,
      avgLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0,
      liveCount: live,
      sandboxCount: sandbox,
      recentLogsCount,
      recentTransactionsVolume: txVolume,
      recentWebhooksCount,
    }
  }
}
